import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedCommitments } from "./seed";
import type { Commitment, CommitmentDraft } from "./types";

const KEY = "nishios:compromissos:v1";

function load(): Commitment[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Commitment[];
  } catch {
    /* dado corrompido ou sem armazenamento: volta para o exemplo */
  }
  return seedCommitments();
}

const sortDesc = (dates: string[]) => [...new Set(dates)].sort().reverse();

function fromDraft(draft: CommitmentDraft): Omit<Commitment, "id" | "history"> {
  const { lastDone: _lastDone, ...rest } = draft;
  return rest;
}

interface Store {
  commitments: Commitment[];
  create: (draft: CommitmentDraft) => Commitment;
  update: (id: string, draft: CommitmentDraft) => void;
  remove: (id: string) => void;
  restore: (commitment: Commitment) => void;
  markDone: (id: string, date: string) => void;
  removeDone: (id: string, date: string) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function CommitmentsProvider({ children }: { children: ReactNode }) {
  const [commitments, setCommitments] = useState<Commitment[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(commitments));
    } catch {
      /* sem armazenamento: os dados valem só para esta visita */
    }
  }, [commitments]);

  const patch = useCallback((id: string, fn: (c: Commitment) => Commitment) => {
    setCommitments((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const store = useMemo<Store>(
    () => ({
      commitments,
      create(draft) {
        const created: Commitment = {
          ...fromDraft(draft),
          id: crypto.randomUUID(),
          history: draft.lastDone ? [draft.lastDone] : [],
        };
        setCommitments((list) => [...list, created]);
        return created;
      },
      update(id, draft) {
        patch(id, (c) => ({
          ...c,
          ...fromDraft(draft),
          // O campo "última vez" do formulário substitui só o registro mais recente.
          history: draft.lastDone
            ? sortDesc([draft.lastDone, ...c.history.slice(1)])
            : c.history.slice(1),
        }));
      },
      remove(id) {
        setCommitments((list) => list.filter((c) => c.id !== id));
      },
      restore(commitment) {
        setCommitments((list) =>
          list.some((c) => c.id === commitment.id) ? list : [...list, commitment],
        );
      },
      markDone(id, date) {
        patch(id, (c) => ({ ...c, history: sortDesc([date, ...c.history]) }));
      },
      removeDone(id, date) {
        patch(id, (c) => ({ ...c, history: c.history.filter((d) => d !== date) }));
      },
      resetToExample() {
        setCommitments(seedCommitments());
      },
    }),
    [commitments, patch],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCommitments(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCommitments precisa estar dentro de CommitmentsProvider");
  return store;
}
