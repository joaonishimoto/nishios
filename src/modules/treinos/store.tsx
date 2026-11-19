import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { ensureDance } from "./danca/migrate";
import { seedExercises, seedModalities, seedPlans, seedSessions } from "./seed";
import { linkToCatalog } from "./strength";
import type {
  ExerciseDef,
  ExerciseDefDraft,
  Modality,
  ModalityDraft,
  Plan,
  PlanDraft,
  Session,
  SessionDraft,
} from "./types";

const MODALITIES_KEY = "nishios:treinos:modalidades:v1";
const SESSIONS_KEY = "nishios:treinos:sessoes:v1";
export const EXERCISES_KEY = "nishios:treinos:exercicios:v1";
export const PLANS_KEY = "nishios:treinos:fichas:v1";

/** Primeira visita (sem treinos salvos): o catálogo e as fichas começam com o exemplo. */
function isFresh(): boolean {
  try {
    return localStorage.getItem(SESSIONS_KEY) === null;
  } catch {
    return true;
  }
}

interface Store {
  modalities: Modality[];
  /** Só os treinos feitos: é o que as contas, as metas e os hábitos enxergam. */
  sessions: Session[];
  /** Treinos planejados, do mais próximo para o mais distante. */
  planned: Session[];
  /** Passa um treino planejado para feito. */
  completeSession: (id: string) => void;
  createModality: (draft: ModalityDraft) => Modality;
  updateModality: (id: string, draft: ModalityDraft) => void;
  /** Exclui a modalidade junto com os treinos dela. */
  removeModality: (id: string) => void;
  restoreModality: (modality: Modality, sessions: Session[]) => void;
  createSession: (draft: SessionDraft) => void;
  updateSession: (id: string, draft: SessionDraft) => void;
  removeSession: (id: string) => void;
  restoreSession: (session: Session) => void;

  /** Catálogo de exercícios de musculação. */
  exercises: ExerciseDef[];
  createExercise: (draft: ExerciseDefDraft) => ExerciseDef;
  /** Junta ao catálogo exercícios criados na hora (num treino ou numa ficha). */
  addExercises: (defs: ExerciseDef[]) => void;
  updateExercise: (id: string, draft: ExerciseDefDraft) => void;
  /** Só para exercícios sem treino nem ficha. */
  removeExercise: (id: string) => void;
  restoreExercise: (def: ExerciseDef) => void;
  /** Passa os treinos e as fichas de `fromId` para `intoId` e apaga `fromId`. */
  mergeExercise: (fromId: string, intoId: string) => void;

  /** Fichas, na ordem do rodízio. */
  plans: Plan[];
  createPlan: (draft: PlanDraft) => Plan;
  updatePlan: (id: string, draft: PlanDraft) => void;
  removePlan: (id: string) => void;
  restorePlan: (plan: Plan, index: number) => void;
  movePlan: (id: string, delta: -1 | 1) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function TreinosProvider({ children }: { children: ReactNode }) {
  const [modalities, setModalities] = usePersistentState<Modality[]>(MODALITIES_KEY, seedModalities, ensureDance);
  const [fresh] = useState(isFresh);
  const [all, setSessions] = usePersistentState<Session[]>(SESSIONS_KEY, seedSessions);
  const [exercises, setExercises] = usePersistentState<ExerciseDef[]>(EXERCISES_KEY, () => (fresh ? seedExercises() : []));
  const [plans, setPlans] = usePersistentState<Plan[]>(PLANS_KEY, () => (fresh ? seedPlans() : []));

  // Treinos antigos (e os que chegam de outro aparelho) se ligam ao catálogo pelo nome.
  useEffect(() => {
    const linked = linkToCatalog(all, exercises);
    if (!linked) return;
    if (linked.catalog !== exercises) setExercises(linked.catalog);
    setSessions(linked.sessions);
  }, [all, exercises, setExercises, setSessions]);

  const sessions = useMemo(() => all.filter((s) => !s.planned), [all]);
  const planned = useMemo(() => all.filter((s) => s.planned).sort((a, b) => a.date.localeCompare(b.date)), [all]);

  const store = useMemo<Store>(
    () => ({
      modalities,
      sessions,
      planned,
      completeSession(id) {
        const todayISO = toISO(today());
        // Feito antes do dia marcado vale como feito hoje.
        setSessions((list) =>
          list.map((s) => (s.id === id ? { ...s, planned: false, date: s.date > todayISO ? todayISO : s.date } : s)),
        );
      },
      createModality(draft) {
        const modality = { ...draft, id: crypto.randomUUID() };
        setModalities((list) => [...list, modality]);
        return modality;
      },
      updateModality(id, draft) {
        setModalities((list) => list.map((m) => (m.id === id ? { ...m, ...draft } : m)));
      },
      removeModality(id) {
        setModalities((list) => list.filter((m) => m.id !== id));
        setSessions((list) => list.filter((s) => s.modalityId !== id));
      },
      restoreModality(modality, removed) {
        setModalities((list) => (list.some((m) => m.id === modality.id) ? list : [...list, modality]));
        setSessions((list) => {
          const have = new Set(list.map((s) => s.id));
          return [...list, ...removed.filter((s) => !have.has(s.id))];
        });
      },
      createSession(draft) {
        setSessions((list) => [...list, { ...draft, id: crypto.randomUUID() }]);
      },
      updateSession(id, draft) {
        setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...draft } : s)));
      },
      removeSession(id) {
        setSessions((list) => list.filter((s) => s.id !== id));
      },
      restoreSession(session) {
        setSessions((list) => (list.some((s) => s.id === session.id) ? list : [...list, session]));
      },
      exercises,
      createExercise(draft) {
        const def = { ...draft, id: crypto.randomUUID() };
        setExercises((list) => [...list, def]);
        return def;
      },
      addExercises(defs) {
        if (defs.length === 0) return;
        setExercises((list) => {
          const have = new Set(list.map((d) => d.id));
          return [...list, ...defs.filter((d) => !have.has(d.id))];
        });
      },
      updateExercise(id, draft) {
        setExercises((list) => list.map((d) => (d.id === id ? { ...d, ...draft } : d)));
        // O nome guardado no treino acompanha o catálogo.
        setSessions((list) =>
          list.map((s) =>
            s.exercises.some((e) => e.exerciseId === id && e.name !== draft.name)
              ? { ...s, exercises: s.exercises.map((e) => (e.exerciseId === id ? { ...e, name: draft.name } : e)) }
              : s,
          ),
        );
      },
      removeExercise(id) {
        setExercises((list) => list.filter((d) => d.id !== id));
      },
      restoreExercise(def) {
        setExercises((list) => (list.some((d) => d.id === def.id) ? list : [...list, def]));
      },
      mergeExercise(fromId, intoId) {
        const into = exercises.find((d) => d.id === intoId);
        if (!into || fromId === intoId) return;
        setSessions((list) =>
          list.map((s) =>
            s.exercises.some((e) => e.exerciseId === fromId)
              ? { ...s, exercises: s.exercises.map((e) => (e.exerciseId === fromId ? { ...e, exerciseId: intoId, name: into.name } : e)) }
              : s,
          ),
        );
        setPlans((list) =>
          list.map((p) =>
            p.items.some((i) => i.exerciseId === fromId)
              ? { ...p, items: p.items.map((i) => (i.exerciseId === fromId ? { ...i, exerciseId: intoId } : i)) }
              : p,
          ),
        );
        setExercises((list) => list.filter((d) => d.id !== fromId));
      },
      plans,
      createPlan(draft) {
        const plan = { ...draft, id: crypto.randomUUID() };
        setPlans((list) => [...list, plan]);
        return plan;
      },
      updatePlan(id, draft) {
        setPlans((list) => list.map((p) => (p.id === id ? { ...p, ...draft } : p)));
      },
      removePlan(id) {
        setPlans((list) => list.filter((p) => p.id !== id));
      },
      restorePlan(plan, index) {
        setPlans((list) => {
          if (list.some((p) => p.id === plan.id)) return list;
          const next = [...list];
          next.splice(Math.min(index, next.length), 0, plan);
          return next;
        });
      },
      movePlan(id, delta) {
        setPlans((list) => {
          const i = list.findIndex((p) => p.id === id);
          const j = i + delta;
          if (i < 0 || j < 0 || j >= list.length) return list;
          const next = [...list];
          [next[i], next[j]] = [next[j], next[i]];
          return next;
        });
      },
      resetToExample() {
        setModalities(seedModalities());
        setSessions(seedSessions());
        setExercises(seedExercises());
        setPlans(seedPlans());
      },
    }),
    [modalities, sessions, planned, exercises, plans, setModalities, setSessions, setExercises, setPlans],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTreinos(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTreinos precisa estar dentro de TreinosProvider");
  return store;
}
