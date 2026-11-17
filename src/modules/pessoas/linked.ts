import { format, sub } from "date-fns";
import { toISO } from "@/lib/dates";
import { occurrences } from "@/modules/calendario/events";
import type { CalEvent } from "@/modules/calendario/types";
import type { Interaction, Person } from "./types";

/**
 * Eventos do calendário marcados com uma pessoa contam como contato depois que
 * acontecem. O que é salvo continua sendo só o que foi registrado à mão.
 */
export function withEventContacts(people: Person[], events: CalEvent[], now: Date): Person[] {
  const todayISO = toISO(now);
  const clock = format(now, "HH:mm");
  const from = toISO(sub(now, { years: 1 }));
  const byPerson = new Map<string, Interaction[]>();
  for (const e of events) {
    if (!e.personIds?.length) continue;
    for (const o of occurrences(e, from, todayISO)) {
      if (o.dayIndex > 0) continue;
      // Hoje só conta depois da hora em que termina.
      if (o.date === todayISO && (e.allDay || (e.end || e.start) > clock)) continue;
      const contact: Interaction = { id: `ev-${e.id}-${o.date}`, date: o.date, type: "Encontro", note: e.title, eventId: e.id };
      for (const id of e.personIds) byPerson.set(id, [...(byPerson.get(id) ?? []), contact]);
    }
  }
  if (byPerson.size === 0) return people;
  return people.map((p) => {
    const auto = byPerson.get(p.id);
    if (!auto) return p;
    return { ...p, interactions: [...p.interactions, ...auto].sort((a, b) => b.date.localeCompare(a.date)) };
  });
}

/** Próximas vezes em que a pessoa aparece no calendário. */
export function upcomingWith(personId: string, events: CalEvent[], now: Date, limit = 3) {
  const from = toISO(now);
  const to = toISO(sub(now, { days: -120 }));
  return events
    .filter((e) => e.personIds?.includes(personId))
    .flatMap((e) => occurrences(e, from, to).filter((o) => o.dayIndex === 0).map((o) => ({ event: e, date: o.date })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}
