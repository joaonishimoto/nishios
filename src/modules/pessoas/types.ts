export type InteractionType = "Mensagem" | "Ligação" | "Encontro" | "Outro";

export const INTERACTION_TYPES: InteractionType[] = ["Mensagem", "Ligação", "Encontro", "Outro"];

export interface Interaction {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  type: InteractionType;
  note: string;
  /** Presente quando o contato veio de um evento do calendário; não é salvo com a pessoa. */
  eventId?: string;
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
  /** Presentes dados e recebidos. Pessoas antigas podem não ter. */
  gifts?: Gift[];
  /** Dinheiro emprestado nos dois sentidos. */
  loans?: Loan[];
  /** Gostos, tamanhos, alergias e outras informações úteis. */
  profile?: Profile;
}

export type PersonDraft = Omit<Person, "id" | "interactions" | "gifts" | "loans" | "profile">;

/* ---------- Presentes ---------- */

/** "dei" = eu dei para a pessoa; "recebi" = a pessoa me deu. */
export type GiftDirection = "dei" | "recebi";

export interface Gift {
  id: string;
  direction: GiftDirection;
  /** yyyy-MM-dd */
  date: string;
  item: string;
  /** Quanto custou, em reais; vazio quando não se sabe. */
  value?: number;
  occasion: string;
  note: string;
}

export const OCCASIONS = [
  "Aniversário",
  "Natal",
  "Amigo secreto",
  "Dia das Mães",
  "Dia dos Pais",
  "Dia dos Namorados",
  "Casamento",
  "Formatura",
  "Viagem",
  "Sem motivo",
];

/* ---------- Empréstimos ---------- */

/** "emprestei" = a pessoa me deve; "peguei" = eu devo para a pessoa. */
export type LoanDirection = "emprestei" | "peguei";

export interface LoanPayment {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  amount: number;
}

export interface Loan {
  id: string;
  direction: LoanDirection;
  /** yyyy-MM-dd */
  date: string;
  amount: number;
  /** Para que foi: "Conserto do carro", "Ingresso do show"... */
  description: string;
  /** Combinado para devolver até; vazio quando não tem prazo. */
  dueDate: string;
  /** Devoluções, parciais ou totais. */
  payments: LoanPayment[];
  /** Perdoado: não conta mais no saldo. */
  forgiven?: boolean;
}

/* ---------- Gostos e informações ---------- */

export interface GiftIdea {
  id: string;
  text: string;
  /** Preço aproximado, em reais. */
  price?: number;
  link: string;
}

export interface Profile {
  likes: string;
  dislikes: string;
  hobbies: string;
  food: string;
  drinks: string;
  favorites: string;
  allergies: string;
  shirtSize: string;
  pantsSize: string;
  shoeSize: string;
  ringSize: string;
  partner: string;
  children: string;
  pets: string;
  work: string;
  email: string;
  instagram: string;
  address: string;
  pixKey: string;
  ideas: GiftIdea[];
}

export const EMPTY_PROFILE: Profile = {
  likes: "",
  dislikes: "",
  hobbies: "",
  food: "",
  drinks: "",
  favorites: "",
  allergies: "",
  shirtSize: "",
  pantsSize: "",
  shoeSize: "",
  ringSize: "",
  partner: "",
  children: "",
  pets: "",
  work: "",
  email: "",
  instagram: "",
  address: "",
  pixKey: "",
  ideas: [],
};

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
