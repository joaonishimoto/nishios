export type SourceId =
  | "eventos"
  | "tarefas"
  | "rotina"
  | "compromissos"
  | "treinos"
  | "corpo"
  | "pessoas"
  | "pets"
  | "bens"
  | "skills"
  | "financas"
  | "iphone";

export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

/** Evento criado no NishiOS ou trazido do calendário do iPhone. */
export interface CalEvent {
  id: string;
  title: string;
  /** Primeiro dia, em yyyy-MM-dd. */
  date: string;
  /** Último dia (inclusive) quando dura mais de um dia; vazio quando é um dia só. */
  endDate: string;
  allDay: boolean;
  /** HH:mm; só valem quando não é o dia todo. */
  start: string;
  end: string;
  location: string;
  notes: string;
  repeat: Repeat;
  /** A cada quantos períodos repete (1 = toda semana, 2 = a cada duas...). */
  interval: number;
  /** Último dia da repetição; vazio = sem fim. */
  until: string;
  origin: "nishios" | "iphone";
  /** Pessoas que estão no evento (ids de Pessoas). */
  personIds?: string[];
}

export type EventDraft = Omit<CalEvent, "id" | "origin">;

export type ItemState = "planned" | "done" | "overdue";

/** Uma linha do calendário, venha de onde vier. */
export interface CalItem {
  /** Único por ocorrência. */
  key: string;
  source: SourceId;
  /** yyyy-MM-dd */
  date: string;
  title: string;
  icon?: string;
  /** HH:mm, quando tem hora marcada. */
  time?: string;
  endTime?: string;
  state: ItemState;
  /** Frase curta de apoio: de onde vem, detalhes. */
  note?: string;
  location?: string;
  /** Rota do item no módulo de origem. */
  to?: string;
  /** Preenchidos quando dá para agir direto do calendário. */
  eventId?: string;
  taskId?: string;
  /** Para a exportação: itens da mesma série viram um evento só, com repetição. */
  series?: { id: string; repeat: Exclude<Repeat, "none">; interval: number; until?: string; start: string; days: number };
}
