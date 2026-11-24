import { useCallback, useEffect, useRef, useState } from "react";
import { markDeleted, queuePush } from "./sync";

/**
 * Lista salva com uma chave por registro (`<prefixo>:<id>`), em vez de um bloco único.
 *
 * Com um bloco único, a última gravação vence: editar um item no celular e outro no
 * computador faz uma das edições sumir. Aqui cada registro sobe e desce sozinho,
 * então só há conflito quando o mesmo registro é editado em dois lugares.
 *
 * O prefixo deve começar com "nishios:" para entrar na sincronização e no backup.
 */
export interface Collection<T extends { id: string }> {
  items: T[];
  /** Grava (cria ou substitui) um registro. */
  put: (item: T) => void;
  /** Altera um registro existente; não faz nada se ele não existe. */
  patch: (id: string, fn: (item: T) => T) => void;
  remove: (id: string) => void;
}

const keyOf = (prefix: string, id: string) => `${prefix}:${id}`;

/** Lê todos os registros guardados sob o prefixo. */
export function readCollection<T extends { id: string }>(prefix: string, migrate?: (stored: T) => T): T[] {
  const found: T[] = [];
  try {
    const start = `${prefix}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(start)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(k) ?? "null") as T | null;
        if (value && typeof value === "object" && value.id) found.push(migrate ? migrate(value) : value);
      } catch {
        /* registro corrompido: fica de fora, sem derrubar os outros */
      }
    }
  } catch {
    /* sem armazenamento */
  }
  return found;
}

export function usePersistentCollection<T extends { id: string }>(
  prefix: string,
  /** Ajusta um registro salvo num formato antigo. */
  migrate?: (stored: T) => T,
): Collection<T> {
  const [items, setItems] = useState<T[]>(() => readCollection(prefix, migrate));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Outra aba gravou: relê para não sobrescrever o que ela fez.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(`${prefix}:`)) setItems(readCollection(prefix, migrate));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [prefix, migrate]);

  const write = useCallback(
    (item: T) => {
      const key = keyOf(prefix, item.id);
      try {
        const json = JSON.stringify(item);
        if (localStorage.getItem(key) !== json) {
          localStorage.setItem(key, json);
          queuePush(key);
        }
      } catch {
        /* sem armazenamento: vale só para esta visita */
      }
    },
    [prefix],
  );

  const put = useCallback(
    (item: T) => {
      write(item);
      setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item]));
    },
    [write],
  );

  const patch = useCallback(
    (id: string, fn: (item: T) => T) => {
      const current = itemsRef.current.find((i) => i.id === id);
      if (!current) return;
      put(fn(current));
    },
    [put],
  );

  const remove = useCallback(
    (id: string) => {
      const key = keyOf(prefix, id);
      try {
        localStorage.removeItem(key);
      } catch {
        /* sem armazenamento */
      }
      markDeleted([key]);
      setItems((list) => list.filter((i) => i.id !== id));
    },
    [prefix],
  );

  return { items, put, patch, remove };
}
