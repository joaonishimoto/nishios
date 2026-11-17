import { add, nextSaturday, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { CalEvent } from "./types";

export function seedEvents(): CalEvent[] {
  const now = today();
  const base = {
    endDate: "",
    allDay: false,
    start: "",
    end: "",
    location: "",
    notes: "",
    repeat: "none" as const,
    interval: 1,
    until: "",
    origin: "nishios" as const,
  };
  const trip = add(now, { days: 16 });

  return [
    { ...base, id: "ev-1", title: "Reunião com cliente", date: toISO(add(now, { days: 1 })), start: "14:00", end: "15:00", location: "Google Meet", notes: "Apresentar a proposta do novo site." },
    { ...base, id: "ev-2", title: "Aula de inglês", date: toISO(sub(now, { days: 21 })), start: "19:00", end: "20:00", repeat: "weekly" },
    { ...base, id: "ev-3", title: "Jantar com a família", date: toISO(nextSaturday(now)), start: "20:00", end: "22:30", location: "Casa dos pais" },
    { ...base, id: "ev-4", title: "Viagem a Florianópolis", date: toISO(trip), endDate: toISO(add(trip, { days: 3 })), allDay: true, notes: "Voo de ida às 7h40." },
    { ...base, id: "ev-5", title: "Almoço com o Rafael", date: toISO(add(now, { days: 4 })), start: "12:30", end: "13:30" },
    { ...base, id: "ev-6", title: "Fechamento do mês", date: toISO(sub(now, { months: 2, days: now.getDate() - 1 })), allDay: true, repeat: "monthly" },
  ];
}
