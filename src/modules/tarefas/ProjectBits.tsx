import { useMemo, useState } from "react";
import { ChevronDown, Clock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { shortDate, toISO, today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { formatMinutes } from "./logic";
import { useTasks } from "./store";
import { NO_PROJECT, type Project, type TimeEntry } from "./types";

/** Barra de projetos: Todas, Sem projeto, um botão por projeto e "Novo projeto". */
export function ProjectBar({
  value,
  onChange,
  onNew,
}: {
  value: string;
  onChange: (value: string) => void;
  onNew: () => void;
}) {
  const { tasks, projects } = useTasks();
  const open = tasks.filter((t) => t.status !== "done");
  const count = (projectId: string) => open.filter((t) => t.projectId === projectId).length;
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const [showArchived, setShowArchived] = useState(() => archived.some((p) => p.id === value));

  const chips: { value: string; label: string; icon?: string; count: number; muted?: boolean }[] = [
    { value: "all", label: "Todas", count: open.length },
    { value: NO_PROJECT, label: "Sem projeto", count: count("") },
    ...active.map((p) => ({ value: p.id, label: p.name, icon: p.icon, count: count(p.id) })),
    ...(showArchived ? archived.map((p) => ({ value: p.id, label: p.name, icon: p.icon, count: count(p.id), muted: true })) : []),
  ];

  return (
    <nav aria-label="Projetos" className="-mx-(--page-padding-x) overflow-x-auto px-(--page-padding-x) pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
        {chips.map((c) => {
          const selected = c.value === value;
          return (
            <li key={c.value}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(c.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors duration-(--motion-fast)",
                  selected
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-surface-hover",
                  c.muted && !selected && "text-muted-foreground",
                )}
              >
                {c.icon && <span aria-hidden>{c.icon}</span>}
                {c.label}
                <span className={cn("tabular-nums", selected ? "opacity-70" : "text-subtle-foreground")}>
                  {c.count}
                </span>
              </button>
            </li>
          );
        })}
        {archived.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-surface-hover"
            >
              {showArchived ? "Esconder arquivados" : `Arquivados (${archived.length})`}
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-border-strong px-3 text-sm whitespace-nowrap text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden />
            Projeto
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function minutesIn(entries: TimeEntry[], month: string): number {
  return entries.filter((e) => e.date.startsWith(month)).reduce((sum, e) => sum + e.minutes, 0);
}

/** Cabeçalho do projeto aberto: andamento, horas do mês e as últimas horas registradas. */
export function ProjectHeader({
  project,
  onEdit,
  onLogTime,
  onEditTime,
}: {
  project: Project;
  onEdit: () => void;
  onLogTime: () => void;
  onEditTime: (entry: TimeEntry) => void;
}) {
  const { tasks, timeEntries } = useTasks();
  const [showHours, setShowHours] = useState(false);
  const mine = tasks.filter((t) => t.projectId === project.id);
  const done = mine.filter((t) => t.status === "done").length;
  const entries = useMemo(
    () => timeEntries.filter((e) => e.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date)),
    [timeEntries, project.id],
  );
  const month = toISO(today()).slice(0, 7);
  const monthMinutes = minutesIn(entries, month);
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const value = project.hourlyRate > 0 ? (monthMinutes / 60) * project.hourlyRate : 0;
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title;

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
        <span aria-hidden className="text-2xl leading-none">
          {project.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {project.name}
            {project.archived && <span className="ml-2 text-sm font-normal text-muted-foreground">arquivado</span>}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[project.client, mine.length ? `${done} de ${plural(mine.length, "tarefa concluída", "tarefas concluídas")}` : "Nenhuma tarefa ainda"]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {mine.length > 0 && (
            <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              <div className="h-full rounded-full bg-success" style={{ width: `${(done / mine.length) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none" onClick={onLogTime}>
            <Clock />
            Registrar horas
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={onEdit} aria-label="Editar projeto">
            <Pencil />
            <span className="sm:hidden">Editar</span>
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="border-t border-border">
          <button
            type="button"
            aria-expanded={showHours}
            onClick={() => setShowHours((s) => !s)}
            className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-left text-sm hover:bg-surface-hover"
          >
            <ChevronDown
              className={cn("size-4 text-subtle-foreground transition-transform", !showHours && "-rotate-90")}
              aria-hidden
            />
            <span className="font-medium">
              Este mês: <span className="tabular-nums">{formatMinutes(monthMinutes)}</span>
            </span>
            {value > 0 && <span className="text-muted-foreground tabular-nums">≈ {money(Math.round(value * 100) / 100)}</span>}
            <span className="ml-auto text-muted-foreground tabular-nums">Total {formatMinutes(totalMinutes)}</span>
          </button>
          {showHours && (
            <ul className="border-t border-border">
              {entries.slice(0, 12).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onEditTime(e)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-hover"
                  >
                    <span className="w-16 shrink-0 text-muted-foreground">{shortDate(e.date)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {e.note || taskTitle(e.taskId) || "Trabalho no projeto"}
                      {e.note && e.taskId && taskTitle(e.taskId) && (
                        <span className="text-muted-foreground"> · {taskTitle(e.taskId)}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatMinutes(e.minutes)}</span>
                  </button>
                </li>
              ))}
              {entries.length > 12 && (
                <li className="px-4 py-2 text-sm text-muted-foreground">
                  e mais {plural(entries.length - 12, "registro", "registros")}
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
