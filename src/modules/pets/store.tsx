import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedPets } from "./seed";
import type { Care, HealthRecord, Pet, PetDraft, Weight } from "./types";

const KEY = "nishios:pets:v1";

/** As três listas que vivem dentro de cada pet. */
type ListKey = "cares" | "health" | "weights";
type Item<K extends ListKey> = Pet[K][number];

interface Store {
  pets: Pet[];
  createPet: (draft: PetDraft) => Pet;
  updatePet: (id: string, draft: PetDraft) => void;
  removePet: (id: string) => void;
  restorePet: (pet: Pet) => void;
  /** Cria ou atualiza (pelo id) um item de uma das listas do pet. */
  saveItem: <K extends ListKey>(petId: string, list: K, item: Item<K>) => void;
  removeItem: (petId: string, list: ListKey, itemId: string) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export const newId = () => crypto.randomUUID();

export function PetsProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = usePersistentState<Pet[]>(KEY, seedPets);

  const store = useMemo<Store>(() => {
    const patch = (id: string, fn: (p: Pet) => Pet) =>
      setPets((list) => list.map((p) => (p.id === id ? fn(p) : p)));

    return {
      pets,
      createPet(draft) {
        const pet: Pet = { ...draft, id: newId(), cares: [], health: [], weights: [] };
        setPets((list) => [...list, pet]);
        return pet;
      },
      updatePet(id, draft) {
        patch(id, (p) => ({ ...p, ...draft }));
      },
      removePet(id) {
        setPets((list) => list.filter((p) => p.id !== id));
      },
      restorePet(pet) {
        setPets((list) => (list.some((p) => p.id === pet.id) ? list : [...list, pet]));
      },
      saveItem(petId, list, item) {
        patch(petId, (p) => {
          const current = p[list] as (Care | HealthRecord | Weight)[];
          const exists = current.some((x) => x.id === item.id);
          return {
            ...p,
            [list]: exists ? current.map((x) => (x.id === item.id ? item : x)) : [...current, item],
          };
        });
      },
      removeItem(petId, list, itemId) {
        patch(petId, (p) => ({
          ...p,
          [list]: (p[list] as { id: string }[]).filter((x) => x.id !== itemId),
        }));
      },
      resetToExample() {
        setPets(seedPets());
      },
    };
  }, [pets, setPets]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePets(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("usePets precisa estar dentro de PetsProvider");
  return store;
}
