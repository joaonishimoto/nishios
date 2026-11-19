import { createContext, useContext, useMemo, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { byPriority } from "./logic";
import { seedProjects, seedTasks, seedTimeEntries } from "./seed";
import { LISTS, type Project, type ProjectDraft, type Task, type TaskStatus, type TimeEntry } from "./types";

const KEY = "nishios:tarefas:v1";
const PROJECTS_KEY = "nishios:tarefas:projetos:v1";
const HOURS_KEY = "nishios:tarefas:horas:v1";

interface Store {
  tasks: Task[];
  projects: Project[];
  timeEntries: TimeEntry[];
  create: (fields: Pick<Task, "title"> & Partial<Task>) => Task;
  update: (id: string, patch: Partial<Task>) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  remove: (id: string) => void;
  restore: (task: Task) => void;
  /** Grava a fila manual: os ids na ordem em que devem aparecer. */
  reorder: (ids: string[]) => void;
  createProject: (draft: ProjectDraft) => Project;
  updateProject: (id: string, patch: Partial<ProjectDraft>) => void;
  /** Exclui o projeto e suas horas; as tarefas ficam, sem projeto. */
  removeProject: (id: string) => { project: Project; taskIds: string[]; entries: TimeEntry[] } | null;
  restoreProject: (snapshot: { project: Project; taskIds: string[]; entries: TimeEntry[] }) => void;
  logTime: (entry: Omit<TimeEntry, "id">) => TimeEntry;
  updateTime: (id: string, patch: Partial<TimeEntry>) => void;
  removeTime: (id: string) => void;
  restoreTime: (entry: TimeEntry) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Mudar o status também registra (ou limpa) a data de conclusão. */
function withStatus(task: Task, status: TaskStatus): Task {
  if (task.status === status) return task;
  return { ...task, status, completedAt: status === "done" ? toISO(today()) : "" };
}

/** Tarefas salvas antes dos projetos: ficam sem projeto e a fila começa pela prioridade. */
function migrateTasks(stored: Task[]): Task[] {
  if (stored.every((t) => typeof t.rank === "number" && typeof t.projectId === "string")) return stored;
  const order = [...stored].sort((a, b) => byPriority({ ...a, rank: 0 }, { ...b, rank: 0 }));
  return stored.map((t) => ({
    ...t,
    projectId: t.projectId ?? "",
    rank: typeof t.rank === "number" ? t.rank : order.indexOf(t),
  }));
}

/** Quem já usava o app começa sem projetos de exemplo; só um app novo ganha exemplos. */
function hadTasksBefore(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  // Lido antes de qualquer gravação, para saber se o app já tinha tarefas.
  const veteran = useMemo(hadTasksBefore, []);
  const [tasks, setTasks] = usePersistentState<Task[]>(KEY, seedTasks, migrateTasks);
  const [projects, setProjects] = usePersistentState<Project[]>(PROJECTS_KEY, () =>
    veteran ? [] : seedProjects(),
  );
  const [timeEntries, setTimeEntries] = usePersistentState<TimeEntry[]>(HOURS_KEY, () =>
    veteran ? [] : seedTimeEntries(),
  );

  const store = useMemo<Store>(() => {
    const patchTask = (id: string, fn: (t: Task) => Task) =>
      setTasks((list) => list.map((t) => (t.id === id ? fn(t) : t)));

    return {
      tasks,
      projects,
      timeEntries,
      create(fields) {
        const task: Task = {
          id: crypto.randomUUID(),
          notes: "",
          status: "todo",
          priority: "normal",
          list: fields.projectId ? "Trabalho" : LISTS[0],
          projectId: "",
          rank: tasks.reduce((max, t) => Math.max(max, t.rank), -1) + 1,
          due: "",
          createdAt: new Date().toISOString(),
          completedAt: "",
          ...fields,
        };
        if (task.status === "done" && !task.completedAt) task.completedAt = toISO(today());
        setTasks((list) => [...list, task]);
        return task;
      },
      update(id, patch) {
        patchTask(id, (t) => {
          const { status, ...rest } = patch;
          return { ...(status ? withStatus(t, status) : t), ...rest };
        });
      },
      setStatus(id, status) {
        patchTask(id, (t) => withStatus(t, status));
      },
      remove(id) {
        setTasks((list) => list.filter((t) => t.id !== id));
      },
      restore(task) {
        setTasks((list) => (list.some((t) => t.id === task.id) ? list : [...list, task]));
      },
      reorder(ids) {
        // Reaproveita as posições que esses ids já ocupavam, para não mexer no resto da fila.
        const slots = tasks
          .filter((t) => ids.includes(t.id))
          .map((t) => t.rank)
          .sort((a, b) => a - b);
        const unique = slots.every((r, i) => i === 0 || r !== slots[i - 1]);
        const rankOf = new Map(ids.map((id, i) => [id, unique ? slots[i] : (slots[0] ?? 0) + i / ids.length]));
        setTasks((list) => list.map((t) => (rankOf.has(t.id) ? { ...t, rank: rankOf.get(t.id)! } : t)));
      },
      createProject(draft) {
        const project: Project = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...draft };
        setProjects((list) => [...list, project]);
        return project;
      },
      updateProject(id, patch) {
        setProjects((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      removeProject(id) {
        const project = projects.find((p) => p.id === id);
        if (!project) return null;
        const taskIds = tasks.filter((t) => t.projectId === id).map((t) => t.id);
        const entries = timeEntries.filter((e) => e.projectId === id);
        setProjects((list) => list.filter((p) => p.id !== id));
        setTasks((list) => list.map((t) => (t.projectId === id ? { ...t, projectId: "" } : t)));
        setTimeEntries((list) => list.filter((e) => e.projectId !== id));
        return { project, taskIds, entries };
      },
      restoreProject({ project, taskIds, entries }) {
        setProjects((list) => (list.some((p) => p.id === project.id) ? list : [...list, project]));
        setTasks((list) => list.map((t) => (taskIds.includes(t.id) ? { ...t, projectId: project.id } : t)));
        setTimeEntries((list) => [...list.filter((e) => e.projectId !== project.id), ...entries]);
      },
      logTime(fields) {
        const entry: TimeEntry = { id: crypto.randomUUID(), ...fields };
        setTimeEntries((list) => [...list, entry]);
        return entry;
      },
      updateTime(id, patch) {
        setTimeEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      },
      removeTime(id) {
        setTimeEntries((list) => list.filter((e) => e.id !== id));
      },
      restoreTime(entry) {
        setTimeEntries((list) => (list.some((e) => e.id === entry.id) ? list : [...list, entry]));
      },
      resetToExample() {
        setTasks(seedTasks());
        setProjects(seedProjects());
        setTimeEntries(seedTimeEntries());
      },
    };
  }, [tasks, projects, timeEntries, setTasks, setProjects, setTimeEntries]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTasks(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTasks precisa estar dentro de TasksProvider");
  return store;
}
