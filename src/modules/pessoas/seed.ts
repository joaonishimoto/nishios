import { add, sub, subYears } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Interaction, InteractionType, Person } from "./types";

export function seedPeople(): Person[] {
  const now = today();
  /** Aniversário daqui a `inDays` dias, de alguém que vai fazer `age` anos. */
  const bday = (inDays: number, age: number) => toISO(subYears(add(now, { days: inDays }), age));
  let n = 0;
  const met = (daysAgo: number, type: InteractionType, note = ""): Interaction => ({
    id: `i${++n}`,
    date: toISO(sub(now, { days: daysAgo })),
    type,
    note,
  });
  const base = { city: "", phone: "", notes: "", birthday: "" };

  return [
    {
      ...base, id: "p1", name: "Helena Nishimoto", group: "Família", context: "Mãe",
      city: "Londrina", birthday: bday(5, 58), contactEvery: 7,
      notes: "Gosta de orquídeas. Presente: vaso novo para a varanda.",
      interactions: [met(9, "Ligação", "Contou da reforma da cozinha."), met(17, "Encontro", "Almoço de domingo."), met(24, "Ligação")],
    },
    {
      ...base, id: "p2", name: "Lucas Nishimoto", group: "Família", context: "Irmão",
      city: "Curitiba", birthday: bday(142, 27), contactEvery: 14,
      interactions: [met(4, "Mensagem", "Combinamos o Natal em Londrina."), met(20, "Ligação")],
    },
    {
      ...base, id: "p3", name: "Rafael Souza", group: "Amigos", context: "Amigo da faculdade",
      city: "São Paulo", birthday: bday(23, 30), contactEvery: 30,
      notes: "Vai viajar comigo em janeiro.",
      interactions: [met(41, "Encontro", "Churrasco na casa dele."), met(80, "Mensagem")],
    },
    {
      ...base, id: "p4", name: "Marina Costa", group: "Amigos", context: "Amiga do muay thai",
      birthday: bday(260, 29), contactEvery: 30,
      interactions: [met(26, "Encontro", "Treino de sábado.")],
    },
    {
      ...base, id: "p5", name: "Pedro Almeida", group: "Trabalho", context: "Sócio nos projetos de site",
      phone: "(43) 99999-0101", contactEvery: 14,
      interactions: [met(3, "Ligação", "Alinhamos a proposta da confeitaria."), met(12, "Encontro")],
    },
    {
      ...base, id: "p6", name: "Carla Mendes", group: "Trabalho", context: "Cliente, dona da confeitaria",
      birthday: bday(75, 41), contactEvery: 30,
      notes: "Prefere falar por áudio. Fecha o caixa às 19h.",
      interactions: [met(28, "Mensagem", "Enviei as opções de pacote.")],
    },
    {
      ...base, id: "p7", name: "Thiago Ramos", group: "Networking", context: "Dev que conheci no meetup de React",
      city: "Maringá", contactEvery: 90,
      interactions: [met(118, "Encontro", "Conversamos sobre freelas em dupla.")],
    },
    {
      ...base, id: "p8", name: "Juliana Prado", group: "Networking", context: "Designer, indicação do Pedro",
      contactEvery: 60,
      interactions: [],
    },
    {
      ...base, id: "p9", name: "Seu Antônio", group: "Família", context: "Avô",
      city: "Londrina", birthday: bday(310, 84), contactEvery: 0,
      interactions: [met(17, "Encontro", "Almoço de domingo.")],
    },
  ];
}
