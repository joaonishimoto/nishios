import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronDown, Columns3, GripVertical, List, Plus, Search } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NoResults } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { usePersistentState } from "@/lib/storage";
import { byCompletion, byPriority, byRank, STATUS_META, STATUS_ORDER, type TaskSort } from "./logic";
import { ProjectBar, ProjectHeader } from "./ProjectBits";
import { ProjectForm } from "./ProjectForm";
import { useTasks } from "./store";
import { DueLabel, PriorityFlag, QuickAdd, TaskCheck } from "./TaskBits";
import { TaskPanel } from "./TaskPanel";
import { TimeForm } from "./TimeForm";
import { NO_PROJECT, type Project, type Task, type TaskStatus, type TimeEntry } from "./types";

type View = "list" | "board";

const GRID =
  "md:grid md:grid-cols-[auto_minmax(0,1fr)_9rem_6rem_6.5rem] md:items-center md:gap-x-4";
/** Na fila manual a linha ganha a alça de arrastar e as setas de subir e descer. */
const GRID_MANUAL =
  "md:grid md:grid-cols-[auto_auto_minmax(0,1fr)_9rem_6rem_6.5rem_auto] md:items-center md:gap-x-3";

export function TarefasPage() {
  const { tasks, projects, setStatus, reorder } = useTasks();
  const [params, setParams] = useSearchParams();
  const [view, setView] = usePersistentState<View>("nishios:tarefas:visao", () => "list");
  const [sort, setSort] = usePersistentState<TaskSort>("nishios:tarefas:ordem", () => "priority");
  const [list, setList] = useState("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set(["done"]));
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [projectForm, setProjectForm] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [timeForm, setTimeForm] = useState<{ open: boolean; entry?: TimeEntry }>({ open: false });
  const quickAddRef = useRef<HTMLInputElement>(null);

  const projectParam = params.get("projeto") ?? "all";
  const project = projects.find((p) => p.id === projectParam);
  // Um id de projeto que não existe mais volta para "Todas".
  const projectFilter = project || projectParam === NO_PROJECT ? projectParam : "all";
  const openTask = tasks.find((t) => t.id === params.get("t"));

  const setParam = (key: string, value: string | null, replace = false) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace, preventScrollReset: true },
    );
  const open = (id: string | null) => setParam("t", id, !id);
  const pickProject = (value: string) => setParam("projeto", value === "all" ? null : value);

  const lists = useMemo(
    () => [...new Set(tasks.map((t) => t.list))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tasks],
  );
  const projectOf = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const visible = tasks
      .filter((t) =>
        projectFilter === "all" ? true : projectFilter === NO_PROJECT ? !t.projectId : t.projectId === projectFilter,
      )
      .filter((t) => list === "all" || t.list === list)
      .filter((t) => !q || t.title.toLocaleLowerCase("pt-BR").includes(q));
    return STATUS_ORDER.map((status) => ({
      status,
      items: visible
        .filter((t) => t.status === status)
        .sort(status === "done" ? byCompletion : sort === "manual" ? byRank : byPriority),
    }));
  }, [tasks, list, query, projectFilter, sort]);

  const filtering = list !== "all" || query.trim() !== "";
  const nothingFound = filtering && groups.every((g) => g.items.length === 0);
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const newTaskList = list === "all" ? undefined : list;
  const newTaskProject = project?.id;
  const manual = sort === "manual";
  const showProject = projectFilter === "all";

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

  /** Move a tarefa para a posição `to` dentro da lista que está na tela. */
  function move(items: Task[], id: string, to: number) {
    const ids = items.map((t) => t.id);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    reorder(ids);
  }

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

      <div className="mt-6">
        <ProjectBar value={projectFilter} onChange={pickProject} onNew={() => setProjectForm({ open: true })} />
      </div>

      {project && (
        <ProjectHeader
          project={project}
          onEdit={() => setProjectForm({ open: true, project })}
          onLogTime={() => setTimeForm({ open: true })}
          onEditTime={(entry) => setTimeForm({ open: true, entry })}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented<View>
          label="Modo de visualização"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: (<><List className="size-3.5" />Lista</>) },
            { value: "board", label: (<><Columns3 className="size-3.5" />Quadro</>) },
          ]}
        />
        <Segmented<TaskSort>
          label="Ordem das tarefas"
          value={sort}
          onChange={setSort}
          options={[
            { value: "priority", label: "Prioridade" },
            { value: "manual", label: "Minha ordem" },
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
              placeholder="Buscar tarefas"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      {manual && view === "list" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Arraste pela alça ou use as setas para colocar as tarefas na ordem em que vai fazê-las.
        </p>
      )}

      <div className="mt-5">
        {nothingFound ? (
          <NoResults
            query={query}
            onClear={() => {
              setList("all");
              setQuery("");
            }}
          />
        ) : view === "list" ? (
          <div className="flex flex-col gap-5">
            {groups.map(({ status, items }) => {
              const meta = STATUS_META[status];
              const isCollapsed = collapsed.has(status);
              if (status === "done" && items.length === 0) return null;
              const sortable = manual && status !== "done";
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
                        {items.map((t, i) => (
                          <Row
                            key={t.id}
                            task={t}
                            project={showProject ? projectOf.get(t.projectId) : undefined}
                            onOpen={() => open(t.id)}
                            order={
                              sortable
                                ? {
                                    position: i,
                                    count: items.length,
                                    move: (to) => move(items, t.id, to),
                                    dropOn: (id) => move(items, id, i),
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </ul>
                      {status !== "done" && (
                        <QuickAdd
                          ref={status === "todo" ? quickAddRef : undefined}
                          status={status}
                          list={newTaskList}
                          projectId={newTaskProject}
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
                      <Card
                        key={t.id}
                        task={t}
                        project={showProject ? projectOf.get(t.projectId) : undefined}
                        onOpen={() => open(t.id)}
                      />
                    ))}
                  </ul>
                  {status !== "done" && (
                    <QuickAdd
                      ref={status === "todo" ? quickAddRef : undefined}
                      status={status}
                      list={newTaskList}
                      projectId={newTaskProject}
                      className="mt-1 px-2"
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <TaskPanel
        task={openTask}
        onClose={() => open(null)}
        onLogTime={() => setTimeForm({ open: true })}
      />
      <ProjectForm
        open={projectForm.open}
        project={projectForm.project}
        onOpenChange={(o) => setProjectForm((s) => ({ ...s, open: o }))}
        onSaved={(p) => !projectForm.project && pickProject(p.id)}
        onRemoved={() => pickProject("all")}
      />
      <TimeForm
        open={timeForm.open}
        entry={timeForm.entry}
        projectId={openTask?.projectId || project?.id}
        taskId={openTask?.projectId ? openTask.id : undefined}
        onOpenChange={(o) => setTimeForm((s) => ({ ...s, open: o }))}
      />
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

/** Projeto (quando a tela mostra todos) ou a lista da tarefa. */
function Where({ task, project }: { task: Task; project?: Project }) {
  if (project) {
    return (
      <span className="truncate">
        <span aria-hidden>{project.icon} </span>
        {project.name}
      </span>
    );
  }
  return <span className="truncate">{task.list}</span>;
}

interface Order {
  position: number;
  count: number;
  move: (to: number) => void;
  /** Uma tarefa arrastada foi solta nesta linha: ela passa a ocupar este lugar. */
  dropOn: (id: string) => void;
}

const DRAG_TYPE = "application/x-nishios-task";

function Row({
  task,
  project,
  onOpen,
  order,
}: {
  task: Task;
  project?: Project;
  onOpen: () => void;
  order?: Order;
}) {
  const [over, setOver] = useState(false);
  return (
    <li
      draggable={!!order}
      onDragStart={(e) => {
        if (!order) return;
        e.dataTransfer.setData(DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!order || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_TYPE);
        if (order && id && id !== task.id) {
          e.preventDefault();
          order.dropOn(id);
        }
      }}
      className={cn(
        "relative flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) hover:bg-surface-hover",
        order ? GRID_MANUAL : GRID,
        over && "shadow-[inset_0_2px_0_var(--color-primary)]",
      )}
    >
      {order && (
        <span className="relative z-[1] hidden w-8 cursor-grab items-center gap-0.5 text-subtle-foreground active:cursor-grabbing md:flex">
          <GripVertical className="size-4" aria-hidden />
          <span className="text-xs tabular-nums">{order.position + 1}</span>
        </span>
      )}
      <TaskCheck task={task} />
      <span className="min-w-0 flex-1 truncate">
        <Title task={task} onOpen={onOpen} />
      </span>
      {order && <MoveButtons order={order} title={task.title} className="md:hidden" />}
      <span className="basis-full md:hidden" />
      <span className="truncate pl-[1.875rem] text-sm text-muted-foreground md:pl-0">
        <Where task={task} project={project} />
      </span>
      <PriorityFlag priority={task.priority} showLabel />
      <span className="ml-auto md:ml-0">
        <DueLabel task={task} />
      </span>
      {order && <MoveButtons order={order} title={task.title} className="hidden md:flex" />}
    </li>
  );
}

function MoveButtons({ order, title, className }: { order: Order; title: string; className?: string }) {
  return (
    <span className={cn("relative z-[1] flex shrink-0 items-center", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Subir: ${title}`}
        disabled={order.position === 0}
        onClick={() => order.move(order.position - 1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Descer: ${title}`}
        disabled={order.position === order.count - 1}
        onClick={() => order.move(order.position + 1)}
      >
        <ArrowDown />
      </Button>
    </span>
  );
}

function Card({ task, project, onOpen }: { task: Task; project?: Project; onOpen: () => void }) {
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
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          <Where task={task} project={project} />
        </span>
        <DueLabel task={task} className="ml-auto" />
      </div>
    </li>
  );
}
