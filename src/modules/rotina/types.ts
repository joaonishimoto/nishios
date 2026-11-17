export interface Habit {
  id: string;
  name: string;
  icon: string;
  /** Dias da semana em que o hábito vale: 0 = domingo ... 6 = sábado. */
  weekdays: number[];
  /** Dias em que foi feito, em yyyy-MM-dd. */
  log: string[];
}

export type HabitDraft = Omit<Habit, "id" | "log">;

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
}

export type GoalDraft = Omit<Goal, "id">;

export const ROUTINE_ICONS = [
  "💧", "📖", "🏋️", "🧘", "🗣️", "🌙", "🏃", "🥗",
  "💊", "✍️", "🎸", "🧹", "💰", "📚", "🎯", "🏆",
  "✈️", "🏠", "💻", "🧠", "❤️", "🥋", "☀️", "📵",
];
