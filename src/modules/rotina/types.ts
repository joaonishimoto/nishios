import type { MeasureId } from "@/modules/corpo/types";

export type HabitPeriod = "manha" | "tarde" | "noite";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  /**
   * "fazer" (padrão): conta quando você faz.
   * "evitar": mau hábito. Cada dia sem ele é uma vitória; o `log` guarda os dias em que escapou.
   */
  type?: "fazer" | "evitar";
  /** Dias da semana em que o hábito vale: 0 = domingo ... 6 = sábado. */
  weekdays: number[];
  /** Quando existe, vale em qualquer dia e o alvo é fazer `times` vezes na semana. */
  perWeek?: number;
  /** Hábito de quantidade: só fica feito quando chega no alvo do dia (8 copos, 30 páginas). */
  amount?: { target: number; unit: string };
  /** Quanto foi feito em cada dia, para hábitos de quantidade. */
  counts?: Record<string, number>;
  /** Parte do dia, para organizar a lista de hoje. */
  period?: HabitPeriod;
  /** Por que esse hábito importa. Aparece no detalhe. */
  why?: string;
  /** Pausado: sai da rotina sem perder o histórico. */
  paused?: boolean;
  /** yyyy-MM-dd. Um mau hábito conta os dias limpos a partir daqui. */
  createdAt?: string;
  /** Dias em que foi feito (ou, num mau hábito, em que escapou), em yyyy-MM-dd. */
  log: string[];
  /**
   * Ligação com os treinos: o hábito fica feito sozinho nos dias em que houver
   * treino registrado. `modalityId` vazio = qualquer modalidade.
   */
  link?: { kind: "treinos"; modalityId: string };
  /** Dias marcados pela ligação, calculados na hora (não são salvos). */
  autoDates?: string[];
}

export type HabitDraft = Omit<Habit, "id" | "log" | "autoDates" | "counts" | "createdAt">;

export type TrainingMetric = "sessions" | "distance" | "hours" | "rounds";

/**
 * De onde vem o número de uma meta ligada. Metas de contagem somam o que
 * aconteceu desde `since`; metas de corpo usam a última medição.
 */
export type GoalLink =
  | { kind: "treinos"; modalityId: string; metric: TrainingMetric; since: string }
  | { kind: "habito"; habitId: string; since: string }
  | { kind: "tarefas"; list: string; since: string }
  | { kind: "peso" }
  | { kind: "gordura" }
  | { kind: "medida"; measure: MeasureId }
  /** Uma skill: materiais concluídos do plano de estudo ou o nível em que ela está. */
  | { kind: "skill"; skillId: string; metric: SkillMetric }
  /** Quantas skills já estão em "Aprendi". */
  | { kind: "skills" }
  /** O saldo atual de um investimento de Finanças (a reserva de emergência). */
  | { kind: "investimento"; investmentId: string }
  /** A soma de todos os investimentos. */
  | { kind: "investimentos" };

export type SkillMetric = "materiais" | "nivel";

export interface Goal {
  id: string;
  name: string;
  icon: string;
  /** Unidade do número: "livros", "km", "reais"... */
  unit: string;
  target: number;
  current: number;
  /** Prazo em yyyy-MM-dd; vazio quando não tem. */
  deadline: string;
  notes: string;
  /** De onde a meta parte. Sem isso parte do zero. Maior que o alvo = meta de baixar (peso, cintura). */
  start?: number;
  /** Quando existe, `current` é calculado a partir de outro módulo. */
  link?: GoalLink;
  /** Meta feita de etapas: o número é quantas foram concluídas. */
  steps?: GoalStep[];
  /** Cada vez que o número muda à mão, para o gráfico e o ritmo. */
  history?: { date: string; value: number }[];
  /** yyyy-MM-dd. Base para saber se a meta está no ritmo do prazo. */
  createdAt?: string;
}

export interface GoalStep {
  id: string;
  text: string;
  done: boolean;
}

export type GoalDraft = Omit<Goal, "id">;

export const ROUTINE_ICONS = [
  "💧", "📖", "🏋️", "🧘", "🗣️", "🌙", "🏃", "🥗",
  "💊", "✍️", "🎸", "🧹", "💰", "📚", "🎯", "🏆",
  "✈️", "🏠", "💻", "🧠", "❤️", "🥋", "☀️", "📵",
];
