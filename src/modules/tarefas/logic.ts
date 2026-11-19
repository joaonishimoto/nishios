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

/** Ordem manual ("Minha ordem"); empate cai na prioridade. */
export function byRank(a: Task, b: Task): number {
  return a.rank - b.rank || byPriority(a, b);
}

export type TaskSort = "priority" | "manual";

/** "1h30", "45 min", "2h". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Lê uma duração digitada: "1h30", "1:30", "1,5" (horas), "90m", "45 min".
 * Um número sozinho conta como horas. Devolve minutos, ou null quando não entende.
 */
export function parseDuration(text: string): number | null {
  const s = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  let m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^(\d+(?:[.,]\d+)?)h(?:(\d{1,2})(?:m|min)?)?$/);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 60) + Number(m[2] ?? 0);
  m = s.match(/^(\d+)(?:m|min|mins|minutos?)$/);
  if (m) return Number(m[1]);
  m = s.match(/^\d+(?:[.,]\d+)?$/);
  if (m) return Math.round(Number(s.replace(",", ".")) * 60);
  return null;
}
