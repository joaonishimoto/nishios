import { sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { DanceLevel, DanceStep } from "./types";

/** Id da modalidade de dança de exemplo (e da que entra para quem ainda não tinha). */
export const DANCE_MODALITY_ID = "m-danca";

/** Alguns passos de exemplo, com a evolução de faixa ao longo das últimas semanas. */
export function seedSteps(): DanceStep[] {
  const now = today();
  const day = (ago: number) => toISO(sub(now, { days: ago }));
  let n = 0;
  const id = () => `ds${++n}`;
  const path = (...items: [number, DanceLevel, string?][]) =>
    items.map(([ago, level, note]) => ({ id: id(), date: day(ago), level, note: note ?? "" }));

  return [
    {
      id: "step-basico",
      modalityId: DANCE_MODALITY_ID,
      name: "Passo básico",
      category: "Básicos",
      videos: [
        { id: id(), title: "Aulas de passo básico no YouTube", source: "link", url: "https://www.youtube.com/results?search_query=passo+b%C3%A1sico+dan%C3%A7a+de+sal%C3%A3o", addedAt: day(40) },
      ],
      tips: [
        { id: id(), text: "Conte 1, 2, 3, pausa. O peso troca de pé a cada tempo." },
        { id: id(), text: "Joelhos soltos; quem trava o joelho perde o balanço." },
      ],
      history: path([40, "transparente"], [30, "branco"], [18, "azul", "Já sai sem pensar na contagem."], [4, "roxo"]),
      createdAt: day(40),
    },
    {
      id: "step-giro",
      modalityId: DANCE_MODALITY_ID,
      name: "Giro simples",
      category: "Giros",
      videos: [],
      tips: [{ id: id(), text: "Olhe para um ponto fixo e vire a cabeça por último." }],
      history: path([25, "transparente"], [12, "branco", "Ainda perco o equilíbrio no fim."]),
      createdAt: day(25),
    },
    {
      id: "step-cruzado",
      modalityId: DANCE_MODALITY_ID,
      name: "Cruzado",
      category: "Básicos",
      videos: [],
      tips: [],
      history: path([20, "transparente"], [9, "branco"], [2, "azul"]),
      createdAt: day(20),
    },
    {
      id: "step-giro-duplo",
      modalityId: DANCE_MODALITY_ID,
      name: "Giro duplo",
      category: "Giros",
      videos: [],
      tips: [],
      history: [],
      createdAt: day(6),
    },
  ];
}
