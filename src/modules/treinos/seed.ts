import { sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Exercise, Modality, Session } from "./types";

export function seedModalities(): Modality[] {
  return [
    { id: "m-musculacao", name: "Musculação", icon: "🏋️", kind: "strength", unit: "km" },
    { id: "m-luta", name: "Luta", icon: "🥊", kind: "fight", unit: "km" },
    { id: "m-corrida", name: "Corrida", icon: "🏃", kind: "distance", unit: "km" },
    { id: "m-caminhada", name: "Caminhada", icon: "🚶", kind: "distance", unit: "km" },
    { id: "m-natacao", name: "Natação", icon: "🏊", kind: "distance", unit: "m" },
    { id: "m-danca", name: "Dança", icon: "💃", kind: "dance", unit: "km" },
  ];
}

/** Cinco semanas de treinos de exemplo, com as cargas subindo aos poucos. */
export function seedSessions(): Session[] {
  const now = today();
  const day = (ago: number) => toISO(sub(now, { days: ago }));
  const base = { notes: "", distance: 0, rounds: 0, style: "", exercises: [] as Exercise[] };
  let n = 0;
  const id = () => `s${++n}`;

  /** `step` cresce com o tempo: 0 no treino mais antigo. */
  const peito = (step: number): Exercise[] => [
    { name: "Supino reto", sets: 4, reps: 8, weight: 60 + step * 2.5 },
    { name: "Supino inclinado com halteres", sets: 3, reps: 10, weight: 20 + step },
    { name: "Tríceps na polia", sets: 3, reps: 12, weight: 25 + step * 2.5 },
    { name: "Desenvolvimento", sets: 3, reps: 10, weight: 30 + step * 2 },
  ];
  const costas = (step: number): Exercise[] => [
    { name: "Puxada frontal", sets: 4, reps: 10, weight: 50 + step * 2.5 },
    { name: "Remada curvada", sets: 4, reps: 8, weight: 45 + step * 2.5 },
    { name: "Rosca direta", sets: 3, reps: 10, weight: 24 + step },
    { name: "Barra fixa", sets: 3, reps: 8, weight: 0 },
  ];
  const pernas = (step: number): Exercise[] => [
    { name: "Agachamento livre", sets: 4, reps: 8, weight: 80 + step * 5 },
    { name: "Leg press", sets: 4, reps: 10, weight: 160 + step * 10 },
    { name: "Cadeira extensora", sets: 3, reps: 12, weight: 45 + step * 2.5 },
    { name: "Panturrilha em pé", sets: 4, reps: 15, weight: 60 + step * 5 },
  ];

  const sessions: Session[] = [];
  const gym = (ago: number, exercises: Exercise[], duration: number, notes = "") =>
    sessions.push({ ...base, id: id(), modalityId: "m-musculacao", date: day(ago), duration, intensity: "forte", exercises, notes });
  const fight = (ago: number, style: string, rounds: number, duration: number, notes = "") =>
    sessions.push({ ...base, id: id(), modalityId: "m-luta", date: day(ago), duration, intensity: rounds >= 5 ? "forte" : "moderado", style, rounds, notes });
  const run = (ago: number, distance: number, duration: number, notes = "") =>
    sessions.push({ ...base, id: id(), modalityId: "m-corrida", date: day(ago), duration, intensity: distance >= 8 ? "forte" : "moderado", distance, notes });
  const walk = (ago: number, distance: number, duration: number) =>
    sessions.push({ ...base, id: id(), modalityId: "m-caminhada", date: day(ago), duration, intensity: "leve", distance });
  const swim = (ago: number, distance: number, duration: number) =>
    sessions.push({ ...base, id: id(), modalityId: "m-natacao", date: day(ago), duration, intensity: "moderado", distance });

  gym(0, peito(4), 62, "Subi o supino para 70 kg.");
  run(1, 5.2, 30);
  fight(1, "Muay thai", 5, 60, "Sparring leve nos dois últimos rounds.");
  gym(2, pernas(4), 70);
  walk(3, 4, 45);
  fight(4, "Jiu-jitsu", 4, 75, "Passagem de guarda.");
  gym(5, costas(3), 58);
  run(6, 10, 61, "Longo de domingo.");
  gym(7, peito(3), 60);
  swim(8, 1200, 32);
  fight(8, "Muay thai", 6, 60);
  gym(9, pernas(3), 68);
  run(11, 5, 29.5);
  gym(12, costas(2), 55);
  walk(13, 5.5, 60);
  gym(14, peito(2), 60);
  fight(15, "Muay thai", 5, 60);
  swim(16, 1000, 28);
  gym(17, pernas(2), 66);
  run(18, 6, 36);
  gym(20, costas(1), 55);
  fight(22, "Jiu-jitsu", 4, 75);
  gym(22, peito(1), 58);
  run(24, 5, 30.5);
  gym(26, pernas(1), 65);
  walk(27, 3.5, 40);
  gym(29, costas(0), 52);
  fight(29, "Muay thai", 4, 60);
  gym(31, peito(0), 57);
  run(32, 4, 25);
  swim(33, 800, 24);
  gym(34, pernas(0), 64);

  // Para a frente: treinos planejados, que aparecem no calendário até serem feitos.
  run(-1, 8, 48, "Ritmo leve.");
  gym(-2, peito(3), 60);
  fight(-4, "Muay thai", 5, 60);

  const todayISO = toISO(now);
  return sessions.map((s) => (s.date > todayISO ? { ...s, planned: true } : s));
}
