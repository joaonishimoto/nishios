export type MeasureId =
  | "pescoco"
  | "ombros"
  | "peito"
  | "braco"
  | "antebraco"
  | "cintura"
  | "abdomen"
  | "quadril"
  | "coxa"
  | "panturrilha";

/** O que dá para acompanhar no gráfico: peso, gordura ou uma medida. */
export type Metric = "peso" | "gordura" | MeasureId;

/** Um dia de medição. Só o que foi medido naquele dia fica preenchido. */
export interface Entry {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** Peso em kg; 0 quando não foi medido. */
  weight: number;
  /** Percentual de gordura; 0 quando não foi medido. */
  bodyFat: number;
  /** Medidas em centímetros. */
  measures: Partial<Record<MeasureId, number>>;
  notes: string;
}

export type EntryDraft = Omit<Entry, "id">;

export interface Profile {
  /** Altura em cm; 0 quando não informada. */
  height: number;
}

export interface MeasureMeta {
  id: MeasureId;
  label: string;
  /** Como medir, para o formulário. */
  how: string;
  /** Na silhueta: de que lado fica a etiqueta, a altura dela e o ponto no corpo (viewBox 340 x 460, centro em x=170). */
  side: "left" | "right";
  labelY: number;
  dot: [number, number];
}

export const MEASURES: MeasureMeta[] = [
  { id: "pescoco", label: "Pescoço", how: "Logo abaixo do pomo de adão", side: "right", labelY: 58, dot: [177, 67] },
  { id: "ombros", label: "Ombros", how: "Na parte mais larga, de ponta a ponta", side: "left", labelY: 84, dot: [124, 88] },
  { id: "peito", label: "Peito", how: "Na altura dos mamilos, depois de soltar o ar", side: "right", labelY: 108, dot: [190, 118] },
  { id: "braco", label: "Braço", how: "No meio do bíceps, contraído", side: "left", labelY: 134, dot: [113, 138] },
  { id: "antebraco", label: "Antebraço", how: "Na parte mais grossa", side: "right", labelY: 160, dot: [230, 190] },
  { id: "cintura", label: "Cintura", how: "Na parte mais fina do tronco", side: "left", labelY: 184, dot: [140, 172] },
  { id: "abdomen", label: "Abdômen", how: "Na altura do umbigo", side: "right", labelY: 212, dot: [184, 196] },
  { id: "quadril", label: "Quadril", how: "Na parte mais larga dos glúteos", side: "left", labelY: 234, dot: [134, 224] },
  { id: "coxa", label: "Coxa", how: "No meio da coxa", side: "right", labelY: 272, dot: [199, 272] },
  { id: "panturrilha", label: "Panturrilha", how: "Na parte mais grossa", side: "left", labelY: 352, dot: [141, 352] },
];

export const MEASURE: Record<MeasureId, MeasureMeta> = Object.fromEntries(
  MEASURES.map((m) => [m.id, m]),
) as Record<MeasureId, MeasureMeta>;
