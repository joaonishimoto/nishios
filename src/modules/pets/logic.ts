import { add, differenceInCalendarDays, differenceInMonths, parseISO } from "date-fns";
import type { CycleStatus } from "@/components/ui/CycleTrack";
import { today } from "@/lib/dates";
import { CARE_INTERVALS, type Care, type Pet, type Weight } from "./types";

/** "once" = dose única já aplicada, sem próxima data. */
export type CareStatus = CycleStatus | "once";

export interface CareState {
  status: CareStatus;
  next: Date | null;
  daysUntil: number | null;
  progress: number;
}

const WARN_DAYS = 15;

export function careState(c: Care, now: Date = today()): CareState {
  if (!c.lastDate) return { status: "never", next: null, daysUntil: null, progress: 0 };
  if (c.intervalMonths <= 0) return { status: "once", next: null, daysUntil: null, progress: 1 };
  const last = parseISO(c.lastDate);
  const next = add(last, { months: c.intervalMonths });
  const daysUntil = differenceInCalendarDays(next, now);
  const cycle = Math.max(1, differenceInCalendarDays(next, last));
  return {
    status: daysUntil < 0 ? "overdue" : daysUntil <= WARN_DAYS ? "soon" : "ok",
    next,
    daysUntil,
    progress: Math.min(1, Math.max(0, differenceInCalendarDays(now, last) / cycle)),
  };
}

function span(days: number): string {
  const n = Math.abs(days);
  if (n === 1) return "1 dia";
  if (n < 60) return `${n} dias`;
  const months = Math.round(n / 30.44);
  if (months < 12) return `${months} meses`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 ano" : `${years} anos`;
}

export function careLabel(s: CareState): string {
  if (s.status === "never") return "Ainda não foi feito";
  if (s.status === "once") return "Dose única aplicada";
  if (s.daysUntil === 0) return "Vence hoje";
  if (s.daysUntil! < 0) return `Atrasado há ${span(s.daysUntil!)}`;
  return `Em ${span(s.daysUntil!)}`;
}

export function intervalLabel(months: number): string {
  return CARE_INTERVALS.find((i) => i.value === months)?.label ?? `A cada ${months} meses`;
}

const ORDER: CareStatus[] = ["overdue", "soon", "never", "ok", "once"];

export function byCareUrgency(a: Care, b: Care, now: Date = today()): number {
  const sa = careState(a, now);
  const sb = careState(b, now);
  return (
    ORDER.indexOf(sa.status) - ORDER.indexOf(sb.status) ||
    (sa.daysUntil ?? 0) - (sb.daysUntil ?? 0) ||
    a.name.localeCompare(b.name, "pt-BR")
  );
}

export function overdueCares(pet: Pet, now: Date = today()): Care[] {
  return pet.cares.filter((c) => careState(c, now).status === "overdue");
}

/** Uma frase sobre o que o pet precisa agora, para o cartão. */
export function petHeadline(pet: Pet, now: Date = today()): { text: string; tone: "danger" | "warning" | "muted" } {
  const overdue = overdueCares(pet, now);
  if (overdue.length === 1) return { text: `${overdue[0].name} atrasado`, tone: "danger" };
  if (overdue.length > 1) return { text: `${overdue.length} cuidados atrasados`, tone: "danger" };
  const ongoing = pet.health.filter((h) => h.ongoing);
  if (ongoing.length > 0) return { text: `Em tratamento: ${ongoing[0].title}`, tone: "warning" };
  const soon = pet.cares.filter((c) => careState(c, now).status === "soon").sort((a, b) => byCareUrgency(a, b, now));
  if (soon.length > 0) return { text: `${soon[0].name} ${careLabel(careState(soon[0], now)).toLowerCase()}`, tone: "warning" };
  return { text: pet.cares.length === 0 ? "Nenhum cuidado cadastrado" : "Cuidados em dia", tone: "muted" };
}

export function ageLabel(birthday: string, now: Date = today()): string | null {
  if (!birthday) return null;
  const months = differenceInMonths(now, parseISO(birthday));
  if (months < 1) return "Menos de 1 mês";
  if (months < 12) return months === 1 ? "1 mês" : `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 ano" : `${years} anos`;
}

export const newestFirst = <T extends { date: string }>(list: T[]): T[] =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatKg = (n: number) => `${kg.format(n)} kg`;

export function currentWeight(pet: Pet): Weight | undefined {
  return newestFirst(pet.weights)[0];
}
