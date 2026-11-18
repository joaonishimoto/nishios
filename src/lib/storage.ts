import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { queuePush } from "./sync";

/**
 * Estado salvo no localStorage. É a única porta de dados do app: com login,
 * cada gravação também sobe para o Supabase (veja lib/sync.ts).
 */
export function usePersistentState<T>(
  key: string,
  initial: () => T,
  /** Ajusta o que já estava salvo, para quando o formato ou o exemplo muda. */
  migrate?: (stored: T) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw) as T;
        return migrate ? migrate(stored) : stored;
      }
    } catch {
      /* dado corrompido ou sem armazenamento: usa o valor inicial */
    }
    return initial();
  });

  useEffect(() => {
    try {
      const json = JSON.stringify(state);
      // Só conta como alteração quando o conteúdo mudou: abrir a tela não sobe nada.
      if (localStorage.getItem(key) === json) return;
      localStorage.setItem(key, json);
      queuePush(key);
    } catch {
      /* sem armazenamento: os dados valem só para esta visita */
    }
  }, [key, state]);

  return [state, setState];
}
