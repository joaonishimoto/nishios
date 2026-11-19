import { DANCE_MODALITY_ID } from "./seed";
import type { Modality } from "../types";

const STEPS_KEY = "nishios:treinos:passos:v1";

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Quem já usava o app antes dos passos de dança ganha a modalidade uma vez só:
 * uma "Dança" que já existia passa a ser do tipo dança; se não havia, ela entra.
 * Depois que a lista de passos existe, não mexe mais (excluir a modalidade vale).
 */
export function ensureDance(list: Modality[]): Modality[] {
  try {
    if (localStorage.getItem(STEPS_KEY) !== null) return list;
  } catch {
    return list;
  }
  if (list.some((m) => m.kind === "dance")) return list;
  const named = list.find((m) => plain(m.name).includes("danc"));
  if (named) return list.map((m) => (m === named ? { ...m, kind: "dance" } : m));
  return [...list, { id: DANCE_MODALITY_ID, name: "Dança", icon: "💃", kind: "dance", unit: "km" }];
}
