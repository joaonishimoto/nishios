import { add, differenceInCalendarDays, parseISO } from "date-fns";
import { today } from "@/lib/dates";
import type { Commitment, IntervalUnit, Status } from "./types";
import type { Tone } from "@/components/ui/Badge";

export { formatDate, shortDate, toISO, today } from "@/lib/dates";

export interface Derived {
  status: Status;
  lastDone: Date | null;
  nextDue: Date | null;
  /** Dias até o vencimento; negativo quando já passou. */
  daysUntil: number | null;
  daysSince: number | null;
  /** Tamanho do ciclo atual em dias. */
  cycleDays: number | null;
  /** Quanto do ciclo já passou, de 0 a 1 (fica em 1 quando atrasado). */
  progress: number;
}

/** Compromisso pontual: acontece uma vez, numa data marcada, e não se repete. */
export const isOneOff = (c: Pick<Commitment, "repeats">): boolean => c.repeats === false;

/** Quantos dias antes da data a trilha de um compromisso pontual começa a encher. */
const ONE_OFF_WINDOW = 30;

function deriveOneOff(c: Commitment, now: Date): Derived {
  if (c.history.length > 0) {
    const lastDone = parseISO(c.history[0]);
    return {
      status: "done",
      lastDone,
      nextDue: null,
      daysUntil: null,
      daysSince: differenceInCalendarDays(now, lastDone),
      cycleDays: null,
      progress: 1,
    };
  }
  if (!c.date) {
    return { status: "never", lastDone: null, nextDue: null, daysUntil: null, daysSince: null, cycleDays: null, progress: 0 };
  }
  const nextDue = parseISO(c.date);
  const daysUntil = differenceInCalendarDays(nextDue, now);
  const window = Math.max(ONE_OFF_WINDOW, c.warnDays);
  const status: Status = daysUntil < 0 ? "overdue" : daysUntil <= c.warnDays ? "soon" : "ok";
  return {
    status,
    lastDone: null,
    nextDue,
    daysUntil,
    daysSince: null,
    cycleDays: null,
    progress: Math.min(1, Math.max(0, 1 - daysUntil / window)),
  };
}

export function derive(c: Commitment, now: Date = today()): Derived {
  if (isOneOff(c)) return deriveOneOff(c, now);
  if (c.history.length === 0) {
    return {
      status: "never",
      lastDone: null,
      nextDue: null,
      daysUntil: null,
      daysSince: null,
      cycleDays: null,
      progress: 0,
    };
  }
  const lastDone = parseISO(c.history[0]);
  const nextDue = add(lastDone, { [c.intervalUnit]: c.intervalValue });
  const daysUntil = differenceInCalendarDays(nextDue, now);
  const daysSince = differenceInCalendarDays(now, lastDone);
  const cycleDays = Math.max(1, differenceInCalendarDays(nextDue, lastDone));
  const status: Status = daysUntil < 0 ? "overdue" : daysUntil <= c.warnDays ? "soon" : "ok";
  return {
    status,
    lastDone,
    nextDue,
    daysUntil,
    daysSince,
    cycleDays,
    progress: Math.min(1, Math.max(0, daysSince / cycleDays)),
  };
}

export const STATUS_ORDER: Status[] = ["overdue", "soon", "never", "ok", "done"];

export const STATUS_META: Record<Status, { label: string; group: string; tone: Tone }> = {
  overdue: { label: "Atrasado", group: "Atrasados", tone: "danger" },
  soon: { label: "Próximo", group: "Chegando a hora", tone: "warning" },
  never: { label: "Sem registro", group: "Sem registro", tone: "neutral" },
  ok: { label: "Em dia", group: "Em dia", tone: "success" },
  done: { label: "Concluído", group: "Concluídos", tone: "neutral" },
};

/** Ordena pelo que pede atenção primeiro. */
export function byUrgency(a: Commitment, b: Commitment, now: Date = today()): number {
  const da = derive(a, now);
  const db = derive(b, now);
  const sa = STATUS_ORDER.indexOf(da.status);
  const sb = STATUS_ORDER.indexOf(db.status);
  if (sa !== sb) return sa - sb;
  return (da.daysUntil ?? 0) - (db.daysUntil ?? 0) || a.name.localeCompare(b.name, "pt-BR");
}

const UNIT_LABELS: Record<IntervalUnit, [string, string, string]> = {
  // [singular, plural, "todo/toda"]
  days: ["dia", "dias", "Todo dia"],
  weeks: ["semana", "semanas", "Toda semana"],
  months: ["mês", "meses", "Todo mês"],
  years: ["ano", "anos", "Todo ano"],
};

export function unitLabel(unit: IntervalUnit, value: number): string {
  return UNIT_LABELS[unit][value === 1 ? 0 : 1];
}

export function periodLabel(c: Pick<Commitment, "intervalValue" | "intervalUnit" | "repeats">): string {
  if (isOneOff(c)) return "Não repete";
  if (c.intervalValue === 1) return UNIT_LABELS[c.intervalUnit][2];
  return `A cada ${c.intervalValue} ${unitLabel(c.intervalUnit, c.intervalValue)}`;
}

/** "12 dias", "3 meses", "1 ano e 2 meses": duração aproximada, fácil de ler. */
export function humanizeDays(days: number): string {
  const n = Math.abs(days);
  if (n === 1) return "1 dia";
  if (n < 60) return `${n} dias`;
  if (n < 365) {
    const months = Math.round(n / 30.44);
    return `${months} meses`;
  }
  const years = Math.floor(n / 365);
  const months = Math.round((n - years * 365) / 30.44);
  const y = `${years} ${years === 1 ? "ano" : "anos"}`;
  if (months === 0 || months === 12) return months === 12 ? `${years + 1} anos` : y;
  return `${y} e ${months} ${months === 1 ? "mês" : "meses"}`;
}

export function sinceLabel(daysSince: number | null): string {
  if (daysSince === null) return "Nunca";
  if (daysSince === 0) return "Hoje";
  if (daysSince === 1) return "Ontem";
  if (daysSince < 0) return `Em ${humanizeDays(daysSince)}`;
  return `Há ${humanizeDays(daysSince)}`;
}

export function dueLabel(d: Derived): string {
  if (d.status === "done") return "Concluído";
  if (d.daysUntil === null) return "Marque a primeira vez";
  if (d.daysUntil === 0) return "Vence hoje";
  if (d.daysUntil === 1) return "Vence amanhã";
  if (d.daysUntil < 0) return `Atrasado há ${humanizeDays(d.daysUntil)}`;
  return `Em ${humanizeDays(d.daysUntil)}`;
}
