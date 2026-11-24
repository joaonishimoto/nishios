import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { markDeleted, pushPending, queuePush } from "@/lib/sync";
import { toISO, today } from "@/lib/dates";
import { emptyCosts } from "./logic";
import { MAIN_ID, mainProperty } from "./seed";
import type { Property, PropertyDraft } from "./types";

/**
 * Cada imóvel fica na sua chave, `nishios:imoveis:<id>`. Assim a sincronização (que vale a
 * última gravação de cada chave) nunca troca um imóvel inteiro por causa de outro, e editar o
 * aluguel no celular não desfaz a avaliação feita no computador em outro imóvel.
 */
export const PROPERTY_PREFIX = "nishios:imoveis:";
const keyOf = (id: string) => `${PROPERTY_PREFIX}${id}`;

function readAll(): Property[] {
  const found: Property[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PROPERTY_PREFIX)) continue;
      try {
        const p = JSON.parse(localStorage.getItem(k) ?? "null") as Property | null;
        if (p && typeof p === "object" && p.id) found.push(normalize(p));
      } catch {
        /* imóvel corrompido: fica de fora, sem derrubar os outros */
      }
    }
  } catch {
    /* sem armazenamento */
  }
  // O apartamento da planta existe mesmo antes de ser editado.
  if (!found.some((p) => p.id === MAIN_ID)) found.push(mainProperty());
  return sortProperties(found);
}

/** Preenche campos que versões antigas não tinham. */
function normalize(p: Property): Property {
  const base = p.id === MAIN_ID ? mainProperty() : undefined;
  return {
    ...p,
    values: Array.isArray(p.values) ? p.values : [],
    costs: { ...emptyCosts(), ...(p.costs ?? {}) },
    plan: base?.plan ?? p.plan,
  };
}

const ORDER: Record<Property["situation"], number> = { mora: 0, aluguel: 0, renda: 1, vazio: 2, obra: 3, vendido: 4 };

export function sortProperties(list: Property[]): Property[] {
  return [...list].sort(
    (a, b) => ORDER[a.situation] - ORDER[b.situation] || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name, "pt-BR"),
  );
}

function write(p: Property) {
  try {
    localStorage.setItem(keyOf(p.id), JSON.stringify(p));
    queuePush(keyOf(p.id));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

interface Store {
  properties: Property[];
  get: (id: string) => Property | undefined;
  create: (draft: PropertyDraft) => Property;
  update: (id: string, patch: Partial<Omit<Property, "id">>) => void;
  remove: (id: string) => void;
  restore: (p: Property) => void;
}

const Ctx = createContext<Store | null>(null);

export function ImoveisProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(readAll);

  const store = useMemo<Store>(() => {
    const put = (p: Property) => {
      write(p);
      setProperties((list) => sortProperties([...list.filter((x) => x.id !== p.id), p]));
    };
    return {
      properties,
      get: (id) => properties.find((p) => p.id === id),
      create(draft) {
        const p: Property = { ...draft, id: crypto.randomUUID(), createdAt: toISO(today()) };
        put(p);
        return p;
      },
      update(id, patch) {
        const current = properties.find((p) => p.id === id);
        if (!current) return;
        put({ ...current, ...patch, id });
      },
      remove(id) {
        // O apartamento da planta não sai: para ele, o caminho é marcar como vendido.
        if (id === MAIN_ID) return;
        try {
          localStorage.removeItem(keyOf(id));
          markDeleted([keyOf(id)]);
          void pushPending();
        } catch {
          /* sem armazenamento */
        }
        setProperties((list) => list.filter((p) => p.id !== id));
      },
      restore(p) {
        put(p);
      },
    };
  }, [properties]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useImoveis(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useImoveis precisa estar dentro de ImoveisProvider");
  return store;
}
