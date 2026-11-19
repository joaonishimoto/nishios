import { add, differenceInCalendarDays, parseISO, startOfWeek, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Goal, Habit, HabitPeriod } from "./types";

/** Segunda a domingo, como índices de Date.getDay(). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Os sete dias da semana atual, começando na segunda. */
export function currentWeek(now: Date = today()): Date[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => add(monday, { days: i }));
}

export const isAvoid = (habit: Habit) => habit.type === "evitar";

/** Segunda-feira da semana de `date`. */
const weekStart = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

/** Quantas vezes o hábito foi feito na semana de `date`. */
export function weekCount(habit: Habit, date: Date, except?: string): number {
  const monday = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const iso = toISO(add(monday, { days: i }));
    if (iso !== except && habit.log.includes(iso)) n++;
  }
  return n;
}

/**
 * Se o hábito vale nesse dia. Pausado não vale nunca. "X vezes por semana" vale
 * em qualquer dia até bater as vezes da semana (o dia em que já foi feito continua valendo).
 */
export function isScheduled(habit: Habit, date: Date): boolean {
  if (habit.paused) return false;
  const iso = toISO(date);
  if (isAvoid(habit)) return !habit.createdAt || iso >= habit.createdAt;
  if (habit.perWeek) return habit.log.includes(iso) || weekCount(habit, date, iso) < habit.perWeek;
  return habit.weekdays.includes(date.getDay());
}

/** Feito no dia. Num mau hábito, "feito" é passar o dia sem ele. */
export function isDone(habit: Habit, date: Date): boolean {
  const iso = toISO(date);
  if (isAvoid(habit)) {
    if (iso > toISO(today())) return false;
    if (habit.createdAt && iso < habit.createdAt) return false;
    return !habit.log.includes(iso);
  }
  return habit.log.includes(iso);
}

/** Quanto foi feito no dia, para hábitos de quantidade. */
export function amountOn(habit: Habit, date: Date | string): number {
  const iso = typeof date === "string" ? date : toISO(date);
  if (!habit.amount) return habit.log.includes(iso) ? 1 : 0;
  return habit.counts?.[iso] ?? (habit.log.includes(iso) ? habit.amount.target : 0);
}

export interface StreakInfo {
  count: number;
  unit: "dia" | "semana";
}

export function streakLabel({ count, unit }: StreakInfo): string {
  if (unit === "semana") return `${count} ${count === 1 ? "semana" : "semanas"}`;
  return `${count} ${count === 1 ? "dia" : "dias"}`;
}

/** Até onde olhar para trás: a criação do hábito ou o registro mais antigo. */
function firstDay(habit: Habit, now: Date): Date {
  const dates = [...habit.log, ...(habit.createdAt ? [habit.createdAt] : [])].sort();
  const first = dates[0] ? parseISO(dates[0]) : now;
  return differenceInCalendarDays(now, first) > 730 ? sub(now, { days: 730 }) : first;
}

/**
 * Sequência atual: quantos dias previstos seguidos foram cumpridos.
 * Hoje ainda em aberto não quebra a sequência. Nos hábitos de "X por semana",
 * conta semanas seguidas em que bateu as vezes; a semana atual só soma quando fecha.
 */
export function streakInfo(habit: Habit, now: Date = today()): StreakInfo {
  if (habit.perWeek && !isAvoid(habit)) {
    let count = 0;
    for (let w = 0; w < 104; w++) {
      const day = sub(now, { weeks: w });
      if (weekCount(habit, day) >= habit.perWeek) count++;
      else if (w > 0) break;
    }
    return { count, unit: "semana" };
  }
  const done = new Set(habit.log);
  const limit = isAvoid(habit) ? differenceInCalendarDays(now, firstDay(habit, now)) + 1 : 400;
  let count = 0;
  for (let i = 0; i < limit; i++) {
    const day = sub(now, { days: i });
    if (isAvoid(habit)) {
      if (done.has(toISO(day))) break;
      count++;
      continue;
    }
    if (!habit.weekdays.includes(day.getDay())) continue;
    if (done.has(toISO(day))) count++;
    else if (i > 0) break;
  }
  return { count, unit: "dia" };
}

export function streak(habit: Habit, now: Date = today()): number {
  return streakInfo(habit, now).count;
}

/** A maior sequência que o hábito já teve. */
export function bestStreak(habit: Habit, now: Date = today()): StreakInfo {
  const first = firstDay(habit, now);
  if (habit.perWeek && !isAvoid(habit)) {
    let best = 0;
    let run = 0;
    for (let d = weekStart(first); d <= now; d = add(d, { weeks: 1 })) {
      if (weekCount(habit, d) >= habit.perWeek) best = Math.max(best, ++run);
      else if (toISO(weekStart(d)) !== toISO(weekStart(now))) run = 0;
    }
    return { count: best, unit: "semana" };
  }
  let best = 0;
  let run = 0;
  for (let d = first; d <= now; d = add(d, { days: 1 })) {
    const iso = toISO(d);
    if (isAvoid(habit)) {
      run = habit.log.includes(iso) ? 0 : run + 1;
    } else if (habit.weekdays.includes(d.getDay())) {
      if (habit.log.includes(iso)) run++;
      else if (iso !== toISO(now)) run = 0;
    }
    best = Math.max(best, run);
  }
  return { count: best, unit: "dia" };
}

/**
 * Quanto do previsto foi cumprido nos últimos `days` dias, de 0 a 1.
 * Hoje só conta se já foi feito. null quando ainda não há dias para medir.
 */
export function completionRate(habit: Habit, days = 30, now: Date = today()): number | null {
  const first = toISO(firstDay(habit, now));
  if (habit.perWeek && !isAvoid(habit)) {
    const weeks = Math.max(1, Math.round(days / 7));
    let sum = 0;
    let counted = 0;
    for (let w = 1; w <= weeks; w++) {
      const day = sub(now, { weeks: w });
      if (toISO(add(weekStart(day), { days: 6 })) < first) continue;
      sum += Math.min(1, weekCount(habit, day) / habit.perWeek);
      counted++;
    }
    return counted ? sum / counted : null;
  }
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const day = sub(now, { days: i });
    const iso = toISO(day);
    if (iso < first) break;
    if (!isAvoid(habit) && !habit.weekdays.includes(day.getDay())) continue;
    const ok = isDone(habit, day);
    if (i === 0 && !ok && !isAvoid(habit)) continue;
    due++;
    if (ok) done++;
  }
  return due ? done / due : null;
}

/** Quantas vezes já foi feito (ou, num mau hábito, quantas vezes escapou). */
export const totalTimes = (habit: Habit) => new Set(habit.log).size;

export function scheduleLabel(weekdays: number[]): string {
  const set = new Set(weekdays);
  if (set.size === 7) return "Todos os dias";
  if (set.size === 5 && !set.has(0) && !set.has(6)) return "Dias úteis";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Fins de semana";
  return WEEK_ORDER.filter((d) => set.has(d))
    .map((d) => WEEKDAY_SHORT[d].toLowerCase())
    .join(", ");
}

/** "Todos os dias", "3x por semana", "Evitar todo dia", com a quantidade quando tem. */
export function habitScheduleLabel(habit: Habit): string {
  if (isAvoid(habit)) return "Mau hábito: X nos dias em que fizer";
  const when = habit.perWeek ? `${habit.perWeek}x por semana` : scheduleLabel(habit.weekdays);
  return habit.amount ? `${when} · ${number.format(habit.amount.target)} ${habit.amount.unit}` : when;
}

export const PERIODS: { value: HabitPeriod | "qualquer"; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "qualquer", label: "Qualquer hora" },
];

/** Meta de baixar um número (peso, cintura): parte de cima e o alvo fica abaixo. */
export function goalDescends(goal: Goal): boolean {
  return goal.start !== undefined && goal.start > goal.target;
}

export function goalProgress(goal: Goal): number {
  const start = goal.start ?? 0;
  if (goal.target === start) return goalDone(goal) ? 1 : 0;
  return Math.min(1, Math.max(0, (goal.current - start) / (goal.target - start)));
}

export function goalDone(goal: Goal): boolean {
  if (!(goal.target > 0)) return false;
  return goalDescends(goal) ? goal.current > 0 && goal.current <= goal.target : goal.current >= goal.target;
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
  if (goal.start !== undefined && goal.start !== 0) {
    return `${number.format(goal.current)} ${goal.unit} agora, alvo de ${number.format(goal.target)} ${goal.unit}`.trim();
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

/** Quando a meta começou a contar: o início da contagem ligada, a criação ou o primeiro registro. */
export function goalStartDate(goal: Goal): string | null {
  if (goal.link && "since" in goal.link && goal.link.since) return goal.link.since;
  return goal.createdAt ?? goal.history?.[0]?.date ?? null;
}

export type PaceStatus = "adiantada" | "no-ritmo" | "atrasada";

/**
 * Compara o progresso com o que já deveria ter andado, numa linha reta do início ao prazo.
 * null sem prazo, sem início conhecido ou com a meta batida.
 */
export function goalPace(goal: Goal, now: Date = today()): { status: PaceStatus; expected: number } | null {
  const start = goalStartDate(goal);
  if (!goal.deadline || !start || goalDone(goal)) return null;
  const total = differenceInCalendarDays(parseISO(goal.deadline), parseISO(start));
  const elapsed = differenceInCalendarDays(now, parseISO(start));
  if (total <= 0 || elapsed < 0) return null;
  const expected = Math.min(1, elapsed / total);
  const diff = goalProgress(goal) - expected;
  return { status: diff > 0.05 ? "adiantada" : diff < -0.05 ? "atrasada" : "no-ritmo", expected };
}

export const PACE_LABEL: Record<PaceStatus, string> = {
  adiantada: "Adiantada",
  "no-ritmo": "No ritmo",
  atrasada: "Atrasada",
};

/**
 * Quando chega lá no ritmo de até agora. Precisa de pelo menos uma semana de história
 * e algum avanço; null quando não dá para prever.
 */
export function goalProjection(goal: Goal, now: Date = today()): Date | null {
  const start = goalStartDate(goal);
  if (!start || goalDone(goal)) return null;
  const elapsed = differenceInCalendarDays(now, parseISO(start));
  const progress = goalProgress(goal);
  if (elapsed < 7 || progress <= 0) return null;
  const daysLeft = Math.ceil((elapsed / progress) * (1 - progress));
  if (daysLeft > 365 * 20) return null;
  return add(now, { days: daysLeft });
}

/** O histórico do número para o gráfico, com o valor de hoje no fim. */
export function goalPoints(goal: Goal, now: Date = today()): { date: string; value: number }[] {
  const points = [...(goal.history ?? [])];
  const iso = toISO(now);
  if (goal.start !== undefined && points.length && goalStartDate(goal) && points[0].date > goalStartDate(goal)!) {
    points.unshift({ date: goalStartDate(goal)!, value: goal.start });
  }
  if (!points.length || points.at(-1)!.date !== iso) points.push({ date: iso, value: goal.current });
  return points;
}

/** Quanto precisa andar por semana (ou por mês, em prazos longos) para chegar no prazo. */
export function goalNeeded(goal: Goal, now: Date = today()): string | null {
  if (!goal.deadline || goalDone(goal)) return null;
  const days = differenceInCalendarDays(parseISO(goal.deadline), now);
  if (days <= 0) return null;
  const left = Math.abs(goal.target - goal.current);
  if (left <= 0) return null;
  const monthly = days > 90;
  const per = monthly ? left / (days / 30.44) : left / Math.max(1, days / 7);
  const isMoney = goal.unit.trim().toLowerCase() === "reais";
  const amount = isMoney ? money.format(per) : `${number.format(per)} ${goal.unit}`.trim();
  const verb = goalDescends(goal) ? "baixar" : isMoney ? "juntar" : "fazer";
  return `Para chegar no prazo: ${verb} cerca de ${amount} por ${monthly ? "mês" : "semana"}`;
}
