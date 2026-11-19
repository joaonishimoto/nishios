export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "urgent" | "high" | "normal" | "low";

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  /** Lista a que a tarefa pertence (Pessoal, Trabalho...). */
  list: string;
  /** Projeto de trabalho; vazio quando a tarefa não é de nenhum projeto. */
  projectId: string;
  /** Posição na fila manual ("Minha ordem"): menor vem primeiro. */
  rank: number;
  /** Prazo em yyyy-MM-dd; vazio quando não tem. */
  due: string;
  createdAt: string;
  /** Data em que foi concluída (yyyy-MM-dd); vazio enquanto está aberta. */
  completedAt: string;
}

export const LISTS = ["Pessoal", "Trabalho", "Casa", "Estudos"];

/** Projeto de trabalho: agrupa tarefas e, se quiser, as horas gastas nele. */
export interface Project {
  id: string;
  name: string;
  icon: string;
  /** Cliente ou empresa; opcional. */
  client: string;
  notes: string;
  /** Valor da hora em reais; 0 quando não se aplica. */
  hourlyRate: number;
  archived: boolean;
  createdAt: string;
}

export type ProjectDraft = Pick<Project, "name" | "icon" | "client" | "notes" | "hourlyRate" | "archived">;

/** Horas trabalhadas num projeto (opcional). */
export interface TimeEntry {
  id: string;
  projectId: string;
  /** Tarefa a que as horas se referem; vazio quando é do projeto em geral. */
  taskId: string;
  date: string;
  minutes: number;
  note: string;
}

export const PROJECT_ICONS = ["💼", "🧑‍💻", "🚀", "📱", "🌐", "🎨", "📊", "🛠️", "📣", "🍰", "🏗️", "📚"];

/** Valor do filtro de projeto na URL para as tarefas sem projeto. */
export const NO_PROJECT = "sem";
