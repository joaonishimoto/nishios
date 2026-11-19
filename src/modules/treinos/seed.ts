import { sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Exercise, ExerciseDef, Modality, Plan, Session, SetEntry } from "./types";

/** Catálogo de exemplo: os exercícios das fichas e mais alguns para escolher. */
export function seedExercises(): ExerciseDef[] {
  const ex = (id: string, name: string, equipment: ExerciseDef["equipment"], muscle: ExerciseDef["muscle"], notes = ""): ExerciseDef => ({ id, name, equipment, muscle, notes });
  return [
    ex("ex-supino-reto", "Supino reto", "barra", "peito", "Escápulas encaixadas, barra descendo até a linha do mamilo."),
    ex("ex-supino-inclinado-halteres", "Supino inclinado com halteres", "halteres", "peito"),
    ex("ex-crucifixo", "Crucifixo com halteres", "halteres", "peito"),
    ex("ex-desenvolvimento", "Desenvolvimento", "barra", "ombros"),
    ex("ex-elevacao-lateral", "Elevação lateral", "halteres", "ombros"),
    ex("ex-triceps-polia", "Tríceps na polia", "polia", "triceps"),
    ex("ex-puxada-frontal", "Puxada frontal", "polia", "costas"),
    ex("ex-remada-curvada", "Remada curvada", "barra", "costas"),
    ex("ex-barra-fixa", "Barra fixa", "livre", "costas", "Pegada pronada, descendo até estender os braços."),
    ex("ex-rosca-direta", "Rosca direta", "barra", "biceps"),
    ex("ex-agachamento-livre", "Agachamento livre", "barra", "quadriceps"),
    ex("ex-leg-press", "Leg press", "maquina", "quadriceps", "Leg 45°. A carga é só das anilhas."),
    ex("ex-cadeira-extensora", "Cadeira extensora", "maquina", "quadriceps"),
    ex("ex-mesa-flexora", "Mesa flexora", "maquina", "posterior"),
    ex("ex-panturrilha", "Panturrilha em pé", "maquina", "panturrilha"),
    ex("ex-prancha", "Prancha", "livre", "abdomen", "Conte as repetições como segundos."),
  ];
}

/** Três fichas em rodízio: A (empurrar), B (puxar) e C (pernas). */
export function seedPlans(): Plan[] {
  const item = (exerciseId: string, sets: number, repsMin: number, repsMax: number, weight: number, rest = 90, notes = "") => ({ exerciseId, sets, repsMin, repsMax, weight, rest, notes });
  return [
    {
      id: "f-a",
      name: "Treino A · Peito, ombro e tríceps",
      notes: "Começar com duas séries leves de aquecimento no supino.",
      items: [
        item("ex-supino-reto", 4, 6, 10, 70, 120, "Pirâmide: sobe a carga a cada série."),
        item("ex-supino-inclinado-halteres", 3, 8, 12, 24),
        item("ex-desenvolvimento", 3, 8, 10, 38),
        item("ex-triceps-polia", 3, 10, 12, 35, 60),
      ],
    },
    {
      id: "f-b",
      name: "Treino B · Costas e bíceps",
      notes: "",
      items: [
        item("ex-puxada-frontal", 4, 8, 10, 60),
        item("ex-remada-curvada", 4, 6, 8, 55, 120),
        item("ex-barra-fixa", 3, 6, 10, 0, 90, "Até a falha."),
        item("ex-rosca-direta", 3, 8, 10, 28, 60),
      ],
    },
    {
      id: "f-c",
      name: "Treino C · Pernas",
      notes: "Alongar antes do agachamento.",
      items: [
        item("ex-agachamento-livre", 4, 6, 8, 100, 150),
        item("ex-leg-press", 4, 10, 12, 210),
        item("ex-cadeira-extensora", 3, 12, 15, 55, 60),
        item("ex-panturrilha", 4, 12, 15, 80, 45),
      ],
    },
  ];
}

const SEED_IDS = new Map(seedExercises().map((e) => [e.name, e.id]));

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

  const x = (name: string, sets: number, reps: number, weight: number, setsDetail?: SetEntry[]): Exercise => ({
    name,
    sets: setsDetail?.length ?? sets,
    reps: setsDetail ? setsDetail.reduce((top, s) => (s.weight >= top.weight ? s : top)).reps : reps,
    weight: setsDetail ? Math.max(...setsDetail.map((s) => s.weight)) : weight,
    exerciseId: SEED_IDS.get(name),
    ...(setsDetail ? { setsDetail } : {}),
  });

  /** `step` cresce com o tempo: 0 há cinco semanas, negativo antes disso. */
  const peito = (step: number): Exercise[] => [
    step >= 2
      ? x("Supino reto", 4, 8, 0, [
          { reps: 10, weight: 55 + step * 2.5 },
          { reps: 8, weight: 60 + step * 2.5 },
          { reps: 8, weight: 60 + step * 2.5 },
          { reps: 6, weight: 62.5 + step * 2.5 },
        ])
      : x("Supino reto", 4, 8, 60 + step * 2.5),
    x("Supino inclinado com halteres", 3, 10, Math.max(12, 20 + step)),
    x("Desenvolvimento", 3, 10, Math.max(20, 30 + step * 2)),
    x("Tríceps na polia", 3, 12, Math.max(15, 25 + step * 2.5)),
  ];
  const pull = (step: number) => Math.max(4, 8 + Math.floor(step / 2));
  const costas = (step: number): Exercise[] => [
    x("Puxada frontal", 4, 10, Math.max(30, 50 + step * 2.5)),
    x("Remada curvada", 4, 8, Math.max(30, 45 + step * 2.5)),
    step >= 1
      ? x("Barra fixa", 3, 8, 0, [{ reps: pull(step) + 1, weight: 0 }, { reps: pull(step), weight: 0 }, { reps: pull(step) - 2, weight: 0 }])
      : x("Barra fixa", 3, pull(step), 0),
    x("Rosca direta", 3, 10, Math.max(14, 24 + step)),
  ];
  const pernas = (step: number): Exercise[] => [
    x("Agachamento livre", 4, 8, Math.max(40, 80 + step * 5)),
    x("Leg press", 4, 10, Math.max(110, 170 + step * 10)),
    x("Cadeira extensora", 3, 12, Math.max(25, 45 + step * 2.5)),
    x("Panturrilha em pé", 4, 15, Math.max(30, 60 + step * 5)),
  ];

  const sessions: Session[] = [];
  const gym = (ago: number, exercises: Exercise[], duration: number, notes = "") => {
    const first = exercises[0]?.name;
    const planId = first === "Supino reto" ? "f-a" : first === "Puxada frontal" ? "f-b" : first === "Agachamento livre" ? "f-c" : undefined;
    sessions.push({ ...base, id: id(), modalityId: "m-musculacao", date: day(ago), duration, intensity: "forte", exercises, notes, planId });
  };
  const fight = (ago: number, style: string, rounds: number, duration: number, notes = "") =>
    sessions.push({ ...base, id: id(), modalityId: "m-luta", date: day(ago), duration, intensity: rounds >= 5 ? "forte" : "moderado", style, rounds, notes });
  const run = (ago: number, distance: number, duration: number, notes = "") =>
    sessions.push({ ...base, id: id(), modalityId: "m-corrida", date: day(ago), duration, intensity: distance >= 8 ? "forte" : "moderado", distance, notes });
  const walk = (ago: number, distance: number, duration: number) =>
    sessions.push({ ...base, id: id(), modalityId: "m-caminhada", date: day(ago), duration, intensity: "leve", distance });
  const swim = (ago: number, distance: number, duration: number) =>
    sessions.push({ ...base, id: id(), modalityId: "m-natacao", date: day(ago), duration, intensity: "moderado", distance });

  gym(0, peito(4), 62, "Última série do supino com 72,5 kg.");
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

  // Três meses antes, com as cargas mais baixas: dá forma aos gráficos de progresso.
  const days = [{ make: costas }, { make: peito }, { make: pernas }];
  for (let i = 0; i < 30; i++) {
    const ago = 36 + Math.round(i * 2.6);
    const step = -1 - Math.floor(i / 5);
    gym(ago, days[i % 3].make(step), 55 + (i % 4) * 3);
  }

  // Para a frente: treinos planejados, que aparecem no calendário até serem feitos.
  run(-1, 8, 48, "Ritmo leve.");
  gym(-2, peito(3), 60);
  fight(-4, "Muay thai", 5, 60);

  const todayISO = toISO(now);
  return sessions.map((s) => (s.date > todayISO ? { ...s, planned: true } : s));
}
