import { useMemo } from "react";
import { add } from "date-fns";
import { toISO, today } from "@/lib/dates";
import { useBens } from "@/modules/bens/store";
import { useCorpo } from "@/modules/corpo/store";
import { useCommitments } from "@/modules/compromissos/store";
import { useFinancas } from "@/modules/financas/store";
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
  const { modalities, sessions, planned: plannedSessions } = useTreinos();
  const { entries } = useCorpo();
  const { assets, wishes } = useBens();
  const { people } = usePeople();
  const { pets } = usePets();
  const { skills } = useSkills();
  const { recurrences } = useFinancas();
  return useMemo(
    () => ({ events, tasks, commitments, goals, modalities, sessions, plannedSessions, entries, assets, wishes, people, pets, skills, recurrences }),
    [events, tasks, commitments, goals, modalities, sessions, plannedSessions, entries, assets, wishes, people, pets, skills, recurrences],
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

/**
 * Tudo o que ficou para trás em qualquer módulo, do mais antigo para o mais
 * novo. É a mesma lista que o painel de hoje e o sino de avisos mostram.
 */
export function useOverdue(respectLayers = false): CalItem[] {
  const now = today();
  const { items, all } = useCalendarItems(toISO(add(now, { years: -2 })), toISO(add(now, { days: -1 })));
  const source = respectLayers ? items : all;
  return useMemo(() => source.filter((i) => i.state === "overdue"), [source]);
}
