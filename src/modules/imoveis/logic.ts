import { addMonths, differenceInCalendarMonths, getDaysInMonth, parseISO, setDate } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Financing, Property, Situation } from "./types";
import { BILLS, SITUATIONS } from "./types";

export const situationLabel = (s: Situation) => SITUATIONS.find((x) => x.value === s)?.label ?? s;

/** É meu (entra no patrimônio). */
export const isOwned = (p: Property) => p.situation !== "aluguel" && p.situation !== "vendido";
/** Eu recebo aluguel dele. */
export const receivesRent = (p: Property) => p.situation === "renda";
/** Eu pago aluguel dele. */
export const paysRent = (p: Property) => p.situation === "aluguel";
/** As contas de consumo (água, luz, gás, internet) são minhas: moro nele ou ele está vazio. */
export const paysBills = (s: Situation) => s === "mora" || s === "aluguel" || s === "vazio";

/** Valor patrimonial de hoje: a última avaliação ou, sem nenhuma, o preço de compra. */
export function currentValue(p: Property): number {
  const last = [...p.values].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return last?.value ?? p.purchasePrice ?? 0;
}

export function lastValueDate(p: Property): string {
  return [...p.values].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.date ?? "";
}

/** O dia do vencimento naquele mês, sem passar do último dia (dia 31 em fevereiro vira 28). */
function dueIn(month: Date, day: number): Date {
  return setDate(month, Math.min(Math.max(1, day), getDaysInMonth(month)));
}

/** Parcelas pagas até `on`: as informadas mais um vencimento por mês desde então. */
export function paidUntil(f: Financing, on: Date = today()): number {
  if (!f.total) return 0;
  const from = parseISO(f.paidAsOf || toISO(on));
  let count = 0;
  // Conta cada vencimento depois da data informada e até hoje.
  const months = differenceInCalendarMonths(on, from);
  for (let i = 0; i <= months; i++) {
    const due = dueIn(addMonths(from, i), f.dueDay);
    if (due > from && due <= on) count++;
  }
  return Math.min(f.total, Math.max(0, f.paid) + count);
}

export function remaining(f: Financing, on: Date = today()): number {
  return Math.max(0, f.total - paidUntil(f, on));
}

/** Próximo vencimento a partir de amanhã, ou nada quando acabou. */
export function nextDue(f: Financing, on: Date = today()): Date | null {
  if (remaining(f, on) === 0) return null;
  const thisMonth = dueIn(on, f.dueDay);
  return thisMonth > on ? thisMonth : dueIn(addMonths(on, 1), f.dueDay);
}

/** Quando a última parcela vence. */
export function lastDue(f: Financing, on: Date = today()): Date | null {
  const next = nextDue(f, on);
  if (!next) return null;
  return dueIn(addMonths(next, remaining(f, on) - 1), f.dueDay);
}

export interface Debt {
  value: number;
  /** De onde veio o número, em uma frase. */
  source: string;
  /** "extrato" é o número do banco; "estimado" é conta do app. */
  kind: "extrato" | "estimado";
}

/**
 * Saldo devedor. O do extrato vale mais; sem ele, estima:
 * - SAC com valor financiado: a amortização é fixa, então é o financiado vezes a fração que falta;
 * - Price com juros: o valor presente das parcelas que faltam;
 * - sem isso, a soma das parcelas que faltam (passa do saldo real, porque inclui os juros).
 */
export function debt(f: Financing, on: Date = today()): Debt {
  const left = remaining(f, on);
  if (left === 0) return { value: 0, source: "Financiamento quitado.", kind: "estimado" };
  if (f.balance !== undefined && f.balance > 0 && f.balanceAsOf) {
    return { value: f.balance, source: `Do extrato de ${f.balanceAsOf.split("-").reverse().join("/")}.`, kind: "extrato" };
  }
  if (f.system === "sac" && f.financed && f.total) {
    return { value: (f.financed * left) / f.total, source: "Estimado pelo SAC: o valor financiado vezes a parte que falta.", kind: "estimado" };
  }
  const i = f.rate ? Math.pow(1 + f.rate / 100, 1 / 12) - 1 : 0;
  if (f.system === "price" && i > 0) {
    return { value: (f.installment * (1 - Math.pow(1 + i, -left))) / i, source: "Estimado pela tabela Price com os juros informados.", kind: "estimado" };
  }
  return {
    value: f.installment * left,
    source: "Soma das parcelas que faltam. O saldo real é menor, porque tira os juros: informe o do extrato.",
    kind: "estimado",
  };
}

export interface MonthLine {
  label: string;
  amount: number;
}

export interface Month {
  ins: MonthLine[];
  /** Custos do imóvel: aluguel, prestação, condomínio, IPTU, seguro. */
  outs: MonthLine[];
  /** Contas de consumo pela média: água, luz, gás, internet. */
  bills: MonthLine[];
  net: number;
}

/** O que o imóvel põe e tira do bolso num mês normal. IPTU e seguro entram divididos por 12. */
export function month(p: Property, on: Date = today()): Month {
  const ins: MonthLine[] = [];
  const outs: MonthLine[] = [];
  const bills: MonthLine[] = [];
  if (p.situation === "vendido") return { ins, outs, bills, net: 0 };
  const lease = p.lease;
  if (lease && lease.rent > 0 && receivesRent(p)) {
    ins.push({ label: "Aluguel recebido", amount: lease.rent });
    if (lease.fee) outs.push({ label: `Imobiliária (${String(lease.fee).replace(".", ",")}%)`, amount: (lease.rent * lease.fee) / 100 });
  }
  if (lease && lease.rent > 0 && paysRent(p)) outs.push({ label: "Aluguel", amount: lease.rent });
  if (p.financing && isOwned(p) && remaining(p.financing, on) > 0) outs.push({ label: "Prestação", amount: p.financing.installment });
  const c = p.costs;
  if (c.condo) outs.push({ label: "Condomínio", amount: c.condo });
  if (c.iptu) outs.push({ label: "IPTU (por mês)", amount: c.iptu / 12 });
  if (c.insurance) outs.push({ label: "Seguro (por mês)", amount: c.insurance / 12 });
  if (c.other) outs.push({ label: "Outros custos", amount: c.other });
  if (paysBills(p.situation)) for (const b of BILLS) if (c[b.key]) bills.push({ label: b.label, amount: c[b.key] });
  const sum = (l: MonthLine[]) => l.reduce((n, x) => n + x.amount, 0);
  return { ins, outs, bills, net: sum(ins) - sum(outs) - sum(bills) };
}

export interface Wealth {
  value: number;
  debt: number;
  /** Valor menos o que ainda devo: a parte que já é minha de verdade. */
  equity: number;
}

export function wealth(p: Property, on: Date = today()): Wealth {
  if (!isOwned(p)) return { value: 0, debt: 0, equity: 0 };
  const value = currentValue(p);
  const owe = p.financing ? debt(p.financing, on).value : 0;
  return { value, debt: owe, equity: value - owe };
}

/** Aluguel de um ano sobre o valor do imóvel, em %. */
export function rentYield(p: Property): number | null {
  const v = currentValue(p);
  if (!receivesRent(p) || !p.lease?.rent || !v) return null;
  return ((p.lease.rent * 12) / v) * 100;
}

/** Quanto o imóvel valorizou desde a compra, em reais e em %. */
export function appreciation(p: Property): { amount: number; pct: number } | null {
  if (!p.purchasePrice || p.values.length === 0) return null;
  const amount = currentValue(p) - p.purchasePrice;
  return { amount, pct: (amount / p.purchasePrice) * 100 };
}

export function totals(list: Property[], on: Date = today()) {
  const owned = list.filter(isOwned);
  const w = owned.map((p) => wealth(p, on));
  const months = list.map((p) => month(p, on));
  return {
    owned: owned.length,
    value: w.reduce((n, x) => n + x.value, 0),
    debt: w.reduce((n, x) => n + x.debt, 0),
    equity: w.reduce((n, x) => n + x.equity, 0),
    rentIn: months.reduce((n, m) => n + m.ins.reduce((s, l) => s + l.amount, 0), 0),
    net: months.reduce((n, m) => n + m.net, 0),
  };
}

export function emptyCosts() {
  return { condo: 0, iptu: 0, insurance: 0, other: 0, water: 0, power: 0, gas: 0, internet: 0 };
}
