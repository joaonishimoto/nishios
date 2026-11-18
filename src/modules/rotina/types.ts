import type { MeasureId } from "@/modules/corpo/types";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  /** Dias da semana em que o hábito vale: 0 = domingo ... 6 = sábado. */
  weekdays: number[];
  /** Dias em que foi feito, em yyyy-MM-dd. */
  log: string[];
  /**
   * Ligação com os treinos: o hábito fica feito sozinho nos dias em que houver
   * treino registrado. `modalityId` vazio = qualquer modalidade.
   */
  link?: { kind: "treinos"; modalityId: string };
  /** Dias marcados pela ligação, calculados na hora (não são salvos). */
  autoDates?: string[];
}

export type HabitDraft = Omit<Habit, "id" | "log" | "autoDates">;

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
}

export type GoalDraft = Omit<Goal, "id">;

export const ROUTINE_ICONS = [
  "💧", "📖", "🏋️", "🧘", "🗣️", "🌙", "🏃", "🥗",
  "💊", "✍️", "🎸", "🧹", "💰", "📚", "🎯", "🏆",
  "✈️", "🏠", "💻", "🧠", "❤️", "🥋", "☀️", "📵",
];
