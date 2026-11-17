import { sub, type Duration } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Pet } from "./types";

export function seedPets(): Pet[] {
  const now = today();
  const ago = (d: Duration) => toISO(sub(now, d));

  return [
    {
      id: "pet-mel",
      name: "Mel",
      icon: "🐶",
      species: "Cachorro",
      breed: "Golden retriever",
      birthday: ago({ years: 4, months: 2 }),
      notes: "Alérgica a frango. Ração de cordeiro, 320 g por dia.",
      cares: [
        { id: "c1", name: "Vacina antirrábica", lastDate: ago({ months: 13 }), intervalMonths: 12, notes: "" },
        { id: "c2", name: "Vacina V10", lastDate: ago({ months: 11, days: 20 }), intervalMonths: 12, notes: "" },
        { id: "c3", name: "Vermífugo", lastDate: ago({ months: 1, days: 5 }), intervalMonths: 3, notes: "Um comprimido para 30 kg." },
        { id: "c4", name: "Antipulgas", lastDate: ago({ days: 20 }), intervalMonths: 1, notes: "" },
        { id: "c5", name: "Vacina da gripe", lastDate: "", intervalMonths: 12, notes: "" },
      ],
      health: [
        { id: "h1", date: ago({ days: 6 }), kind: "Problema de saúde", title: "Otite no ouvido direito", notes: "Pingar o remédio 2 vezes por dia, por 10 dias. Retorno marcado.", ongoing: true },
        { id: "h2", date: ago({ months: 4 }), kind: "Consulta", title: "Consulta de rotina", notes: "Dra. Paula. Tudo certo, pediu para controlar o peso.", ongoing: false },
        { id: "h3", date: ago({ months: 9 }), kind: "Exame", title: "Hemograma e ultrassom", notes: "Sem alterações.", ongoing: false },
        { id: "h4", date: ago({ years: 3, months: 4 }), kind: "Cirurgia", title: "Castração", notes: "", ongoing: false },
      ],
      weights: [
        { id: "w1", date: ago({ days: 6 }), kg: 28.4 },
        { id: "w2", date: ago({ months: 4 }), kg: 29.6 },
        { id: "w3", date: ago({ months: 9 }), kg: 28.9 },
        { id: "w4", date: ago({ years: 1, months: 4 }), kg: 27.8 },
      ],
    },
    {
      id: "pet-thor",
      name: "Thor",
      icon: "🐱",
      species: "Gato",
      breed: "Sem raça definida",
      birthday: ago({ years: 2, months: 1 }),
      notes: "Só bebe água da fonte. Arisco com visitas.",
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
        { id: "w5", date: ago({ months: 5 }), kg: 4.6 },
        { id: "w6", date: ago({ years: 1 }), kg: 4.1 },
      ],
    },
  ];
}
