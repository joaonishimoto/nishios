import { sub, type Duration } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Pet } from "./types";

export function seedPets(): Pet[] {
  const now = today();
  const ago = (d: Duration) => toISO(sub(now, d));

  return [
    {
      id: "pet-maki",
      name: "Maki",
      icon: "🐱",
      species: "Gato",
      breed: "Sem raça definida",
      birthday: ago({ years: 3, months: 2 }),
      notes: "Branca com as costas cinza. Ração úmida de manhã e seca à noite.",
      cares: [
        { id: "c1", name: "Vacina antirrábica", lastDate: ago({ months: 13 }), intervalMonths: 12, notes: "" },
        { id: "c2", name: "Vacina V4", lastDate: ago({ months: 11, days: 20 }), intervalMonths: 12, notes: "" },
        { id: "c3", name: "Vermífugo", lastDate: ago({ months: 2, days: 5 }), intervalMonths: 6, notes: "" },
        { id: "c4", name: "Antipulgas", lastDate: ago({ days: 20 }), intervalMonths: 1, notes: "" },
      ],
      health: [
        { id: "h1", date: ago({ days: 6 }), kind: "Problema de saúde", title: "Otite no ouvido direito", notes: "Pingar o remédio 2 vezes por dia, por 10 dias. Retorno marcado.", ongoing: true },
        { id: "h2", date: ago({ months: 4 }), kind: "Consulta", title: "Consulta de rotina", notes: "Tudo certo, pediu para controlar o peso.", ongoing: false },
        { id: "h3", date: ago({ months: 9 }), kind: "Exame", title: "Hemograma e ultrassom", notes: "Sem alterações.", ongoing: false },
        { id: "h4", date: ago({ years: 2, months: 6 }), kind: "Cirurgia", title: "Castração", notes: "", ongoing: false },
      ],
      weights: [
        { id: "w1", date: ago({ days: 6 }), kg: 4.3 },
        { id: "w2", date: ago({ months: 4 }), kg: 4.5 },
        { id: "w3", date: ago({ months: 9 }), kg: 4.2 },
        { id: "w4", date: ago({ years: 1, months: 4 }), kg: 3.9 },
        { id: "w4b", date: ago({ years: 2 }), kg: 3.4 },
      ],
    },
    {
      id: "pet-gojo",
      name: "Gojo",
      icon: "🐈",
      species: "Gato",
      breed: "Sem raça definida",
      birthday: ago({ years: 2, months: 1 }),
      notes: "Branco com manchas alaranjadas. Só bebe água da fonte e é arisco com visitas.",
      cares: [
        { id: "c6", name: "Vacina V4", lastDate: ago({ months: 5 }), intervalMonths: 12, notes: "" },
        { id: "c7", name: "Vacina antirrábica", lastDate: ago({ months: 5 }), intervalMonths: 12, notes: "" },
        { id: "c8", name: "Vermífugo", lastDate: ago({ months: 5, days: 22 }), intervalMonths: 6, notes: "" },
      ],
      health: [
        { id: "h5", date: ago({ months: 5 }), kind: "Consulta", title: "Consulta de rotina", notes: "Vacinas em dia.", ongoing: false },
        { id: "h6", date: ago({ years: 1, months: 6 }), kind: "Cirurgia", title: "Castração", notes: "", ongoing: false },
      ],
      weights: [
        { id: "w5", date: ago({ months: 5 }), kg: 4.9 },
        { id: "w6", date: ago({ years: 1 }), kg: 4.4 },
        { id: "w7", date: ago({ years: 1, months: 7 }), kg: 3.6 },
      ],
    },
  ];
}

/**
 * Quem ainda tem só os pets do exemplo antigo (Mel e Thor, intocados nos nomes)
 * passa a ver os gatos da casa. Qualquer outra lista fica como está.
 */
export function migratePets(stored: Pet[]): Pet[] {
  const old = stored.length === 2 && stored.every((p) => (p.id === "pet-mel" && p.name === "Mel") || (p.id === "pet-thor" && p.name === "Thor"));
  return old ? seedPets() : stored;
}

/** Pets que também aparecem andando pela Casa em 3D. */
export const PETS_IN_HOUSE = ["pet-maki", "pet-gojo"];
