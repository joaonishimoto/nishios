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

/** Em ordem alfabética, para achar rápido na lista. */
export const CATEGORIES = [
  "Comunicação",
  "Criatividade",
  "Dados",
  "Design",
  "Empreendedorismo",
  "Esportes",
  "Finanças",
  "Gestão de projetos",
  "Idiomas",
  "Liderança",
  "Marketing",
  "Negócios",
  "Pessoal",
  "Produtividade",
  "Saúde",
  "Tecnologia",
  "Vendas",
];
