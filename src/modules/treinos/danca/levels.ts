import { LEVEL_ORDER, type DanceLevel, type DanceStep } from "./types";

export interface LevelMeta {
  label: string;
  /** Cor da faixa; a mesma no tema claro e no escuro, como uma faixa de verdade. */
  color: string;
  /** Borda para as faixas claras não sumirem no fundo. */
  border: string;
}

export const LEVEL_META: Record<DanceLevel, LevelMeta> = {
  nao: { label: "Não aprendi", color: "transparent", border: "var(--border-strong)" },
  transparente: { label: "Transparente", color: "rgba(186, 214, 232, 0.35)", border: "#9fbdd2" },
  branco: { label: "Branco", color: "#ffffff", border: "#b9bcc2" },
  azul: { label: "Azul", color: "#2563eb", border: "#1d4fc4" },
  roxo: { label: "Roxo", color: "#7c3aed", border: "#6528cf" },
  preto: { label: "Preto", color: "#18181b", border: "#52525b" },
  vermelho: { label: "Vermelho", color: "#dc2626", border: "#b91c1c" },
};

export const levelIndex = (level: DanceLevel) => LEVEL_ORDER.indexOf(level);

/** Histórico em ordem de data; no mesmo dia, vale a ordem em que foi registrado. */
export function sortedHistory(step: DanceStep) {
  return step.history
    .map((h, i) => ({ h, i }))
    .sort((a, b) => a.h.date.localeCompare(b.h.date) || a.i - b.i)
    .map(({ h }) => h);
}

export function currentLevel(step: DanceStep): DanceLevel {
  const list = sortedHistory(step);
  return list.length ? list[list.length - 1].level : "nao";
}

/** Data da última mudança de faixa, ou vazio. */
export function lastChange(step: DanceStep): string {
  const list = sortedHistory(step);
  return list.length ? list[list.length - 1].date : "";
}

/** Todas as mudanças de todos os passos, da mais nova para a mais antiga. */
export function recentChanges(steps: DanceStep[]) {
  return steps
    .flatMap((step) => {
      const list = sortedHistory(step);
      return list.map((h, i) => ({ step, change: h, from: i > 0 ? list[i - 1].level : ("nao" as DanceLevel) }));
    })
    .sort((a, b) => b.change.date.localeCompare(a.change.date));
}
