/**
 * Aprendizado de passos de dança. O progresso não é carga: é a sua própria nota de
 * quão bem você faz cada passo, em faixas, da primeira à última:
 * Não aprendi → Transparente → Branco → Azul → Roxo → Preto → Vermelho.
 */
export type DanceLevel = "nao" | "transparente" | "branco" | "azul" | "roxo" | "preto" | "vermelho";

export const LEVEL_ORDER: DanceLevel[] = ["nao", "transparente", "branco", "azul", "roxo", "preto", "vermelho"];

/** Cada vez que você muda a faixa de um passo, fica um registro com a data. */
export interface LevelChange {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  level: DanceLevel;
  note: string;
}

/**
 * Vídeo do passo. "link" é um endereço (YouTube, Instagram, TikTok, Vimeo...);
 * "upload" é um arquivo enviado do aparelho, guardado no Supabase Storage com login
 * ou só neste navegador sem login (veja lib/videos.ts).
 */
export interface StepVideo {
  id: string;
  title: string;
  source: "link" | "upload";
  /** Link: o endereço. Upload: a referência do arquivo guardado. */
  url: string;
  addedAt: string;
}

export interface StepTip {
  id: string;
  text: string;
}

export interface DanceStep {
  id: string;
  /** A modalidade de dança a que o passo pertence. */
  modalityId: string;
  name: string;
  /** Estilo ou grupo do passo: "Básicos", "Giros", "Samba de gafieira"... */
  category: string;
  videos: StepVideo[];
  tips: StepTip[];
  /** Do mais antigo para o mais novo. Sem registros, o passo está em "Não aprendi". */
  history: LevelChange[];
  createdAt: string;
}
