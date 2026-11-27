import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { ensureDance } from "./danca/migrate";
import { seedExercises, seedModalities, seedPlans, seedSessions } from "./seed";
import { LIBRARY, LIBRARY_BY_ID } from "./library";
import { linkToCatalog, normalizeName } from "./strength";
import type { TrainingTemplate } from "./templates";
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
/** Exercícios da biblioteca que você excluiu do catálogo. */
export const HIDDEN_KEY = "nishios:treinos:biblioteca-oculta:v1";

/**
 * O catálogo que o app enxerga: o que está salvo mais a biblioteca, menos o que
 * foi escondido e o que já existe salvo com o mesmo nome.
 */
function mergeLibrary(stored: ExerciseDef[], hidden: string[]): ExerciseDef[] {
  const ids = new Set(stored.map((d) => d.id));
  const names = new Set(stored.map((d) => normalizeName(d.name)));
  const off = new Set(hidden);
  return [...stored, ...LIBRARY.filter((d) => !ids.has(d.id) && !off.has(d.id) && !names.has(normalizeName(d.name)))];
}

/** Igual ao que vem na biblioteca: não precisa ficar salvo. */
function isPristine(d: ExerciseDef): boolean {
  const lib = LIBRARY_BY_ID.get(d.id);
  return !!lib && lib.name === d.name && lib.equipment === d.equipment && lib.muscle === d.muscle && lib.notes === d.notes;
}

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
  /** Copia as fichas de um modelo (todas, ou só as dos índices dados). Devolve as criadas. */
  applyTemplate: (template: TrainingTemplate, only?: number[]) => Plan[];
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function TreinosProvider({ children }: { children: ReactNode }) {
  const [modalities, setModalities] = usePersistentState<Modality[]>(MODALITIES_KEY, seedModalities, ensureDance);
  const [fresh] = useState(isFresh);
  const [all, setSessions] = usePersistentState<Session[]>(SESSIONS_KEY, seedSessions);
  const [stored, setStored] = usePersistentState<ExerciseDef[]>(EXERCISES_KEY, () => (fresh ? seedExercises() : []));
  const [hidden, setHidden] = usePersistentState<string[]>(HIDDEN_KEY, () => []);
  const exercises = useMemo(() => mergeLibrary(stored, hidden), [stored, hidden]);

  /**
   * Grava o catálogo inteiro (já com a biblioteca). Só sobe o que difere da biblioteca;
   * exercício da biblioteca que sumiu da lista passa a ficar escondido, e o que voltou deixa de estar.
   */
  const setExercises = useCallback(
    (next: ExerciseDef[] | ((list: ExerciseDef[]) => ExerciseDef[])) => {
      const list = typeof next === "function" ? next(exercises) : next;
      const present = new Set(list.map((d) => d.id));
      const removed = exercises.filter((d) => LIBRARY_BY_ID.has(d.id) && !present.has(d.id)).map((d) => d.id);
      setStored(list.filter((d) => !isPristine(d)));
      setHidden((h) => {
        const kept = h.filter((id) => !present.has(id));
        const out = [...kept, ...removed.filter((id) => !kept.includes(id))];
        return out.length === h.length && out.every((id, i) => id === h[i]) ? h : out;
      });
    },
    [exercises, setStored, setHidden],
  );
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
      applyTemplate(template, only) {
        // Cada exercício do modelo aponta para o que já está no catálogo com o mesmo
        // nome; o que foi escondido volta.
        const byName = new Map(exercises.map((d) => [normalizeName(d.name), d.id]));
        const have = new Set(exercises.map((d) => d.id));
        const restore: ExerciseDef[] = [];
        const resolve = (id: string) => {
          if (have.has(id)) return id;
          const lib = LIBRARY_BY_ID.get(id);
          if (!lib) return id;
          const same = byName.get(normalizeName(lib.name));
          if (same) return same;
          restore.push(lib);
          have.add(id);
          return id;
        };
        const created = template.plans
          .filter((_, i) => !only || only.includes(i))
          .map((p) => ({ ...p, id: crypto.randomUUID(), items: p.items.map((i) => ({ ...i, exerciseId: resolve(i.exerciseId) })) }));
        if (restore.length) setExercises((list) => [...list, ...restore]);
        setPlans((list) => [...list, ...created]);
        return created;
      },
      resetToExample() {
        setModalities(seedModalities());
        setSessions(seedSessions());
        setStored(seedExercises());
        setHidden([]);
        setPlans(seedPlans());
      },
    }),
    [modalities, sessions, planned, exercises, plans, setModalities, setSessions, setExercises, setStored, setHidden, setPlans],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTreinos(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTreinos precisa estar dentro de TreinosProvider");
  return store;
}
