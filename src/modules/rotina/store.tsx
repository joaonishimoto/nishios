import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { useCorpo } from "@/modules/corpo/store";
import { useFinancas } from "@/modules/financas/store";
import { useSkills } from "@/modules/skills/store";
import { useTasks } from "@/modules/tarefas/store";
import { useTreinos } from "@/modules/treinos/store";
import { resolveGoals, resolveHabits } from "./linked";
import { seedGoals, seedHabits } from "./seed";
import type { Goal, GoalDraft, Habit, HabitDraft } from "./types";

const HABITS_KEY = "nishios:rotina:habitos:v1";
const GOALS_KEY = "nishios:rotina:metas:v1";

interface Store {
  /** Já com as ligações aplicadas: hábitos marcados pelos treinos e metas com o número calculado. */
  habits: Habit[];
  goals: Goal[];
  /** Marca ou desmarca o hábito em um dia (yyyy-MM-dd). */
  toggleHabit: (id: string, date: string) => void;
  createHabit: (draft: HabitDraft) => void;
  updateHabit: (id: string, draft: HabitDraft) => void;
  removeHabit: (id: string) => void;
  restoreHabit: (habit: Habit) => void;
  createGoal: (draft: GoalDraft) => void;
  updateGoal: (id: string, patch: Partial<GoalDraft>) => void;
  removeGoal: (id: string) => void;
  restoreGoal: (goal: Goal) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function RoutineProvider({ children }: { children: ReactNode }) {
  const [rawHabits, setHabits] = usePersistentState<Habit[]>(HABITS_KEY, seedHabits);
  const [rawGoals, setGoals] = usePersistentState<Goal[]>(GOALS_KEY, seedGoals);
  const { sessions, modalities } = useTreinos();
  const { entries } = useCorpo();
  const { tasks } = useTasks();
  const { skills } = useSkills();
  const { investments } = useFinancas();

  // O que é salvo é sempre o dado cru; as ligações são recalculadas a cada mudança nos outros módulos.
  const habits = useMemo(() => resolveHabits(rawHabits, sessions), [rawHabits, sessions]);
  const goals = useMemo(
    () => resolveGoals(rawGoals, { sessions, modalities, entries, tasks, skills, investments, habits }),
    [rawGoals, sessions, modalities, entries, tasks, skills, investments, habits],
  );

  const store = useMemo<Store>(
    () => ({
      habits,
      goals,
      toggleHabit(id, date) {
        setHabits((list) =>
          list.map((h) =>
            h.id !== id
              ? h
              : {
                  ...h,
                  log: h.log.includes(date) ? h.log.filter((d) => d !== date) : [...h.log, date],
                },
          ),
        );
      },
      createHabit(draft) {
        setHabits((list) => [...list, { ...draft, id: crypto.randomUUID(), log: [] }]);
      },
      updateHabit(id, draft) {
        setHabits((list) => list.map((h) => (h.id === id ? { ...h, ...draft } : h)));
      },
      removeHabit(id) {
        setHabits((list) => list.filter((h) => h.id !== id));
      },
      restoreHabit(habit) {
        // Vem da tela já resolvido: tira o que foi calculado antes de salvar.
        const { autoDates, ...raw } = habit;
        const saved = { ...raw, log: raw.log.filter((d) => !autoDates?.includes(d)) };
        setHabits((list) => (list.some((h) => h.id === habit.id) ? list : [...list, saved]));
      },
      createGoal(draft) {
        setGoals((list) => [...list, { ...draft, id: crypto.randomUUID() }]);
      },
      updateGoal(id, patch) {
        setGoals((list) => list.map((g) => (g.id === id ? { ...g, ...patch } : g)));
      },
      removeGoal(id) {
        setGoals((list) => list.filter((g) => g.id !== id));
      },
      restoreGoal(goal) {
        setGoals((list) => (list.some((g) => g.id === goal.id) ? list : [...list, goal]));
      },
      resetToExample() {
        setHabits(seedHabits());
        setGoals(seedGoals());
      },
    }),
    [habits, goals, setHabits, setGoals],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useRoutine(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useRoutine precisa estar dentro de RoutineProvider");
  return store;
}
