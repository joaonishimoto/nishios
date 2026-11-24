import { addMonths, format, parseISO } from "date-fns";
import { toISO } from "./dates";

/**
 * Como um patrimônio (veículo, imóvel) foi adquirido e quanto falta pagar.
 * É compartilhado entre os módulos de veículos e de imóveis.
 *
 * A parcela não é guardada aqui: ela é uma recorrência de Finanças (com `times` e
 * `first`), ligada por `recurrenceId`. Assim ela entra sozinha na previsão do mês,
 * no calendário e nos avisos, e um único lugar diz quanto e quando se paga.
 */
export type AcquisitionMode = "cash" | "financing" | "consortium";

export const ACQUISITION_MODES: { value: AcquisitionMode; label: string; hint: string }[] = [
  { value: "cash", label: "À vista", hint: "Já é todo seu" },
  { value: "financing", label: "Financiamento", hint: "Parcelas com juros num banco" },
  { value: "consortium", label: "Consórcio", hint: "Parcelas até ser contemplado e quitar" },
];

export interface Acquisition {
  mode: AcquisitionMode;
  /** Data da compra ou do contrato, yyyy-MM-dd; vazio quando não se sabe. */
  date: string;
  /** Preço pago à vista, ou o valor do bem financiado ou da carta de crédito. */
  price: number;
  /** Entrada (financiamento) ou lance (consórcio). */
  downPayment?: number;
  /** Banco do financiamento ou administradora do consórcio. */
  lender?: string;
  /** Recorrência de Finanças com as parcelas. */
  recurrenceId?: string;
  /**
   * Saldo devedor informado pelo banco (o valor para quitar hoje), que já desconta os
   * juros futuros. Sem ele, o que falta é a soma das parcelas que faltam.
   */
  payoff?: { date: string; amount: number };
  /** Consórcio: já foi contemplado (recebeu a carta de crédito). */
  contemplated?: boolean;
  contemplatedOn?: string;
  notes?: string;
}

export const modeLabel = (mode: AcquisitionMode) => ACQUISITION_MODES.find((m) => m.value === mode)?.label ?? mode;

/** O mínimo de uma recorrência de Finanças que o cálculo das parcelas usa. */
export interface InstallmentPlan {
  amount: number;
  /** Primeira parcela, yyyy-MM-dd. */
  first: string;
  /** Quantas parcelas ao todo. */
  times?: number;
  /** A cada quantos meses (1 = todo mês). */
  every: number;
  /** Valor diferente em algum mês (yyyy-MM). */
  months?: Record<string, { amount?: number; done?: boolean }>;
}

export interface InstallmentStatus {
  total: number;
  /** Parcelas com vencimento até hoje. */
  paid: number;
  left: number;
  paidAmount: number;
  /** Soma das parcelas que faltam, ao valor de hoje. */
  leftAmount: number;
  /** Próximo vencimento, yyyy-MM-dd; vazio quando acabou. */
  next: string;
  /** Último vencimento, yyyy-MM-dd. */
  last: string;
  /** 0 a 1. */
  progress: number;
}

/** Datas de vencimento de cada parcela, da primeira à última. */
export function installmentDates(plan: InstallmentPlan): string[] {
  if (!plan.times || !plan.first) return [];
  const first = parseISO(plan.first);
  return Array.from({ length: plan.times }, (_, i) => toISO(addMonths(first, i * plan.every)));
}

/** Quantas parcelas já venceram, quanto foi pago e quanto falta. */
export function installmentStatus(plan: InstallmentPlan, now: Date): InstallmentStatus | null {
  const dates = installmentDates(plan);
  if (!dates.length) return null;
  const todayISO = toISO(now);
  const valueAt = (d: string) => plan.months?.[d.slice(0, 7)]?.amount ?? plan.amount;
  let paid = 0;
  let paidAmount = 0;
  let leftAmount = 0;
  for (const d of dates) {
    if (d <= todayISO) {
      paid++;
      paidAmount += valueAt(d);
    } else leftAmount += valueAt(d);
  }
  return {
    total: dates.length,
    paid,
    left: dates.length - paid,
    paidAmount,
    leftAmount,
    next: dates.find((d) => d > todayISO) ?? "",
    last: dates[dates.length - 1],
    progress: paid / dates.length,
  };
}

export interface DebtSummary {
  /** Quanto falta pagar: o saldo informado, se houver, ou a soma das parcelas que faltam. */
  owed: number;
  /** O saldo veio do banco (não é só a soma das parcelas). */
  informed: boolean;
  /** Entrada + parcelas pagas. */
  invested: number;
}

export function debtSummary(acq: Acquisition | undefined, status: InstallmentStatus | null): DebtSummary {
  if (!acq || acq.mode === "cash") return { owed: 0, informed: false, invested: acq?.price ?? 0 };
  const invested = (acq.downPayment ?? 0) + (status?.paidAmount ?? 0);
  if (acq.payoff) return { owed: acq.payoff.amount, informed: true, invested };
  return { owed: status?.leftAmount ?? 0, informed: false, invested };
}

/** "mar/2031" */
export const monthYear = (iso: string) => (iso ? format(parseISO(iso), "MM/yyyy") : "");
