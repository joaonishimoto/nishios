/** Entrada (salário, aluguel que recebe) ou saída (aluguel que paga, assinaturas). */
export type Flow = "in" | "out";

/** O que aconteceu com uma recorrência em um mês (yyyy-MM). */
export interface MonthMark {
  /** Confirmou que entrou ou saiu. Sem confirmar, conta o valor previsto. */
  done?: boolean;
  /** Valor que veio diferente só naquele mês. */
  amount?: number;
}

/**
 * Algo que você tem certeza que entra ou sai, todo mês ou a cada tantos meses.
 * O resto dos gastos não é controlado de propósito.
 */
export interface Recurrence {
  id: string;
  kind: Flow;
  name: string;
  icon: string;
  category: string;
  /** Valor em reais. */
  amount: number;
  /** Valor que varia de um mês para outro (luz, gás): o número é uma estimativa. */
  approx?: boolean;
  /** A cada quantos meses: 1 = todo mês, 12 = uma vez por ano. */
  every: number;
  /** Primeira vez, em yyyy-MM-dd. Em dia corrido, o dia do mês sai daqui; em dia útil, só o mês. */
  first: string;
  /** Dia útil do mês (5 = quinto dia útil). Ausente = dia corrido, o dia de `first`. */
  businessDay?: number;
  /** Quantas vezes ao todo (parcelamento). Ausente = sem fim. */
  times?: number;
  /** A saída é um aporte para este investimento. */
  investmentId?: string;
  /** Custo de um bem (seguro do carro, plano do celular). */
  assetId?: string;
  /** Prestação, aluguel ou custo de um imóvel, e qual deles. */
  propertyId?: string;
  propertyFlow?: "prestacao" | "aluguel" | "condominio" | "iptu" | "seguro";
  /** Por mês (yyyy-MM): confirmado e valor ajustado. */
  months?: Record<string, MonthMark>;
  notes: string;
}

export type RecurrenceDraft = Omit<Recurrence, "id" | "months">;

export type InvestmentType = "reserva" | "renda-fixa" | "acoes" | "fundos" | "cripto" | "previdencia" | "outro";

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: "reserva", label: "Reserva de emergência" },
  { value: "renda-fixa", label: "Renda fixa" },
  { value: "acoes", label: "Ações" },
  { value: "fundos", label: "Fundos" },
  { value: "cripto", label: "Cripto" },
  { value: "previdencia", label: "Previdência" },
  { value: "outro", label: "Outro" },
];

export interface BalancePoint {
  /** yyyy-MM-dd */
  date: string;
  balance: number;
}

/** Um lugar onde o dinheiro fica guardado. O saldo é atualizado à mão. */
export interface Investment {
  id: string;
  name: string;
  icon: string;
  type: InvestmentType;
  /** Banco ou corretora. */
  institution: string;
  /** Saldos informados, do mais antigo ao mais recente. O último é o saldo atual. */
  history: BalancePoint[];
  notes: string;
}

export type InvestmentDraft = Omit<Investment, "id" | "history"> & { balance: number };

export const IN_CATEGORIES = ["Salário", "Renda extra", "Aluguel recebido", "Benefícios", "Outros"];

export const OUT_CATEGORIES = [
  "Moradia",
  "Contas da casa",
  "Assinaturas",
  "Saúde",
  "Transporte",
  "Educação",
  "Pets",
  "Parcelamentos",
  "Impostos",
  "Investimentos",
  "Outros",
];

export const EVERY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Todo mês" },
  { value: 2, label: "A cada 2 meses" },
  { value: 3, label: "A cada 3 meses" },
  { value: 6, label: "A cada 6 meses" },
  { value: 12, label: "Uma vez por ano" },
];

export const FINANCE_ICONS = [
  "💼", "💰", "🏦", "💳", "🏠", "🏢", "💡", "🚿",
  "🔥", "🌐", "📱", "📺", "🎵", "🏋️", "🥋", "🩺",
  "💊", "🚗", "⛽", "🛡️", "🎓", "📚", "🐱", "🧾",
  "📈", "🪙", "🐷", "🎁", "✈️", "🛒", "🧰", "📦",
];
