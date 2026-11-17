import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedEntries, seedProfile } from "./seed";
import type { Entry, EntryDraft, Profile } from "./types";

const ENTRIES_KEY = "nishios:corpo:v1";
const PROFILE_KEY = "nishios:corpo:perfil";

interface Store {
  entries: Entry[];
  profile: Profile;
  create: (draft: EntryDraft) => Entry;
  update: (id: string, draft: EntryDraft) => void;
  remove: (id: string) => void;
  restore: (entry: Entry) => void;
  setHeight: (height: number) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function CorpoProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = usePersistentState<Entry[]>(ENTRIES_KEY, seedEntries);
  const [profile, setProfile] = usePersistentState<Profile>(PROFILE_KEY, seedProfile);

  const store = useMemo<Store>(
    () => ({
      entries,
      profile,
      create(draft) {
        const entry: Entry = { ...draft, id: crypto.randomUUID() };
        setEntries((list) => [...list, entry]);
        return entry;
      },
      update(id, draft) {
        setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...draft } : e)));
      },
      remove(id) {
        setEntries((list) => list.filter((e) => e.id !== id));
      },
      restore(entry) {
        setEntries((list) => (list.some((e) => e.id === entry.id) ? list : [...list, entry]));
      },
      setHeight(height) {
        setProfile((p) => ({ ...p, height }));
      },
      resetToExample() {
        setEntries(seedEntries());
        setProfile(seedProfile());
      },
    }),
    [entries, setEntries, profile, setProfile],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCorpo(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCorpo precisa estar dentro de CorpoProvider");
  return store;
}
