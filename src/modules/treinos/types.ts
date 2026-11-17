/**
 * O tipo da modalidade decide quais campos um treino tem:
 * - strength: lista de exercícios com séries, repetições e carga
 * - fight: estilo e rounds
 * - distance: distância, de onde sai o ritmo
 * - other: só duração e intensidade
 */
export type ModalityKind = "strength" | "fight" | "distance" | "other";
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

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  /** Carga em kg; 0 para peso do corpo. */
  weight: number;
}

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
}

export type SessionDraft = Omit<Session, "id">;

export const KIND_LABELS: Record<ModalityKind, string> = {
  strength: "Força (exercícios, séries e carga)",
  fight: "Luta (estilo e rounds)",
  distance: "Distância (corrida, caminhada, natação)",
  other: "Outro (só duração)",
};

export const FIGHT_STYLES = ["Muay thai", "Jiu-jitsu", "Boxe", "Judô", "MMA"];

export const TRAINING_ICONS = [
  "🏋️", "🥊", "🥋", "🏃", "🚶", "🏊", "🚴", "🧘",
  "⚽", "🏀", "🎾", "🏐", "🧗", "🤸", "⛹️", "🏄",
];
