import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedEvents } from "./seed";
import type { CalEvent, EventDraft, SourceId } from "./types";

const EVENTS_KEY = "nishios:calendario:v1";
const HIDDEN_KEY = "nishios:calendario:camadas-ocultas";

interface Store {
  /** Eventos criados aqui e os trazidos do iPhone, juntos. */
  events: CalEvent[];
  create: (draft: EventDraft) => CalEvent;
  update: (id: string, draft: EventDraft) => void;
  remove: (id: string) => void;
  restore: (event: CalEvent) => void;
  /** Troca tudo o que veio do iPhone pelo conteúdo do arquivo novo. */
  replaceImported: (events: CalEvent[]) => void;
  hidden: SourceId[];
  toggleSource: (id: SourceId) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export const newId = () => crypto.randomUUID();

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = usePersistentState<CalEvent[]>(EVENTS_KEY, seedEvents);
  const [hidden, setHidden] = usePersistentState<SourceId[]>(HIDDEN_KEY, () => []);

  const store = useMemo<Store>(
    () => ({
      events,
      create(draft) {
        const event: CalEvent = { ...draft, id: newId(), origin: "nishios" };
        setEvents((list) => [...list, event]);
        return event;
      },
      update(id, draft) {
        setEvents((list) => list.map((e) => (e.id === id ? { ...e, ...draft } : e)));
      },
      remove(id) {
        setEvents((list) => list.filter((e) => e.id !== id));
      },
      restore(event) {
        setEvents((list) => (list.some((e) => e.id === event.id) ? list : [...list, event]));
      },
      replaceImported(imported) {
        setEvents((list) => [...list.filter((e) => e.origin !== "iphone"), ...imported]);
      },
      hidden,
      toggleSource(id) {
        setHidden((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
      },
      resetToExample() {
        setEvents(seedEvents());
        setHidden([]);
      },
    }),
    [events, setEvents, hidden, setHidden],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCalendar(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCalendar precisa estar dentro de CalendarProvider");
  return store;
}
