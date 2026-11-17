import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Datas são guardadas como texto yyyy-MM-dd: sem fuso, fáceis de ordenar e comparar. */
export const ISO = "yyyy-MM-dd";

export function today(): Date {
  return startOfDay(new Date());
}

export function toISO(date: Date): string {
  return format(date, ISO);
}

export function formatDate(date: Date | string, pattern = "d 'de' MMM 'de' yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: ptBR });
}

/** Data curta: omite o ano quando é o ano atual. */
export function shortDate(date: Date | string, now: Date = today()): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDate(d, d.getFullYear() === now.getFullYear() ? "d 'de' MMM" : "d MMM yyyy");
}
