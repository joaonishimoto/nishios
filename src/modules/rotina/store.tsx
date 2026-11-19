import { createContext, useContext, useMemo, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
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
  /** Soma (ou tira) quantidade num hábito de quantidade; fica feito ao chegar no alvo. */
  addAmount: (id: string, date: string, delta: number) => void;
  createHabit: (draft: HabitDraft) => void;
  updateHabit: (id: string, patch: Partial<HabitDraft>) => void;
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
          list.map((h) => {
            if (h.id !== id) return h;
            const on = h.log.includes(date);
            const log = on ? h.log.filter((d) => d !== date) : [...h.log, date];
            // Num hábito de quantidade, marcar é completar o dia e desmarcar é zerar.
            if (!h.amount) return { ...h, log };
            return { ...h, log, counts: { ...h.counts, [date]: on ? 0 : h.amount.target } };
          }),
        );
      },
      addAmount(id, date, delta) {
        setHabits((list) =>
          list.map((h) => {
            if (h.id !== id || !h.amount) return h;
            const before = h.counts?.[date] ?? (h.log.includes(date) ? h.amount.target : 0);
            const value = Math.max(0, Math.round((before + delta) * 100) / 100);
            const reached = value >= h.amount.target;
            const log = reached ? [...new Set([...h.log, date])] : h.log.filter((d) => d !== date);
            return { ...h, log, counts: { ...h.counts, [date]: value } };
          }),
        );
      },
      createHabit(draft) {
        setHabits((list) => [...list, { ...draft, id: crypto.randomUUID(), log: [], createdAt: toISO(today()) }]);
      },
      updateHabit(id, patch) {
        setHabits((list) => list.map((h) => (h.id === id ? { ...h, ...patch } : h)));
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
        const date = toISO(today());
        setGoals((list) => [
          ...list,
          {
            ...draft,
            id: crypto.randomUUID(),
            createdAt: draft.createdAt ?? date,
            history: draft.link ? undefined : [{ date, value: draft.steps ? draft.steps.filter((s) => s.done).length : draft.current }],
          },
        ]);
      },
      updateGoal(id, patch) {
        setGoals((list) =>
          list.map((g) => {
            if (g.id !== id) return g;
            const next = { ...g, ...patch };
            if (next.link) return next;
            // Guarda o número do dia sempre que ele muda à mão, para o gráfico e o ritmo.
            const value = next.steps ? next.steps.filter((s) => s.done).length : next.current;
            const before = g.steps ? g.steps.filter((s) => s.done).length : g.current;
            if (value === before && g.history?.length) return next;
            const date = toISO(today());
            const history = [...(g.history ?? []).filter((p) => p.date !== date), { date, value }].sort((a, b) =>
              a.date.localeCompare(b.date),
            );
            return { ...next, history };
          }),
        );
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
