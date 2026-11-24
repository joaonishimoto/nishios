import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentCollection } from "@/lib/collection";
import { toISO, today } from "@/lib/dates";
import { emptyCosts } from "./logic";
import { MAIN_ID, mainProperty } from "./seed";
import type { Property, PropertyDraft } from "./types";

/**
 * Cada imóvel fica na sua chave, `nishios:imoveis:item:<id>`. Assim a sincronização (que vale
 * a última gravação de cada chave) nunca troca um imóvel inteiro por causa de outro.
 */
export const PROPERTY_PREFIX = "nishios:imoveis:item";

/** O apartamento da planta existe mesmo antes de ser editado. */
const implicit = () => [mainProperty()];

/** Preenche campos que versões antigas não tinham. */
function migrate(p: Property): Property {
  return {
    ...p,
    values: Array.isArray(p.values) ? p.values : [],
    costs: { ...emptyCosts(), ...(p.costs ?? {}) },
    plan: p.id === MAIN_ID ? "apartamento" : p.plan,
  };
}

const ORDER: Record<Property["situation"], number> = { mora: 0, aluguel: 0, renda: 1, vazio: 2, obra: 3, vendido: 4 };

export function sortProperties(list: Property[]): Property[] {
  return [...list].sort(
    (a, b) =>
      ORDER[a.situation] - ORDER[b.situation] ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
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
  const collection = usePersistentCollection<Property>(PROPERTY_PREFIX, { migrate, implicit });
  const { items, put, patch, remove } = collection;

  const store = useMemo<Store>(() => {
    const properties = sortProperties(items);
    return {
      properties,
      get: (id) => properties.find((p) => p.id === id),
      create(draft) {
        const p: Property = { ...draft, id: crypto.randomUUID(), createdAt: toISO(today()) };
        put(p);
        return p;
      },
      update(id, changes) {
        patch(id, (p) => ({ ...p, ...changes, id }));
      },
      remove(id) {
        // O apartamento da planta não sai: para ele, o caminho é marcar como vendido.
        if (id !== MAIN_ID) remove(id);
      },
      restore(p) {
        put(p);
      },
    };
  }, [items, put, patch, remove]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useImoveis(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useImoveis precisa estar dentro de ImoveisProvider");
  return store;
}
