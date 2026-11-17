import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Columns3, List, Plus, Search } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { usePersistentState } from "@/lib/storage";
import { byCompletion, byPriority, STATUS_META, STATUS_ORDER } from "./logic";
import { useTasks } from "./store";
import { DueLabel, PriorityFlag, QuickAdd, TaskCheck } from "./TaskBits";
import { TaskPanel } from "./TaskPanel";
import type { Task, TaskStatus } from "./types";

type View = "list" | "board";

const GRID =
  "md:grid md:grid-cols-[auto_minmax(0,1fr)_6.5rem_6rem_6.5rem] md:items-center md:gap-x-4";

export function TarefasPage() {
  const { tasks, setStatus } = useTasks();
  const [params, setParams] = useSearchParams();
  const [view, setView] = usePersistentState<View>("nishios:tarefas:visao", () => "list");
  const [list, setList] = useState("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set(["done"]));
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const openTask = tasks.find((t) => t.id === params.get("t"));
  const open = (id: string | null) =>
    setParams(id ? { t: id } : {}, { replace: !id, preventScrollReset: true });

  const lists = useMemo(
    () => [...new Set(tasks.map((t) => t.list))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tasks],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const visible = tasks
      .filter((t) => list === "all" || t.list === list)
      .filter((t) => !q || t.title.toLocaleLowerCase("pt-BR").includes(q));
    return STATUS_ORDER.map((status) => ({
      status,
      items: visible
        .filter((t) => t.status === status)
        .sort(status === "done" ? byCompletion : byPriority),
    }));
  }, [tasks, list, query]);

  const filtering = list !== "all" || query.trim() !== "";
  const nothingFound = filtering && groups.every((g) => g.items.length === 0);
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const newTaskList = list === "all" ? undefined : list;

  function focusQuickAdd() {
    setCollapsed((set) => {
      const next = new Set(set);
      next.delete("todo");
      return next;
    });
    // Espera o grupo abrir antes de focar o campo.
    requestAnimationFrame(() => {
      quickAddRef.current?.scrollIntoView({ block: "center" });
      quickAddRef.current?.focus();
    });
  }

  const toggle = (s: TaskStatus) =>
    setCollapsed((set) => {
      const next = new Set(set);
      if (!next.delete(s)) next.add(s);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={
          openCount === 0
            ? "Nenhuma tarefa aberta."
            : openCount === 1
              ? "1 tarefa aberta."
              : `${openCount} tarefas abertas.`
        }
        action={
          <Button onClick={focusQuickAdd}>
            <Plus />
            Nova tarefa
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented<View>
          label="Modo de visualização"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: (<><List className="size-3.5" />Lista</>) },
            { value: "board", label: (<><Columns3 className="size-3.5" />Quadro</>) },
          ]}
        />
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          <Select
            aria-label="Filtrar por lista"
            className="sm:w-40"
            value={list}
            onChange={(e) => setList(e.target.value)}
          >
            <option value="all">Todas as listas</option>
            {lists.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
          <div className="relative w-full sm:w-52">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar tarefa"
              placeholder="Buscar"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {nothingFound ? (
          <EmptyState
            title="Nada por aqui"
            description="Nenhuma tarefa combina com os filtros escolhidos."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setList("all");
                  setQuery("");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : view === "list" ? (
          <div className="flex flex-col gap-5">
            {groups.map(({ status, items }) => {
              const meta = STATUS_META[status];
              const isCollapsed = collapsed.has(status);
              if (status === "done" && items.length === 0) return null;
              return (
                <section key={status}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggle(status)}
                    className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm font-semibold hover:bg-surface-hover"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 text-subtle-foreground transition-transform duration-(--motion-fast)",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <Dot tone={meta.tone} />
                    {meta.label}
                    <span className="font-normal text-subtle-foreground tabular-nums">
                      {items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-surface">
                      <ul className={cn(status === "done" && "[&>li:last-child]:border-b-0")}>
                        {items.map((t) => (
                          <Row key={t.id} task={t} onOpen={() => open(t.id)} />
                        ))}
                      </ul>
                      {status !== "done" && (
                        <QuickAdd
                          ref={status === "todo" ? quickAddRef : undefined}
                          status={status}
                          list={newTaskList}
                        />
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {groups.map(({ status, items }) => {
              const meta = STATUS_META[status];
              return (
                <section
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(status);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) setStatus(id, status);
                    setDragOver(null);
                  }}
                  className={cn(
                    "flex flex-col rounded-lg bg-surface-muted p-2 transition-colors duration-(--motion-fast)",
                    dragOver === status && "bg-surface-selected",
                  )}
                >
                  <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold">
                    <Dot tone={meta.tone} />
                    {meta.label}
                    <span className="font-normal text-subtle-foreground tabular-nums">
                      {items.length}
                    </span>
                  </h2>
                  <ul className="mt-1 flex flex-col gap-2">
                    {items.map((t) => (
                      <Card key={t.id} task={t} onOpen={() => open(t.id)} />
                    ))}
                  </ul>
                  {status !== "done" && (
                    <QuickAdd
                      ref={status === "todo" ? quickAddRef : undefined}
                      status={status}
                      list={newTaskList}
                      className="mt-1 px-2"
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <TaskPanel task={openTask} onClose={() => open(null)} />
    </>
  );
}

function Title({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "min-w-0 text-left font-medium after:absolute after:inset-0",
        task.status === "done" && "font-normal text-muted-foreground line-through",
      )}
    >
      {task.title || "Sem título"}
    </button>
  );
}

function Row({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <li
      className={cn(
        "relative flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) hover:bg-surface-hover",
        GRID,
      )}
    >
      <TaskCheck task={task} />
      <span className="min-w-0 flex-1 truncate">
        <Title task={task} onOpen={onOpen} />
      </span>
      <span className="basis-full md:hidden" />
      <span className="truncate pl-[1.875rem] text-sm text-muted-foreground md:pl-0">{task.list}</span>
      <PriorityFlag priority={task.priority} showLabel />
      <span className="ml-auto md:ml-0">
        <DueLabel task={task} />
      </span>
    </li>
  );
}

function Card({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="relative flex cursor-grab flex-col gap-2.5 rounded-md border border-border bg-surface p-3 shadow-xs transition-colors duration-(--motion-fast) hover:border-border-strong active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <span className="pt-0.5">
          <TaskCheck task={task} />
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <Title task={task} onOpen={onOpen} />
        </span>
      </div>
      <div className="flex items-center gap-3 pl-[1.75rem]">
        <PriorityFlag priority={task.priority} />
        <span className="truncate text-sm text-muted-foreground">{task.list}</span>
        <DueLabel task={task} className="ml-auto" />
      </div>
    </li>
  );
}
