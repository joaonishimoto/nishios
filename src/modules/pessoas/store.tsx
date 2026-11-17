import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedPeople } from "./seed";
import type { Interaction, Person, PersonDraft } from "./types";

const KEY = "nishios:pessoas:v1";

interface Store {
  people: Person[];
  create: (draft: PersonDraft) => Person;
  update: (id: string, draft: PersonDraft) => void;
  remove: (id: string) => void;
  restore: (person: Person) => void;
  logInteraction: (id: string, interaction: Omit<Interaction, "id">) => Interaction;
  addInteraction: (id: string, interaction: Interaction) => void;
  removeInteraction: (id: string, interactionId: string) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

const newestFirst = (list: Interaction[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = usePersistentState<Person[]>(KEY, seedPeople);

  const store = useMemo<Store>(() => {
    const patch = (id: string, fn: (p: Person) => Person) =>
      setPeople((list) => list.map((p) => (p.id === id ? fn(p) : p)));
    const addInteraction = (id: string, interaction: Interaction) =>
      patch(id, (p) =>
        p.interactions.some((i) => i.id === interaction.id)
          ? p
          : { ...p, interactions: newestFirst([interaction, ...p.interactions]) },
      );

    return {
      people,
      create(draft) {
        const person: Person = { ...draft, id: crypto.randomUUID(), interactions: [] };
        setPeople((list) => [...list, person]);
        return person;
      },
      update(id, draft) {
        patch(id, (p) => ({ ...p, ...draft }));
      },
      remove(id) {
        setPeople((list) => list.filter((p) => p.id !== id));
      },
      restore(person) {
        setPeople((list) => (list.some((p) => p.id === person.id) ? list : [...list, person]));
      },
      logInteraction(id, interaction) {
        const created = { ...interaction, id: crypto.randomUUID() };
        addInteraction(id, created);
        return created;
      },
      addInteraction,
      removeInteraction(id, interactionId) {
        patch(id, (p) => ({
          ...p,
          interactions: p.interactions.filter((i) => i.id !== interactionId),
        }));
      },
      resetToExample() {
        setPeople(seedPeople());
      },
    };
  }, [people, setPeople]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePeople(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("usePeople precisa estar dentro de PeopleProvider");
  return store;
}
