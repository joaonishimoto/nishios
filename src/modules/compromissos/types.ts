export type IntervalUnit = "days" | "weeks" | "months" | "years";

export interface Commitment {
  id: string;
  name: string;
  /** Emoji que identifica o compromisso na lista. */
  icon: string;
  category: string;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  /** Quantos dias antes do vencimento ele passa a aparecer como "próximo". */
  warnDays: number;
  notes: string;
  /** Bem a que o compromisso se refere (a revisão é do carro, a limpeza é do ar-condicionado). */
  assetId?: string;
  /** Datas em que foi feito, no formato yyyy-MM-dd, da mais recente para a mais antiga. */
  history: string[];
}

export type CommitmentDraft = Omit<Commitment, "id" | "history"> & { lastDone: string };

export type Status = "overdue" | "soon" | "ok" | "never";

export const CATEGORIES = ["Saúde", "Cuidados pessoais", "Casa", "Carro", "Documentos", "Outros"];

export const ICONS = [
  "💈", "🦷", "🩸", "🩺", "👓", "💊", "🧴", "🪥",
  "🚗", "🛞", "🏠", "🚰", "❄️", "🔥", "🧯", "🧹",
  "📄", "🪪", "💳", "🛂", "📱", "💻", "🌱", "📌",
];
