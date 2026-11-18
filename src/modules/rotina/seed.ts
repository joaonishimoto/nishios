import { endOfYear, startOfMonth, startOfYear, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import { seedSkills } from "@/modules/skills/seed";
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
    // Ligado aos treinos: fica feito sozinho nos dias com treino registrado.
    { id: "h3", name: "Treinar", icon: "🏋️", weekdays: [1, 2, 4, 5], log: [], link: { kind: "treinos", modalityId: "" } },
    { id: "h4", name: "Estudar inglês", icon: "🗣️", weekdays: WEEKDAYS, log: exampleLog(WEEKDAYS, 0, false, 2) },
    { id: "h5", name: "Meditar 10 minutos", icon: "🧘", weekdays: EVERY_DAY, log: exampleLog(EVERY_DAY, 2, true, 2) },
    { id: "h6", name: "Dormir antes das 23h", icon: "🌙", weekdays: [0, 1, 2, 3, 4], log: exampleLog([0, 1, 2, 3, 4], 1, false, 3) },
  ];
}

export function seedGoals(): Goal[] {
  const now = today();
  const yearEnd = toISO(endOfYear(now));
  const monthStart = toISO(startOfMonth(now));
  const english = seedSkills().find((s) => s.name === "Inglês para reuniões");
  return [
    { id: "g1", name: "Ler 24 livros no ano", icon: "📚", unit: "livros", target: 24, current: 19, deadline: yearEnd, notes: "" },
    { id: "g2", name: "Juntar a reserva de emergência", icon: "💰", unit: "reais", target: 30000, current: 0, deadline: "", notes: "Seis meses de custo de vida.", link: { kind: "investimento", investmentId: "inv-reserva" } },
    // As três abaixo são ligadas: o número vem dos treinos e do corpo.
    { id: "g3", name: "Correr 40 km no mês", icon: "🏃", unit: "km", target: 40, current: 0, deadline: "", notes: "", link: { kind: "treinos", modalityId: "m-corrida", metric: "distance", since: monthStart } },
    { id: "g5", name: "Chegar a 78 kg", icon: "⚖️", unit: "kg", target: 78, current: 0, start: 84.2, deadline: yearEnd, notes: "Sem pressa: meio quilo por mês já serve.", link: { kind: "peso" } },
    { id: "g6", name: "Treinar 150 vezes no ano", icon: "🏋️", unit: "treinos", target: 150, current: 0, deadline: yearEnd, notes: "", link: { kind: "treinos", modalityId: "", metric: "sessions", since: toISO(startOfYear(now)) } },
    { id: "g4", name: "Concluir o curso de inglês B2", icon: "🎯", unit: "módulos", target: 12, current: 12, deadline: "", notes: "" },
    // Ligada a uma skill: anda conforme os materiais do plano de estudo são concluídos.
    ...(english
      ? [{ id: "g7", name: "Terminar o plano de inglês para reuniões", icon: "🗣️", unit: "materiais", target: english.resources.length, current: 0, deadline: "", notes: "", link: { kind: "skill" as const, skillId: english.id, metric: "materiais" as const } }]
      : []),
  ];
}
