import { add, differenceInCalendarDays, parseISO, startOfWeek, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Goal, Habit } from "./types";

/** Segunda a domingo, como índices de Date.getDay(). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Os sete dias da semana atual, começando na segunda. */
export function currentWeek(now: Date = today()): Date[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => add(monday, { days: i }));
}

export function isScheduled(habit: Habit, date: Date): boolean {
  return habit.weekdays.includes(date.getDay());
}

export function isDone(habit: Habit, date: Date): boolean {
  return habit.log.includes(toISO(date));
}

/**
 * Sequência atual: quantos dias previstos seguidos foram cumpridos.
 * Hoje ainda em aberto não quebra a sequência.
 */
export function streak(habit: Habit, now: Date = today()): number {
  const done = new Set(habit.log);
  let count = 0;
  for (let i = 0; i < 400; i++) {
    const day = sub(now, { days: i });
    if (!isScheduled(habit, day)) continue;
    if (done.has(toISO(day))) count++;
    else if (i > 0) break;
  }
  return count;
}

export function scheduleLabel(weekdays: number[]): string {
  const set = new Set(weekdays);
  if (set.size === 7) return "Todos os dias";
  if (set.size === 5 && !set.has(0) && !set.has(6)) return "Dias úteis";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Fins de semana";
  return WEEK_ORDER.filter((d) => set.has(d))
    .map((d) => WEEKDAY_SHORT[d].toLowerCase())
    .join(", ");
}

export function goalProgress(goal: Goal): number {
  return goal.target > 0 ? Math.min(1, Math.max(0, goal.current / goal.target)) : 0;
}

export function goalDone(goal: Goal): boolean {
  return goal.target > 0 && goal.current >= goal.target;
}

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** "19 de 24 livros" ou "R$ 18.500 de R$ 30.000". */
export function goalAmountLabel(goal: Goal): string {
  if (goal.unit.trim().toLowerCase() === "reais") {
    return `${money.format(goal.current)} de ${money.format(goal.target)}`;
  }
  return `${number.format(goal.current)} de ${number.format(goal.target)} ${goal.unit}`.trim();
}

export function deadlineLabel(goal: Goal, now: Date = today()): string | null {
  if (!goal.deadline) return null;
  const days = differenceInCalendarDays(parseISO(goal.deadline), now);
  if (goalDone(goal)) return null;
  if (days < 0) return "Prazo vencido";
  if (days === 0) return "Termina hoje";
  if (days === 1) return "Falta 1 dia";
  if (days < 60) return `Faltam ${days} dias`;
  return `Faltam ${Math.round(days / 30.44)} meses`;
}
