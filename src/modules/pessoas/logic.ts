import { add, differenceInCalendarDays, parseISO } from "date-fns";
import type { Tone } from "@/components/ui/Badge";
import type { CycleStatus } from "@/components/ui/CycleTrack";
import { today } from "@/lib/dates";
import { CONTACT_PRESETS, type Person } from "./types";

/** "none" = a pessoa não tem lembrete de contato. */
export type ContactStatus = CycleStatus | "none";

export interface Contact {
  status: ContactStatus;
  lastContact: Date | null;
  nextContact: Date | null;
  daysSince: number | null;
  /** Dias até o próximo contato; negativo quando já passou. */
  daysUntil: number | null;
  progress: number;
}

export function contact(p: Person, now: Date = today()): Contact {
  const last = p.interactions[0] ? parseISO(p.interactions[0].date) : null;
  const daysSince = last ? differenceInCalendarDays(now, last) : null;
  if (p.contactEvery <= 0) {
    return { status: "none", lastContact: last, nextContact: null, daysSince, daysUntil: null, progress: 0 };
  }
  if (!last || daysSince === null) {
    return { status: "never", lastContact: null, nextContact: null, daysSince: null, daysUntil: null, progress: 0 };
  }
  const next = add(last, { days: p.contactEvery });
  const daysUntil = differenceInCalendarDays(next, now);
  // "Chegando a hora" quando falta um quinto do intervalo, no máximo uma semana.
  const warn = Math.min(7, Math.ceil(p.contactEvery * 0.2));
  return {
    status: daysUntil < 0 ? "overdue" : daysUntil <= warn ? "soon" : "ok",
    lastContact: last,
    nextContact: next,
    daysSince,
    daysUntil,
    progress: Math.min(1, Math.max(0, daysSince / p.contactEvery)),
  };
}

export const CONTACT_META: Record<ContactStatus, { label: string; tone: Tone }> = {
  overdue: { label: "Hora de procurar", tone: "danger" },
  soon: { label: "Chegando a hora", tone: "warning" },
  never: { label: "Sem contato registrado", tone: "neutral" },
  ok: { label: "Em dia", tone: "success" },
  none: { label: "Sem lembrete", tone: "neutral" },
};

const ORDER: ContactStatus[] = ["overdue", "soon", "never", "ok", "none"];

/** Quem está há mais tempo esperando contato vem primeiro. */
export function byContactUrgency(a: Person, b: Person, now: Date = today()): number {
  const ca = contact(a, now);
  const cb = contact(b, now);
  const s = ORDER.indexOf(ca.status) - ORDER.indexOf(cb.status);
  if (s !== 0) return s;
  return (ca.daysUntil ?? 0) - (cb.daysUntil ?? 0) || a.name.localeCompare(b.name, "pt-BR");
}

function days(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return "1 dia";
  if (abs < 14) return `${abs} dias`;
  if (abs < 60) return `${Math.round(abs / 7)} semanas`;
  if (abs < 365) return `${Math.round(abs / 30.44)} meses`;
  const years = Math.round(abs / 365);
  return years === 1 ? "1 ano" : `${years} anos`;
}

export function lastContactLabel(c: Contact): string {
  if (c.daysSince === null) return "Nenhum contato registrado";
  if (c.daysSince === 0) return "Falaram hoje";
  if (c.daysSince === 1) return "Falaram ontem";
  return `Último contato há ${days(c.daysSince)}`;
}

export function nextContactLabel(c: Contact): string {
  if (c.status === "none") return "Sem lembrete de contato";
  if (c.daysUntil === null) return "Registre o primeiro contato";
  if (c.daysUntil < 0) return `Passou ${days(c.daysUntil)} do combinado`;
  if (c.daysUntil === 0) return "Procurar hoje";
  return `Procurar em ${days(c.daysUntil)}`;
}

export function frequencyLabel(contactEvery: number): string {
  const preset = CONTACT_PRESETS.find((p) => p.value === contactEvery);
  return preset ? preset.label : `A cada ${contactEvery} dias`;
}

export interface Birthday {
  next: Date;
  daysUntil: number;
  /** Idade que a pessoa faz nesse aniversário. */
  turning: number;
}

export function birthday(p: Person, now: Date = today()): Birthday | null {
  if (!p.birthday) return null;
  const born = parseISO(p.birthday);
  let next = new Date(now.getFullYear(), born.getMonth(), born.getDate());
  if (next < now) next = new Date(now.getFullYear() + 1, born.getMonth(), born.getDate());
  return {
    next,
    daysUntil: differenceInCalendarDays(next, now),
    turning: next.getFullYear() - born.getFullYear(),
  };
}

export function birthdayLabel(b: Birthday): string {
  if (b.daysUntil === 0) return "Hoje";
  if (b.daysUntil === 1) return "Amanhã";
  return `Em ${b.daysUntil} dias`;
}

/** Pessoas que fazem aniversário nos próximos `within` dias, da mais próxima em diante. */
export function upcomingBirthdays(people: Person[], within: number, now: Date = today()) {
  return people
    .map((person) => ({ person, birthday: birthday(person, now) }))
    .filter((x): x is { person: Person; birthday: Birthday } =>
      !!x.birthday && x.birthday.daysUntil <= within,
    )
    .sort((a, b) => a.birthday.daysUntil - b.birthday.daysUntil);
}

export function needsContact(p: Person, now: Date = today()): boolean {
  return contact(p, now).status === "overdue";
}
