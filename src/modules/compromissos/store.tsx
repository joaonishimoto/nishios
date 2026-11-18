import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedCommitments } from "./seed";
import type { Commitment, CommitmentDraft } from "./types";

const KEY = "nishios:compromissos:v1";

const sortDesc = (dates: string[]) => [...new Set(dates)].sort().reverse();

function fromDraft(draft: CommitmentDraft): Omit<Commitment, "id" | "history"> {
  const { lastDone: _lastDone, ...rest } = draft;
  // A data marcada só faz sentido no compromisso pontual.
  return rest.repeats === false ? rest : { ...rest, date: undefined };
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
  const [commitments, setCommitments] = usePersistentState<Commitment[]>(KEY, seedCommitments);

  const patch = useCallback((id: string, fn: (c: Commitment) => Commitment) => {
    setCommitments((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, [setCommitments]);

  const store = useMemo<Store>(
    () => ({
      commitments,
      create(draft) {
        const created: Commitment = {
          ...fromDraft(draft),
          id: crypto.randomUUID(),
          history: draft.repeats !== false && draft.lastDone ? [draft.lastDone] : [],
        };
        setCommitments((list) => [...list, created]);
        return created;
      },
      update(id, draft) {
        patch(id, (c) => ({
          ...c,
          ...fromDraft(draft),
          // O campo "última vez" do formulário substitui só o registro mais recente.
          // No pontual esse campo não aparece, então o histórico fica como está.
          history: draft.repeats === false
            ? c.history
            : draft.lastDone
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
    [commitments, patch, setCommitments],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCommitments(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCommitments precisa estar dentro de CommitmentsProvider");
  return store;
}
