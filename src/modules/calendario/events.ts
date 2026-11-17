import { add, differenceInCalendarDays, parseISO } from "date-fns";
import { toISO } from "@/lib/dates";
import type { CalEvent, Repeat } from "./types";

const STEP: Record<Exclude<Repeat, "none">, "days" | "weeks" | "months" | "years"> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

/** Quantos dias o evento ocupa (1 para evento de um dia só). */
export function spanDays(e: Pick<CalEvent, "date" | "endDate">): number {
  if (!e.endDate || e.endDate <= e.date) return 1;
  return differenceInCalendarDays(parseISO(e.endDate), parseISO(e.date)) + 1;
}

/**
 * Dias (yyyy-MM-dd) em que o evento aparece entre `from` e `to`, já
 * contando a repetição e eventos de vários dias.
 */
export function occurrences(e: CalEvent, from: string, to: string): { date: string; start: string; dayIndex: number }[] {
  const out: { date: string; start: string; dayIndex: number }[] = [];
  const first = parseISO(e.date);
  const days = spanDays(e);
  const interval = Math.max(1, e.interval || 1);

  for (let n = 0; n < 2000; n++) {
    // Sempre a partir da primeira data: somar mês a mês perderia o dia 31.
    const start = e.repeat === "none" ? first : add(first, { [STEP[e.repeat]]: n * interval });
    const startISO = toISO(start);
    if (startISO > to || (e.until && startISO > e.until)) break;
    for (let d = 0; d < days; d++) {
      const date = d === 0 ? startISO : toISO(add(start, { days: d }));
      if (date >= from && date <= to) out.push({ date, start: startISO, dayIndex: d });
    }
    if (e.repeat === "none") break;
  }
  return out;
}

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: "Não repete",
  daily: "Todo dia",
  weekly: "Toda semana",
  monthly: "Todo mês",
  yearly: "Todo ano",
};

export function timeLabel(start?: string, end?: string): string {
  if (!start) return "Dia todo";
  return end && end !== start ? `${start} às ${end}` : start;
}
