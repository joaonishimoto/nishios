import { useMemo } from "react";
import { toISO, today } from "@/lib/dates";
import { useBens } from "@/modules/bens/store";
import { useCommitments } from "@/modules/compromissos/store";
import { usePeople } from "@/modules/pessoas/store";
import { usePets } from "@/modules/pets/store";
import { useRoutine } from "@/modules/rotina/store";
import { useSkills } from "@/modules/skills/store";
import { useTasks } from "@/modules/tarefas/store";
import { useTreinos } from "@/modules/treinos/store";
import { collect, type Everything } from "./collect";
import { useCalendar } from "./store";
import type { CalItem } from "./types";

/** Tudo o que os módulos sabem, no formato que `collect` espera. */
export function useEverything(): Everything {
  const { events } = useCalendar();
  const { tasks } = useTasks();
  const { commitments } = useCommitments();
  const { goals } = useRoutine();
  const { modalities, sessions } = useTreinos();
  const { assets, wishes } = useBens();
  const { people } = usePeople();
  const { pets } = usePets();
  const { skills } = useSkills();
  return useMemo(
    () => ({ events, tasks, commitments, goals, modalities, sessions, assets, wishes, people, pets, skills }),
    [events, tasks, commitments, goals, modalities, sessions, assets, wishes, people, pets, skills],
  );
}

/** Itens do calendário entre duas datas, já sem as camadas ocultas. */
export function useCalendarItems(from: string, to: string): { items: CalItem[]; all: CalItem[] } {
  const data = useEverything();
  const { hidden } = useCalendar();
  const todayISO = toISO(today());
  return useMemo(() => {
    const all = collect(data, from, to, today());
    return { all, items: all.filter((i) => !hidden.includes(i.source)) };
    // todayISO entra para recalcular quando o dia vira com o app aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, from, to, hidden, todayISO]);
}
