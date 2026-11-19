import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { today } from "@/lib/dates";
import { GoalForm } from "./GoalForm";
import { GoalPanel } from "./GoalPanel";
import { GoalsTab } from "./GoalsTab";
import { HabitForm } from "./HabitForm";
import { HabitPanel } from "./HabitPanel";
import { HabitsTab } from "./HabitsTab";
import { goalDone, goalPace } from "./logic";
import { useRoutine } from "./store";

type Tab = "habitos" | "metas";

/**
 * Rotina e metas. Tudo que abre fica na URL, para o voltar do navegador e os links de outras telas:
 * ?aba=metas, ?habito=<id> (detalhe), ?meta=<id> (detalhe), ?editar=<id>, ?novo=habito|meta.
 */
export function RotinaPage() {
  const { habits, goals } = useRoutine();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("aba") === "metas" || (params.has("meta") && !params.has("habito")) ? "metas" : "habitos";
  const now = today();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const openHabit = habits.find((h) => h.id === params.get("habito"));
  const openGoal = goals.find((g) => g.id === params.get("meta"));
  const editId = params.get("editar");
  const editHabit = habits.find((h) => h.id === editId);
  const editGoal = goals.find((g) => g.id === editId);
  const newKind = params.get("novo");

  const active = habits.filter((h) => !h.paused);
  const openGoals = goals.filter((g) => !goalDone(g));
  const late = openGoals.filter((g) => goalPace(g)?.status === "atrasada").length;

  const description =
    tab === "habitos"
      ? "Os checks de cada dia, inclusive o que você quer largar."
      : openGoals.length === 0
        ? "Os números aonde você quer chegar."
        : `${openGoals.length} ${openGoals.length === 1 ? "meta" : "metas"} em andamento${late ? `, ${late} atrás do ritmo` : ""}.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rotina e metas"
        description={description}
        action={
          <Button onClick={() => update({ novo: tab === "metas" ? "meta" : "habito" })}>
            <Plus />
            {tab === "metas" ? "Nova meta" : "Novo hábito"}
          </Button>
        }
      />

      <div className="self-start">
      <Segmented
        label="Seção"
        value={tab}
        onChange={(v) => update({ aba: v === "metas" ? "metas" : null, meta: null, habito: null })}
        options={[
          { value: "habitos", label: "Hábitos", count: active.length },
          { value: "metas", label: "Metas", count: openGoals.length },
        ]}
      />
      </div>

      {tab === "habitos" ? (
        <HabitsTab now={now} onNew={() => update({ novo: "habito" })} onOpen={(h) => update({ habito: h.id })} />
      ) : (
        <GoalsTab onNew={() => update({ novo: "meta" })} onOpen={(g) => update({ meta: g.id })} />
      )}

      <HabitPanel
        habit={editHabit ? undefined : openHabit}
        onClose={() => update({ habito: null })}
        onEdit={(h) => update({ editar: h.id })}
        onOpenGoal={(id) => update({ habito: null, aba: "metas", meta: id })}
      />
      <GoalPanel
        goal={editGoal ? undefined : openGoal}
        onClose={() => update({ meta: null })}
        onEdit={(g) => update({ editar: g.id })}
      />

      <HabitForm
        open={newKind === "habito" || !!editHabit}
        habit={editHabit}
        onOpenChange={(open) => !open && update({ novo: null, editar: null })}
      />
      <GoalForm
        open={newKind === "meta" || !!editGoal}
        goal={editGoal}
        onOpenChange={(open) => !open && update({ novo: null, editar: null })}
      />
    </div>
  );
}
