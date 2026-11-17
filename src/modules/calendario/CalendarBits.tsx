import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";
import { useTasks } from "@/modules/tarefas/store";
import { timeLabel } from "./events";
import { SOURCE } from "./sources";
import type { CalItem, SourceId } from "./types";

/** Define --c com a cor da origem; os filhos usam var(--c). */
export const sourceColor = (source: SourceId) => ({ "--c": SOURCE[source].color }) as CSSProperties;

/**
 * A etiqueta de um item dentro do dia. A forma diz o estado:
 * preenchida = ainda vem pela frente, vazada = já aconteceu, vermelha = atrasada.
 */
export function Chip({ item, wrap }: { item: CalItem; wrap?: boolean }) {
  const overdue = item.state === "overdue";
  const done = item.state === "done";
  return (
    <span
      style={sourceColor(item.source)}
      className={cn(
        "flex min-w-0 gap-x-1 rounded-sm border-l-[3px] px-1.5 py-[3px] text-left text-xs leading-tight",
        wrap ? "flex-col" : "items-baseline",
        overdue
          ? "border-danger bg-danger-soft font-medium text-danger-strong"
          : done
            ? "border-[color-mix(in_srgb,var(--c)_45%,transparent)] text-muted-foreground"
            : "border-(--c) bg-[color-mix(in_srgb,var(--c)_13%,var(--surface))] text-foreground",
      )}
    >
      {item.time && <span className="shrink-0 tabular-nums text-muted-foreground">{item.time}</span>}
      <span className={cn("min-w-0", wrap ? "line-clamp-2" : "truncate")}>
        {item.icon && <span className="mr-1">{item.icon}</span>}
        {item.title}
      </span>
    </span>
  );
}

/** Bolinha da origem, para o calendário compacto do celular. */
export function SourceDot({ item }: { item: CalItem }) {
  return (
    <span
      style={sourceColor(item.source)}
      className={cn(
        "size-1.5 rounded-full",
        item.state === "overdue"
          ? "bg-danger"
          : item.state === "done"
            ? "bg-[color-mix(in_srgb,var(--c)_45%,transparent)]"
            : "bg-(--c)",
      )}
    />
  );
}

/** Anel com a parte dos hábitos do dia que foi cumprida. */
export function HabitRing({ done, total, className }: { done: number; total: number; className?: string }) {
  const r = 5;
  const circumference = 2 * Math.PI * r;
  const complete = done >= total;
  return (
    <svg
      viewBox="0 0 14 14"
      role="img"
      aria-label={`${done} de ${total} hábitos feitos`}
      className={cn("size-3.5 -rotate-90", className)}
    >
      <title>{`${done} de ${total} hábitos feitos`}</title>
      <circle cx="7" cy="7" r={r} fill="none" strokeWidth="2" className="stroke-border-strong" />
      {done > 0 && (
        <circle
          cx="7"
          cy="7"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(done / total) * circumference} ${circumference}`}
          className={complete ? "stroke-success" : "stroke-(--cal-rotina)"}
        />
      )}
    </svg>
  );
}

/** Linha completa de um item, usada no painel do dia e na agenda. */
export function ItemRow({ item, onOpenEvent }: { item: CalItem; onOpenEvent: (id: string) => void }) {
  const { tasks } = useTasks();
  const meta = SOURCE[item.source];
  const Icon = meta.icon;
  const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : undefined;
  const overdue = item.state === "overdue";
  const done = item.state === "done";
  const titleClass = cn(
    "block max-w-full text-left font-medium after:absolute after:inset-0",
    done && item.source === "tarefas" && "font-normal text-muted-foreground line-through",
  );

  let title: ReactNode;
  if (item.eventId) {
    title = (
      <button type="button" className={titleClass} onClick={() => onOpenEvent(item.eventId!)}>
        {item.title}
      </button>
    );
  } else if (item.to) {
    title = (
      <Link to={item.to} className={titleClass}>
        {item.title}
      </Link>
    );
  } else {
    title = <span className="font-medium">{item.title}</span>;
  }

  return (
    <li
      style={sourceColor(item.source)}
      className="relative flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-(--motion-fast) hover:bg-surface-hover"
    >
      {task ? (
        <span className="flex size-7 shrink-0 items-center justify-center">
          <TaskToggle id={task.id} title={task.title} done={task.status === "done"} />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-base leading-none",
            overdue
              ? "bg-danger-soft text-danger-strong"
              : "bg-[color-mix(in_srgb,var(--c)_14%,var(--surface))] text-[color-mix(in_srgb,var(--c)_80%,var(--foreground))]",
          )}
        >
          {item.icon ?? <Icon className="size-4" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title}
        <p className="text-sm text-muted-foreground">
          {meta.label}
          {item.note && `. ${item.note}`}
        </p>
        {item.location && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{item.location}</span>
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 pt-0.5 text-right text-sm tabular-nums",
          overdue ? "font-medium text-danger-strong" : "text-muted-foreground",
        )}
      >
        {overdue ? (
          "Atrasado"
        ) : done && !item.eventId ? (
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5" aria-hidden />
            Feito
          </span>
        ) : item.time ? (
          timeLabel(item.time, item.endTime)
        ) : (
          ""
        )}
      </span>
    </li>
  );
}

function TaskToggle({ id, title, done }: { id: string; title: string; done: boolean }) {
  const { setStatus } = useTasks();
  return (
    <Checkbox
      checked={done}
      onChange={(c) => setStatus(id, c ? "done" : "todo")}
      label={done ? `Reabrir: ${title}` : `Concluir: ${title}`}
    />
  );
}
