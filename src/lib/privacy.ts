import { useSyncExternalStore } from "react";

/**
 * O "olhinho": esconde os valores em reais em todo o app, para abrir o
 * NishiOS perto de outras pessoas. Vale para este aparelho e fica salvo.
 *
 * `money()` e `shortMoney()` leem este estado direto, então qualquer valor
 * formatado por eles some sozinho. O `App` assina o estado para a árvore
 * inteira desenhar de novo quando ele muda; `useMemo` que monta texto com
 * valores precisa ter `hidden` nas dependências.
 */
const KEY = "nishios:valores-ocultos";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let hidden = read();
let revealDepth = 0;
const listeners = new Set<() => void>();

/** Se os valores estão ocultos agora. Use fora do React; dentro, `usePrivacy`. */
export function valuesHidden(): boolean {
  return hidden && revealDepth === 0;
}

export function setValuesHidden(next: boolean) {
  if (next === hidden) return;
  hidden = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
  listeners.forEach((l) => l());
}

/**
 * Roda `fn` com os valores visíveis, para o que sai do app (arquivo do
 * calendário do iPhone, backup) nunca levar "R$ ••••" no lugar do número.
 */
export function revealed<T>(fn: () => T): T {
  revealDepth++;
  try {
    return fn();
  } finally {
    revealDepth--;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Outra aba mudou o olhinho: acompanha.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) setValuesHidden(e.newValue === "1");
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePrivacy() {
  const isHidden = useSyncExternalStore(subscribe, () => hidden);
  return { hidden: isHidden, toggle: () => setValuesHidden(!hidden) };
}
