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
  /**
   * Na silhueta (viewBox 360 x 470, centro em x=0): de que lado fica a etiqueta e a
   * altura dela, e a fita métrica no corpo (centro x, altura y e meia largura hw).
   */
  side: "left" | "right";
  labelY: number;
  tape: { x: number; y: number; hw: number };
}

export const MEASURES: MeasureMeta[] = [
  { id: "pescoco", label: "Pescoço", how: "Logo abaixo do pomo de adão", side: "right", labelY: 66, tape: { x: 0, y: 70, hw: 10.5 } },
  { id: "ombros", label: "Ombros", how: "Na parte mais larga, de ponta a ponta", side: "left", labelY: 98, tape: { x: 0, y: 102, hw: 57 } },
  { id: "peito", label: "Peito", how: "Na altura dos mamilos, depois de soltar o ar", side: "right", labelY: 120, tape: { x: 0, y: 128, hw: 38.5 } },
  { id: "braco", label: "Braço", how: "No meio do bíceps, contraído", side: "left", labelY: 146, tape: { x: -52.5, y: 142, hw: 8.5 } },
  { id: "cintura", label: "Cintura", how: "Na parte mais fina do tronco", side: "right", labelY: 168, tape: { x: 0, y: 172, hw: 33 } },
  { id: "antebraco", label: "Antebraço", how: "Na parte mais grossa", side: "left", labelY: 194, tape: { x: -57.5, y: 194, hw: 8.5 } },
  { id: "abdomen", label: "Abdômen", how: "Na altura do umbigo", side: "right", labelY: 216, tape: { x: 0, y: 198, hw: 34.5 } },
  { id: "quadril", label: "Quadril", how: "Na parte mais larga dos glúteos", side: "left", labelY: 242, tape: { x: 0, y: 230, hw: 38.5 } },
  { id: "coxa", label: "Coxa", how: "No meio da coxa", side: "left", labelY: 290, tape: { x: -21, y: 286, hw: 16.5 } },
  { id: "panturrilha", label: "Panturrilha", how: "Na parte mais grossa", side: "right", labelY: 372, tape: { x: 22, y: 372, hw: 10 } },
];

export const MEASURE: Record<MeasureId, MeasureMeta> = Object.fromEntries(
  MEASURES.map((m) => [m.id, m]),
) as Record<MeasureId, MeasureMeta>;
