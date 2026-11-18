import { addMonths, format, getDaysInMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toISO } from "@/lib/dates";
import { money } from "@/lib/format";
import type { Wish } from "@/modules/bens/types";
import { EVERY_OPTIONS, INVESTMENT_TYPES, type Investment, type Recurrence } from "./types";

/** "2026-11" a partir de uma data. */
export const monthOf = (date: Date | string): string =>
  typeof date === "string" ? date.slice(0, 7) : format(date, "yyyy-MM");

/** Diferença em meses entre dois yyyy-MM. */
function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Soma meses a um yyyy-MM. */
export function shiftMonth(month: string, n: number): string {
  return monthOf(addMonths(parseISO(`${month}-01`), n));
}

/** "novembro de 2026" ou "novembro" quando é o ano de referência. */
export function monthLabel(month: string, refYear?: number): string {
  const d = parseISO(`${month}-01`);
  return format(d, d.getFullYear() === refYear ? "MMMM" : "MMMM 'de' yyyy", { locale: ptBR });
}

export const shortMonth = (month: string) => format(parseISO(`${month}-01`), "MMM", { locale: ptBR }).replace(".", "");

/** Qual vez é esta (0 = a primeira), ou -1 quando não cai no mês. */
export function occurrenceIndex(r: Recurrence, month: string): number {
  const diff = monthDiff(monthOf(r.first), month);
  if (diff < 0 || diff % r.every !== 0) return -1;
  const index = diff / r.every;
  if (r.times && index >= r.times) return -1;
  return index;
}

/** Última vez de um parcelamento, em yyyy-MM. */
export function lastMonth(r: Recurrence): string | null {
  return r.times ? shiftMonth(monthOf(r.first), (r.times - 1) * r.every) : null;
}

/** Já passou da última parcela. */
export function finished(r: Recurrence, month: string): boolean {
  const last = lastMonth(r);
  return !!last && last < month;
}

export interface Occurrence {
  rec: Recurrence;
  /** yyyy-MM-dd */
  date: string;
  /** Valor do mês: o ajustado, se houver, ou o previsto. */
  amount: number;
  adjusted: boolean;
  done: boolean;
  /** 0 = primeira vez. */
  index: number;
}

export function occurrenceIn(r: Recurrence, month: string): Occurrence | null {
  const index = occurrenceIndex(r, month);
  if (index < 0) return null;
  const day = Number(r.first.slice(8, 10)) || 1;
  const max = getDaysInMonth(parseISO(`${month}-01`));
  const mark = r.months?.[month];
  return {
    rec: r,
    date: `${month}-${String(Math.min(day, max)).padStart(2, "0")}`,
    amount: mark?.amount ?? r.amount,
    adjusted: mark?.amount !== undefined,
    done: !!mark?.done,
    index,
  };
}

/** Compra planejada na lista de desejos, para a previsão do mês. */
export interface PlannedBuy {
  wish: Wish;
  date: string;
  amount: number;
}

export interface MonthSummary {
  month: string;
  items: Occurrence[];
  income: number;
  /** Saídas sem contar os aportes. */
  expenses: number;
  /** Aportes em investimentos. */
  invested: number;
  /** Entra menos sai, antes de investir. */
  leftBefore: number;
  /** O que sobra depois dos aportes. */
  leftAfter: number;
  planned: PlannedBuy[];
  plannedTotal: number;
}

const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);

export function summarize(recs: Recurrence[], month: string, wishes: Wish[] = []): MonthSummary {
  const items = recs.flatMap((r) => occurrenceIn(r, month) ?? []).sort((a, b) => byDate(a, b) || b.amount - a.amount);
  let income = 0;
  let expenses = 0;
  let invested = 0;
  for (const o of items) {
    if (o.rec.kind === "in") income += o.amount;
    else if (o.rec.investmentId) invested += o.amount;
    else expenses += o.amount;
  }
  const planned = wishes
    .filter((w) => w.targetDate && monthOf(w.targetDate) === month && w.price > 0)
    .map((w) => ({ wish: w, date: w.targetDate, amount: w.price }))
    .sort(byDate);
  const plannedTotal = planned.reduce((n, p) => n + p.amount, 0);
  return {
    month,
    items,
    income,
    expenses,
    invested,
    leftBefore: income - expenses,
    leftAfter: income - expenses - invested,
    planned,
    plannedTotal,
  };
}

/** Os próximos `count` meses a partir de `from` (yyyy-MM), inclusive. */
export function forecast(recs: Recurrence[], from: string, count = 12, wishes: Wish[] = []): MonthSummary[] {
  return Array.from({ length: count }, (_, i) => summarize(recs, shiftMonth(from, i), wishes));
}

/** Quanto pesa por mês, em média: um anual de R$ 1.200 vale R$ 100 por mês. */
export const monthlyEquivalent = (r: Recurrence) => r.amount / r.every;

/** Quanto custa em 12 meses. */
export const yearlyCost = (r: Recurrence) => (r.amount * 12) / r.every;

/** Só as que ainda valem: sem as parcelas que já acabaram. */
export const active = (recs: Recurrence[], month: string) => recs.filter((r) => !finished(r, month));

export function everyLabel(r: Recurrence): string {
  const day = Number(r.first.slice(8, 10));
  const base = EVERY_OPTIONS.find((o) => o.value === r.every)?.label ?? `A cada ${r.every} meses`;
  if (r.every === 12) return `${base}, em ${format(parseISO(r.first), "d 'de' MMMM", { locale: ptBR })}`;
  return `${base}, dia ${day}`;
}

/** "3 de 10" para um parcelamento no mês; null quando não é parcelado. */
export function installmentLabel(r: Recurrence, month: string): string | null {
  if (!r.times) return null;
  const i = occurrenceIndex(r, month);
  if (i >= 0) return `${i + 1} de ${r.times}`;
  const last = lastMonth(r)!;
  if (last < month) return `Terminou em ${monthLabel(last)}`;
  return `${r.times}x, até ${monthLabel(last)}`;
}

/** Próximas ocorrências entre duas datas (yyyy-MM-dd), em ordem. */
export function between(recs: Recurrence[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (let m = monthOf(from); m <= monthOf(to); m = shiftMonth(m, 1)) {
    for (const r of recs) {
      const o = occurrenceIn(r, m);
      if (o && o.date >= from && o.date <= to) out.push(o);
    }
  }
  return out.sort(byDate);
}

/* ---------------- Investimentos ---------------- */

export const balance = (i: Investment): number => i.history.at(-1)?.balance ?? 0;
export const lastUpdate = (i: Investment): string | null => i.history.at(-1)?.date ?? null;
export const totalInvested = (list: Investment[]) => list.reduce((n, i) => n + balance(i), 0);

export const typeLabel = (i: Investment) => INVESTMENT_TYPES.find((t) => t.value === i.type)?.label ?? "Outro";

/** Quanto mudou desde o saldo anterior. */
export function lastChange(i: Investment): number | null {
  if (i.history.length < 2) return null;
  return i.history.at(-1)!.balance - i.history.at(-2)!.balance;
}

/** Guarda o saldo de um dia; se já havia um naquele dia, troca. */
export function withBalance(history: Investment["history"], date: string, value: number): Investment["history"] {
  return [...history.filter((p) => p.date !== date), { date, balance: value }].sort(byDate);
}

/** Aporte mensal médio que as recorrências fazem para um investimento. */
export function monthlyContribution(recs: Recurrence[], investmentId: string, month: string): number {
  return active(recs, month)
    .filter((r) => r.kind === "out" && r.investmentId === investmentId)
    .reduce((n, r) => n + monthlyEquivalent(r), 0);
}

/**
 * Quando o saldo chega ao alvo no ritmo do aporte recorrente, sem contar rendimento.
 * null quando não tem aporte ou já chegou.
 */
export function reachDate(current: number, target: number, perMonth: number, now: Date): { months: number; date: string } | null {
  if (current >= target || perMonth <= 0) return null;
  const months = Math.ceil((target - current) / perMonth);
  return { months, date: toISO(addMonths(now, months)) };
}

/** "Sobra R$ 1.200" ou "Falta R$ 300", para o sinal ficar claro sem o menos. */
export function leftLabel(value: number): string {
  return value >= 0 ? `Sobra ${money(value)}` : `Falta ${money(-value)}`;
}
