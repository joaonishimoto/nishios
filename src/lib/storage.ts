import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Estado salvo no localStorage. É a única porta de dados do app nesta fase:
 * trocar por um backend depois significa mexer só nos stores que usam este hook.
 */
export function usePersistentState<T>(
  key: string,
  initial: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* dado corrompido ou sem armazenamento: usa o valor inicial */
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* sem armazenamento: os dados valem só para esta visita */
    }
  }, [key, state]);

  return [state, setState];
}
