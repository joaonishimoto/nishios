export type SkillType = "hard" | "soft";
export type SkillStatus = "want" | "learning" | "learned";

export interface Resource {
  id: string;
  title: string;
  /** Link opcional: curso, livro, vídeo... */
  url: string;
  done: boolean;
}

export interface LogEntry {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  text: string;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  category: string;
  status: SkillStatus;
  /** 0 a 5, veja LEVEL_LABELS. */
  level: number;
  notes: string;
  resources: Resource[];
  log: LogEntry[];
  createdAt: string;
}

export const CATEGORIES = [
  "Tecnologia",
  "Negócios",
  "Idiomas",
  "Comunicação",
  "Liderança",
  "Criatividade",
  "Finanças",
  "Pessoal",
];
