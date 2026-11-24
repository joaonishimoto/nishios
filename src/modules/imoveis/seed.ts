import { emptyCosts } from "./logic";
import type { Property } from "./types";

/** Id do apartamento que já tem a planta em 3D (a antiga página Casa). */
export const MAIN_ID = "apartamento";

/**
 * O apartamento da planta. Existe sempre: enquanto ninguém mexe nele, vem daqui, e na
 * primeira edição ganha a chave própria. Os números financeiros começam em branco.
 */
export function mainProperty(): Property {
  return {
    id: MAIN_ID,
    name: "Apartamento",
    icon: "🏢",
    kind: "apartamento",
    situation: "mora",
    address: "",
    area: 0,
    purchaseDate: "",
    purchasePrice: 0,
    values: [],
    costs: emptyCosts(),
    plan: "apartamento",
    notes: "",
    createdAt: "2026-11-18",
  };
}
