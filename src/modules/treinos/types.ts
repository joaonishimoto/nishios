/**
 * O tipo da modalidade decide quais campos um treino tem:
 * - strength: lista de exercícios com séries, repetições e carga
 * - fight: estilo e rounds
 * - distance: distância, de onde sai o ritmo
 * - dance: só duração e intensidade no treino; os passos e as faixas ficam em danca/
 * - other: só duração e intensidade
 */
export type ModalityKind = "strength" | "fight" | "distance" | "dance" | "other";
export type DistanceUnit = "km" | "m";

export interface Modality {
  id: string;
  name: string;
  icon: string;
  kind: ModalityKind;
  /** Só vale para modalidades de distância. */
  unit: DistanceUnit;
}

export type ModalityDraft = Omit<Modality, "id">;

/** Uma série feita: repetições e carga (kg; 0 para peso do corpo). */
export interface SetEntry {
  reps: number;
  weight: number;
}

/**
 * Um exercício dentro de um treino. `sets`, `reps` e `weight` são o resumo
 * (quantas séries, as repetições e a carga da série mais pesada) e continuam
 * valendo para tudo o que já lia o treino. Com `setsDetail`, cada série tem os
 * próprios números.
 */
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  /** Carga em kg; 0 para peso do corpo. */
  weight: number;
  /** O exercício do catálogo; treinos antigos ganham na primeira abertura, pelo nome. */
  exerciseId?: string;
  setsDetail?: SetEntry[];
}

/** Equipamento do exercício no catálogo. */
export type Equipment = "maquina" | "halteres" | "barra" | "livre" | "polia" | "outro";

export type MuscleGroup =
  | "peito"
  | "costas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "antebraco"
  | "abdomen"
  | "quadriceps"
  | "posterior"
  | "gluteos"
  | "panturrilha"
  | "corpo";

/** Exercício do catálogo de musculação. */
export interface ExerciseDef {
  id: string;
  name: string;
  equipment: Equipment;
  muscle: MuscleGroup;
  notes: string;
  /** Outros músculos que o exercício trabalha (vem da biblioteca). */
  secondary?: MuscleGroup[];
}

export type ExerciseDefDraft = Omit<ExerciseDef, "id">;

/** Um exercício da ficha: o que se pretende fazer. */
export interface PlanItem {
  exerciseId: string;
  sets: number;
  /** Faixa de repetições; iguais quando é um número só. */
  repsMin: number;
  repsMax: number;
  /** Carga alvo em kg; 0 para peso do corpo ou "a definir". */
  weight: number;
  /** Descanso entre séries, em segundos; 0 sem anotação. */
  rest: number;
  notes: string;
}

/** Ficha de treino (Treino A, B, C...). A ordem da lista é a ordem do rodízio. */
export interface Plan {
  id: string;
  name: string;
  notes: string;
  items: PlanItem[];
}

export type PlanDraft = Omit<Plan, "id">;

export type Intensity = "leve" | "moderado" | "forte";

export interface Session {
  id: string;
  modalityId: string;
  /** yyyy-MM-dd */
  date: string;
  /** Duração em minutos. */
  duration: number;
  intensity: Intensity;
  notes: string;
  /** Campos por tipo; ficam zerados ou vazios quando não se aplicam. */
  distance: number;
  rounds: number;
  style: string;
  exercises: Exercise[];
  /** Treino marcado para um dia que ainda não chegou; não entra nas contas até ser feito. */
  planned?: boolean;
  /** Ficha usada neste treino, quando há. */
  planId?: string;
}

export type SessionDraft = Omit<Session, "id">;

export const KIND_LABELS: Record<ModalityKind, string> = {
  strength: "Força (exercícios, séries e carga)",
  fight: "Luta (estilo e rounds)",
  distance: "Distância (corrida, caminhada, natação)",
  dance: "Dança (passos, vídeos e faixas)",
  other: "Outro (só duração)",
};

export const FIGHT_STYLES = ["Muay thai", "Jiu-jitsu", "Boxe", "Judô", "MMA"];

export const TRAINING_ICONS = [
  "🏋️", "🥊", "🥋", "🏃", "🚶", "🏊", "🚴", "🧘",
  "⚽", "🏀", "🎾", "🏐", "🧗", "🤸", "⛹️", "🏄",
  "💃", "🕺",
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: "Máquina",
  halteres: "Halteres",
  barra: "Barra",
  livre: "Livre",
  polia: "Polia",
  outro: "Outro",
};

/** Explicação curta, para o formulário. */
export const EQUIPMENT_HINTS: Record<Equipment, string> = {
  maquina: "Leg press, cadeira extensora, smith",
  halteres: "Anote a carga de cada halter",
  barra: "Barra longa ou W, com as anilhas somadas",
  livre: "Peso do corpo: barra fixa, flexão, paralela",
  polia: "Cabo, crossover, puxador",
  outro: "Kettlebell, elástico, anilha",
};

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  abdomen: "Abdômen",
  quadriceps: "Quadríceps",
  posterior: "Posterior de coxa",
  gluteos: "Glúteos",
  panturrilha: "Panturrilha",
  corpo: "Corpo todo",
};
