import { useCallback, useEffect, useRef, useState } from "react";
import { markDeleted, pushPending, queuePush } from "./sync";

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

/** Ids de registros implícitos que a pessoa apagou: eles não voltam. */
const removedKey = (prefix: string) => `${prefix}-removidos`;

function readRemoved(prefix: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(removedKey(prefix)) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function load<T extends { id: string }>(prefix: string, migrate?: (stored: T) => T, implicit?: () => T[]): T[] {
  const stored = readCollection(prefix, migrate);
  if (!implicit) return stored;
  const have = new Set(stored.map((i) => i.id));
  const removed = new Set(readRemoved(prefix));
  return [...implicit().filter((i) => !have.has(i.id) && !removed.has(i.id)), ...stored];
}

export function usePersistentCollection<T extends { id: string }>(
  prefix: string,
  options: {
    /** Ajusta um registro salvo num formato antigo. */
    migrate?: (stored: T) => T;
    /**
     * Registros que existem mesmo sem nada salvo (ex.: o imóvel da planta). Só ganham
     * chave na primeira edição; apagados, não voltam.
     */
    implicit?: () => T[];
  } = {},
): Collection<T> {
  const { migrate, implicit } = options;
  const [items, setItems] = useState<T[]>(() => load(prefix, migrate, implicit));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Outra aba gravou: relê para não sobrescrever o que ela fez.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(`${prefix}:`) || e.key === removedKey(prefix))
        setItems(load(prefix, migrate, implicit));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [prefix, migrate, implicit]);

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
      if (implicit?.().some((i) => i.id === id)) {
        const rk = removedKey(prefix);
        try {
          localStorage.setItem(rk, JSON.stringify([...new Set([...readRemoved(prefix), id])]));
          queuePush(rk);
        } catch {
          /* sem armazenamento */
        }
      }
      void pushPending();
      setItems((list) => list.filter((i) => i.id !== id));
    },
    [prefix, implicit],
  );

  return { items, put, patch, remove };
}
