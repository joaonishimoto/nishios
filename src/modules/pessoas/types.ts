export type InteractionType = "Mensagem" | "Ligação" | "Encontro" | "Outro";

export const INTERACTION_TYPES: InteractionType[] = ["Mensagem", "Ligação", "Encontro", "Outro"];

export interface Interaction {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  type: InteractionType;
  note: string;
}

export interface Person {
  id: string;
  name: string;
  group: string;
  /** Quem é a pessoa para você: "Sócio na agência", "Amigo da faculdade"... */
  context: string;
  city: string;
  phone: string;
  /** Aniversário em yyyy-MM-dd; vazio quando não se sabe. */
  birthday: string;
  /** De quantos em quantos dias quer manter contato; 0 = sem lembrete. */
  contactEvery: number;
  notes: string;
  /** Contatos registrados, do mais recente para o mais antigo. */
  interactions: Interaction[];
}

export type PersonDraft = Omit<Person, "id" | "interactions">;

export const GROUPS = ["Família", "Amigos", "Trabalho", "Networking"];

export const CONTACT_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "Sem lembrete" },
  { value: 7, label: "Toda semana" },
  { value: 14, label: "A cada 2 semanas" },
  { value: 30, label: "Todo mês" },
  { value: 60, label: "A cada 2 meses" },
  { value: 90, label: "A cada 3 meses" },
  { value: 180, label: "A cada 6 meses" },
  { value: 365, label: "Todo ano" },
];
