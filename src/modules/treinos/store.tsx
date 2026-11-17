import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedModalities, seedSessions } from "./seed";
import type { Modality, ModalityDraft, Session, SessionDraft } from "./types";

const MODALITIES_KEY = "nishios:treinos:modalidades:v1";
const SESSIONS_KEY = "nishios:treinos:sessoes:v1";

interface Store {
  modalities: Modality[];
  sessions: Session[];
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
  const [modalities, setModalities] = usePersistentState<Modality[]>(MODALITIES_KEY, seedModalities);
  const [sessions, setSessions] = usePersistentState<Session[]>(SESSIONS_KEY, seedSessions);

  const store = useMemo<Store>(
    () => ({
      modalities,
      sessions,
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
    [modalities, sessions, setModalities, setSessions],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useTreinos(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTreinos precisa estar dentro de TreinosProvider");
  return store;
}
