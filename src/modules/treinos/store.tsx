import { createContext, useContext, useMemo, type ReactNode } from "react";
import { toISO, today } from "@/lib/dates";
import { usePersistentState } from "@/lib/storage";
import { ensureDance } from "./danca/migrate";
import { seedModalities, seedSessions } from "./seed";
import type { Modality, ModalityDraft, Session, SessionDraft } from "./types";

const MODALITIES_KEY = "nishios:treinos:modalidades:v1";
const SESSIONS_KEY = "nishios:treinos:sessoes:v1";

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
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function TreinosProvider({ children }: { children: ReactNode }) {
  const [modalities, setModalities] = usePersistentState<Modality[]>(MODALITIES_KEY, seedModalities, ensureDance);
  const [all, setSessions] = usePersistentState<Session[]>(SESSIONS_KEY, seedSessions);
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
      resetToExample() {
        setModalities(seedModalities());
        setSessions(seedSessions());
      },
    }),
    [modalities, sessions, planned, setModalities, setSessions],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTreinos(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTreinos precisa estar dentro de TreinosProvider");
  return store;
}
