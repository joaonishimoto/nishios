import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { useCalendar } from "@/modules/calendario/store";
import { withEventContacts } from "./linked";
import { seedPeople } from "./seed";
import type { Gift, Interaction, Loan, Person, PersonDraft, Profile } from "./types";

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
  /** Cria ou atualiza (pelo id) um presente da pessoa. */
  saveGift: (id: string, gift: Gift) => void;
  removeGift: (id: string, giftId: string) => void;
  /** Cria ou atualiza (pelo id) um empréstimo da pessoa. */
  saveLoan: (id: string, loan: Loan) => void;
  removeLoan: (id: string, loanId: string) => void;
  saveProfile: (id: string, profile: Profile) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

const newestFirst = <T extends { date: string }>(list: T[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

/** Troca o item de mesmo id, ou acrescenta. */
const upsert = <T extends { id: string; date: string }>(list: T[] | undefined, item: T) =>
  newestFirst((list ?? []).some((x) => x.id === item.id)
    ? (list ?? []).map((x) => (x.id === item.id ? item : x))
    : [item, ...(list ?? [])]);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [rawPeople, setPeople] = usePersistentState<Person[]>(KEY, seedPeople);
  const { events } = useCalendar();
  // Na tela, os eventos do calendário já aparecem como contatos; no que é salvo, não.
  const people = useMemo(() => withEventContacts(rawPeople, events, new Date()), [rawPeople, events]);

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
        const person: Person = { ...draft, id: crypto.randomUUID(), interactions: [], gifts: [], loans: [] };
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
        const saved = { ...person, interactions: person.interactions.filter((i) => !i.eventId) };
        setPeople((list) => (list.some((p) => p.id === person.id) ? list : [...list, saved]));
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
      saveGift(id, gift) {
        patch(id, (p) => ({ ...p, gifts: upsert(p.gifts, gift) }));
      },
      removeGift(id, giftId) {
        patch(id, (p) => ({ ...p, gifts: (p.gifts ?? []).filter((g) => g.id !== giftId) }));
      },
      saveLoan(id, loan) {
        patch(id, (p) => ({ ...p, loans: upsert(p.loans, loan) }));
      },
      removeLoan(id, loanId) {
        patch(id, (p) => ({ ...p, loans: (p.loans ?? []).filter((l) => l.id !== loanId) }));
      },
      saveProfile(id, profile) {
        patch(id, (p) => ({ ...p, profile }));
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
