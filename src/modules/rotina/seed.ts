import { endOfYear, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Goal, Habit } from "./types";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * Monta um histórico de exemplo: `recent` dias seguidos feitos até ontem
 * e, antes disso, um padrão fixo com algumas falhas.
 */
function exampleLog(weekdays: number[], recent: number, doneToday: boolean, skipEvery: number) {
  const now = today();
  const log: string[] = [];
  if (doneToday && weekdays.includes(now.getDay())) log.push(toISO(now));
  let streakLeft = recent;
  for (let i = 1; i <= 28; i++) {
    const day = sub(now, { days: i });
    if (!weekdays.includes(day.getDay())) continue;
    if (streakLeft > 0) {
      log.push(toISO(day));
      streakLeft--;
    } else if (streakLeft === 0) {
      streakLeft = -1; // o dia que quebrou a sequência
    } else if (i % skipEvery !== 0) {
      log.push(toISO(day));
    }
  }
  return log;
}

export function seedHabits(): Habit[] {
  return [
    { id: "h1", name: "Beber 2 litros de água", icon: "💧", weekdays: EVERY_DAY, log: exampleLog(EVERY_DAY, 12, true, 5) },
    { id: "h2", name: "Ler 20 minutos", icon: "📖", weekdays: EVERY_DAY, log: exampleLog(EVERY_DAY, 4, false, 3) },
    { id: "h3", name: "Treinar", icon: "🏋️", weekdays: [1, 2, 4, 5], log: exampleLog([1, 2, 4, 5], 7, true, 6) },
    { id: "h4", name: "Estudar inglês", icon: "🗣️", weekdays: WEEKDAYS, log: exampleLog(WEEKDAYS, 0, false, 2) },
    { id: "h5", name: "Meditar 10 minutos", icon: "🧘", weekdays: EVERY_DAY, log: exampleLog(EVERY_DAY, 2, true, 2) },
    { id: "h6", name: "Dormir antes das 23h", icon: "🌙", weekdays: [0, 1, 2, 3, 4], log: exampleLog([0, 1, 2, 3, 4], 1, false, 3) },
  ];
}

export function seedGoals(): Goal[] {
  const yearEnd = toISO(endOfYear(today()));
  return [
    { id: "g1", name: "Ler 24 livros no ano", icon: "📚", unit: "livros", target: 24, current: 19, deadline: yearEnd, notes: "" },
    { id: "g2", name: "Juntar a reserva de emergência", icon: "💰", unit: "reais", target: 30000, current: 18500, deadline: "", notes: "Seis meses de custo de vida." },
    { id: "g3", name: "Correr 500 km no ano", icon: "🏃", unit: "km", target: 500, current: 412, deadline: yearEnd, notes: "" },
    { id: "g4", name: "Concluir o curso de inglês B2", icon: "🎯", unit: "módulos", target: 12, current: 12, deadline: "", notes: "" },
  ];
}
