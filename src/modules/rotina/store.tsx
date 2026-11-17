import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedGoals, seedHabits } from "./seed";
import type { Goal, GoalDraft, Habit, HabitDraft } from "./types";

const HABITS_KEY = "nishios:rotina:habitos:v1";
const GOALS_KEY = "nishios:rotina:metas:v1";

interface Store {
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
  const [habits, setHabits] = usePersistentState<Habit[]>(HABITS_KEY, seedHabits);
  const [goals, setGoals] = usePersistentState<Goal[]>(GOALS_KEY, seedGoals);

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
        setHabits((list) => (list.some((h) => h.id === habit.id) ? list : [...list, habit]));
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
