import { forwardRef, useState } from "react";
import { CalendarDays, Flag, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";
import { dueInfo, PRIORITY_META } from "./logic";
import { useTasks } from "./store";
import type { Priority, Task, TaskStatus } from "./types";

export function TaskCheck({ task, size }: { task: Task; size?: "md" | "lg" }) {
  const { setStatus } = useTasks();
  const done = task.status === "done";
  return (
    <Checkbox
      size={size}
      checked={done}
      onChange={(c) => setStatus(task.id, c ? "done" : "todo")}
      label={done ? `Reabrir: ${task.title}` : `Concluir: ${task.title}`}
    />
  );
}

export function PriorityFlag({ priority, showLabel }: { priority: Priority; showLabel?: boolean }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Flag
        className={cn("size-3.5 shrink-0", meta.className)}
        fill={priority === "low" ? "none" : "currentColor"}
        aria-hidden
      />
      {showLabel ? meta.label : <span className="sr-only">Prioridade {meta.label}</span>}
    </span>
  );
}

export function DueLabel({ task, className }: { task: Task; className?: string }) {
  const due = dueInfo(task);
  if (!due) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        due.overdue
          ? "font-medium text-danger-strong"
          : due.isToday
            ? "font-medium text-warning-strong"
            : "text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      {due.label}
      {due.overdue && <span className="sr-only">(atrasada)</span>}
    </span>
  );
}

/** Campo "Adicionar tarefa": digite e aperte Enter. */
export const QuickAdd = forwardRef<
  HTMLInputElement,
  { status: TaskStatus; list?: string; projectId?: string; className?: string }
>(({ status, list, projectId, className }, ref) => {
  const { create } = useTasks();
  const [title, setTitle] = useState("");

  return (
    <form
      className={cn("flex items-center gap-3 px-3", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (!clean) return;
        create({ title: clean, status, ...(projectId ? { projectId } : {}), ...(list ? { list } : {}) });
        setTitle("");
      }}
    >
      <Plus className="size-[1.125rem] shrink-0 text-subtle-foreground" aria-hidden />
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Adicionar tarefa"
        aria-label="Adicionar tarefa"
        enterKeyHint="done"
        className="h-10 min-w-0 flex-1 bg-transparent text-base placeholder:text-subtle-foreground focus:outline-none"
      />
      {title.trim() && (
        <span className="hidden shrink-0 text-xs text-subtle-foreground sm:block">
          Enter para adicionar
        </span>
      )}
    </form>
  );
});
QuickAdd.displayName = "QuickAdd";
