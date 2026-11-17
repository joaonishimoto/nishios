import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Tone } from "@/components/ui/Badge";
import { shortDate, today } from "@/lib/dates";
import type { Priority, Task, TaskStatus } from "./types";

/** Ordem em que os grupos aparecem: o que está em andamento vem primeiro. */
export const STATUS_ORDER: TaskStatus[] = ["doing", "todo", "done"];

export const STATUS_META: Record<TaskStatus, { label: string; tone: Tone }> = {
  doing: { label: "Em andamento", tone: "info" },
  todo: { label: "A fazer", tone: "neutral" },
  done: { label: "Concluídas", tone: "success" },
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "normal", "low"];

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "text-danger" },
  high: { label: "Alta", className: "text-warning" },
  normal: { label: "Normal", className: "text-info" },
  low: { label: "Baixa", className: "text-subtle-foreground" },
};

export interface DueInfo {
  label: string;
  /** Dias até o prazo; negativo quando já passou. */
  days: number;
  overdue: boolean;
  isToday: boolean;
}

export function dueInfo(task: Pick<Task, "due" | "status">, now: Date = today()): DueInfo | null {
  if (!task.due) return null;
  const days = differenceInCalendarDays(parseISO(task.due), now);
  const label =
    days === 0 ? "Hoje" : days === 1 ? "Amanhã" : days === -1 ? "Ontem" : shortDate(task.due, now);
  const open = task.status !== "done";
  return { label, days, overdue: open && days < 0, isToday: open && days === 0 };
}

/** Prioridade primeiro, depois o prazo mais próximo; sem prazo vai para o fim. */
export function byPriority(a: Task, b: Task): number {
  const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  if (p !== 0) return p;
  if (a.due !== b.due) return (a.due || "9999").localeCompare(b.due || "9999");
  return a.createdAt.localeCompare(b.createdAt);
}

/** Concluídas: a mais recente primeiro. */
export function byCompletion(a: Task, b: Task): number {
  return b.completedAt.localeCompare(a.completedAt);
}

/** Tarefas abertas que vencem hoje ou já venceram. */
export function needsAttention(task: Task, now: Date = today()): boolean {
  const d = dueInfo(task, now);
  return !!d && (d.overdue || d.isToday);
}
