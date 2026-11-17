import { createContext, useContext, useMemo, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { seedTasks } from "./seed";
import { LISTS, type Task, type TaskStatus } from "./types";

const KEY = "nishios:tarefas:v1";

interface Store {
  tasks: Task[];
  create: (fields: Pick<Task, "title"> & Partial<Task>) => Task;
  update: (id: string, patch: Partial<Task>) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  remove: (id: string) => void;
  restore: (task: Task) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Mudar o status também registra (ou limpa) a data de conclusão. */
function withStatus(task: Task, status: TaskStatus): Task {
  if (task.status === status) return task;
  return { ...task, status, completedAt: status === "done" ? toISO(today()) : "" };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = usePersistentState<Task[]>(KEY, seedTasks);

  const store = useMemo<Store>(() => {
    const patchTask = (id: string, fn: (t: Task) => Task) =>
      setTasks((list) => list.map((t) => (t.id === id ? fn(t) : t)));

    return {
      tasks,
      create(fields) {
        const task: Task = {
          id: crypto.randomUUID(),
          notes: "",
          status: "todo",
          priority: "normal",
          list: LISTS[0],
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
      resetToExample() {
        setTasks(seedTasks());
      },
    };
  }, [tasks, setTasks]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTasks(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTasks precisa estar dentro de TasksProvider");
  return store;
}
