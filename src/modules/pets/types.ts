/** Vacina ou cuidado que se repete: vermífugo, antipulgas, banho... */
export interface Care {
  id: string;
  name: string;
  /** Última vez em yyyy-MM-dd; vazio quando nunca foi feito. */
  lastDate: string;
  /** De quantos em quantos meses repete; 0 = dose única. */
  intervalMonths: number;
  notes: string;
}

export type HealthKind = "Consulta" | "Problema de saúde" | "Exame" | "Cirurgia" | "Outro";
export const HEALTH_KINDS: HealthKind[] = ["Consulta", "Problema de saúde", "Exame", "Cirurgia", "Outro"];

export interface HealthRecord {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  kind: HealthKind;
  title: string;
  notes: string;
  /** Só faz sentido para problemas de saúde: ainda está em tratamento? */
  ongoing: boolean;
}

export interface Weight {
  id: string;
  date: string;
  kg: number;
}

export interface Pet {
  id: string;
  name: string;
  icon: string;
  species: string;
  breed: string;
  /** Nascimento em yyyy-MM-dd; vazio quando não se sabe. */
  birthday: string;
  notes: string;
  cares: Care[];
  health: HealthRecord[];
  weights: Weight[];
}

export type PetDraft = Pick<Pet, "name" | "icon" | "species" | "breed" | "birthday" | "notes">;

export const PET_ICONS = ["🐶", "🐱", "🐰", "🐹", "🐦", "🐢", "🐠", "🐴"];
export const SPECIES = ["Cachorro", "Gato", "Coelho", "Roedor", "Ave", "Réptil", "Peixe", "Outro"];

export const CARE_INTERVALS: { value: number; label: string }[] = [
  { value: 0, label: "Dose única" },
  { value: 1, label: "Todo mês" },
  { value: 3, label: "A cada 3 meses" },
  { value: 6, label: "A cada 6 meses" },
  { value: 12, label: "Todo ano" },
  { value: 36, label: "A cada 3 anos" },
];
