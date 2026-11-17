import { useMemo } from "react";
import { byUrgency, derive } from "./logic";
import { useCommitments } from "./store";

/** Compromissos atrasados ou chegando a hora, do mais urgente para o menos. */
export function useAttention() {
  const { commitments } = useCommitments();
  return useMemo(
    () =>
      commitments
        .filter((c) => {
          const s = derive(c).status;
          return s === "overdue" || s === "soon";
        })
        .sort((a, b) => byUrgency(a, b)),
    [commitments],
  );
}
