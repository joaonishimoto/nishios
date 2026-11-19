import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { seedSteps } from "./seed";
import type { DanceLevel, DanceStep } from "./types";

export const STEPS_KEY = "nishios:treinos:passos:v1";
/** Lido antes de qualquer gravação: diz se este navegador está abrindo o app pela primeira vez. */
const MODALITIES_KEY = "nishios:treinos:modalidades:v1";

interface Store {
  steps: DanceStep[];
  createStep: (modalityId: string, name?: string, category?: string) => DanceStep;
  updateStep: (id: string, patch: Partial<Omit<DanceStep, "id">>) => void;
  /** Muda a faixa do passo e guarda a mudança com a data. */
  setLevel: (id: string, level: DanceLevel, date?: string, note?: string) => void;
  removeStep: (id: string) => void;
  restoreStep: (step: DanceStep) => void;
}

const Ctx = createContext<Store | null>(null);

export const newId = () => crypto.randomUUID();

export function DanceProvider({ children }: { children: ReactNode }) {
  // Quem já usava o app começa com a lista vazia; só uma instalação nova vê os exemplos.
  const [fresh] = useState(() => {
    try {
      return localStorage.getItem(MODALITIES_KEY) === null;
    } catch {
      return true;
    }
  });
  const [steps, setSteps] = usePersistentState<DanceStep[]>(STEPS_KEY, () => (fresh ? seedSteps() : []));

  const store = useMemo<Store>(
    () => ({
      steps,
      createStep(modalityId, name = "", category = "") {
        const step: DanceStep = {
          id: newId(),
          modalityId,
          name,
          category,
          videos: [],
          tips: [],
          history: [],
          createdAt: new Date().toISOString(),
        };
        setSteps((list) => [...list, step]);
        return step;
      },
      updateStep(id, patch) {
        setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      },
      setLevel(id, level, date = toISO(today()), note = "") {
        setSteps((list) =>
          list.map((s) => (s.id === id ? { ...s, history: [...s.history, { id: newId(), date, level, note }] } : s)),
        );
      },
      removeStep(id) {
        setSteps((list) => list.filter((s) => s.id !== id));
      },
      restoreStep(step) {
        setSteps((list) => (list.some((s) => s.id === step.id) ? list : [...list, step]));
      },
    }),
    [steps, setSteps],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDance(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDance precisa estar dentro de DanceProvider");
  return store;
}
