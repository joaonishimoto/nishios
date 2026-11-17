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
  /** Prazo em yyyy-MM-dd; vazio quando não tem. */
  due: string;
  createdAt: string;
  /** Data em que foi concluída (yyyy-MM-dd); vazio enquanto está aberta. */
  completedAt: string;
}

export const LISTS = ["Pessoal", "Trabalho", "Casa", "Estudos"];
