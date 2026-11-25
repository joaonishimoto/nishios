import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Link2, Plus, Target } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { isMoneyUnit } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { useFinancas } from "@/modules/financas/store";
import { useSkills } from "@/modules/skills/store";
import { useTreinos } from "@/modules/treinos/store";
import { linkLabel, linkRoute } from "./linked";
import {
  deadlineLabel,
  goalAmountLabel,
  goalDone,
  goalPace,
  goalProgress,
  PACE_LABEL,
  type PaceStatus,
} from "./logic";
import { useRoutine } from "./store";
import type { Goal } from "./types";

type Filter = "andamento" | "concluidas" | "todas";

export const PACE_TONE: Record<PaceStatus, Tone> = {
  adiantada: "success",
  "no-ritmo": "info",
  atrasada: "warning",
};

/** Prazo mais perto primeiro; sem prazo vão para o fim, as mais adiantadas antes. */
function byUrgency(a: Goal, b: Goal) {
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return goalProgress(b) - goalProgress(a);
}

export function GoalsTab({ onNew, onOpen }: { onNew: () => void; onOpen: (goal: Goal) => void }) {
  const { goals } = useRoutine();
  const [filter, setFilter] = useState<Filter>("andamento");
  const open = goals.filter((g) => !goalDone(g));
  const done = goals.filter(goalDone);
  const list = (filter === "andamento" ? open : filter === "concluidas" ? done : goals).slice().sort(byUrgency);
  const late = open.filter((g) => goalPace(g)?.status === "atrasada").length;

  if (goals.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Nenhuma meta ainda"
        description="Uma meta tem um número e, se quiser, um prazo: 24 livros no ano, 500 km corridos, a reserva de emergência. Também pode ser uma lista de etapas."
        action={
          <Button onClick={onNew}>
            <Plus />
            Nova meta
          </Button>
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filtrar metas"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "andamento", label: "Em andamento", count: open.length },
            { value: "concluidas", label: "Concluídas", count: done.length },
            { value: "todas", label: "Todas", count: goals.length },
          ]}
        />
        {filter === "andamento" && late > 0 && (
          <p className="text-sm text-warning-strong">
            {late === 1 ? "1 meta está atrás do ritmo do prazo." : `${late} metas estão atrás do ritmo do prazo.`}
          </p>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          size="sm"
          frame="solid"
          icon={filter === "andamento" ? Check : Target}
          tone={filter === "andamento" ? "success" : "neutral"}
          title={filter === "andamento" ? "Todas as metas foram batidas" : "Nenhuma meta concluída ainda"}
          description={filter === "andamento" ? "Hora de pensar na próxima." : "Quando uma chegar no alvo, ela aparece aqui."}
          action={
            filter === "andamento" ? (
              <Button variant="outline" onClick={onNew}>
                <Plus />
                Nova meta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => onOpen(g)} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Barra de progresso com um risco onde a meta deveria estar hoje, se tem prazo. */
export function GoalBar({ goal, className }: { goal: Goal; className?: string }) {
  const progress = goalProgress(goal);
  const done = goalDone(goal);
  const pace = goalPace(goal);
  const pct = Math.round(progress * 100);
  return (
    <div className={cn("relative", className)}>
      <div
        role="progressbar"
        aria-label={`Progresso de ${goal.name}`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-(--motion-slow) ease-(--ease-out)",
            done ? "bg-success" : pace?.status === "atrasada" ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pace && pace.expected > 0 && pace.expected < 1 && (
        <span
          aria-hidden
          title={`Onde deveria estar hoje: ${Math.round(pace.expected * 100)}%`}
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground/50"
          style={{ left: `${pace.expected * 100}%` }}
        />
      )}
    </div>
  );
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { habits, updateGoal } = useRoutine();
  const { modalities } = useTreinos();
  const { skills } = useSkills();
  const { investments } = useFinancas();
  const done = goalDone(goal);
  const progress = goalProgress(goal);
  const deadline = deadlineLabel(goal);
  const pace = goalPace(goal);
  const nextStep = goal.steps?.find((s) => !s.done);

  return (
    <li className="relative flex min-w-0 flex-col rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{goal.icon}</span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
          >
            {goal.name}
          </button>
          <p className="text-sm text-muted-foreground">{goalAmountLabel(goal)}</p>
        </div>
        {done ? (
          <Badge tone="success">
            <Check className="size-3" />
            Concluída
          </Badge>
        ) : (
          <span className="text-lg font-semibold tabular-nums">{Math.round(progress * 100)}%</span>
        )}
      </div>

      <GoalBar goal={goal} className="mt-4" />

      <div className="mt-3 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="flex min-w-0 items-center gap-2">
          {pace && <Badge tone={PACE_TONE[pace.status]}>{PACE_LABEL[pace.status]}</Badge>}
          <span className={cn("text-sm", deadline === "Prazo vencido" ? "text-danger-strong" : "text-muted-foreground")}>
            {deadline}
          </span>
        </span>
        {!done && !goal.link && !goal.steps && <QuickUpdate goal={goal} />}
        {goal.link && goal.link.kind !== "habito" && (
          <Link to={linkRoute(goal.link)} className="relative z-10 text-sm font-medium text-primary hover:underline">
            Abrir origem
          </Link>
        )}
      </div>

      {nextStep && (
        <div className="relative z-10 mt-2 flex items-center gap-2.5 border-t border-border pt-2 text-sm">
          <Checkbox
            checked={false}
            label={`Concluir a etapa ${nextStep.text}`}
            onChange={() =>
              updateGoal(goal.id, { steps: goal.steps!.map((s) => (s.id === nextStep.id ? { ...s, done: true } : s)) })
            }
          />
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground">Próxima etapa: </span>
            {nextStep.text}
          </span>
        </div>
      )}

      {goal.link && (
        <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-sm text-muted-foreground">
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{linkLabel(goal.link, { modalities, habits, skills, investments })}</span>
        </p>
      )}
    </li>
  );
}

/** +1 de um toque e "Atualizar" para digitar o número. Só nas metas que você atualiza. */
export function QuickUpdate({ goal }: { goal: Goal }) {
  const { updateGoal } = useRoutine();
  const isMoney = goal.unit.trim().toLowerCase() === "reais";
  const descends = goal.start !== undefined && goal.start > goal.target;
  return (
    <span className="relative z-10 flex items-center gap-1.5">
      {!isMoney && !descends && (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Somar 1 em ${goal.name}`}
          onClick={() => updateGoal(goal.id, { current: goal.current + 1 })}
        >
          +1
        </Button>
      )}
      <UpdateProgress goal={goal} />
    </span>
  );
}

function UpdateProgress({ goal }: { goal: Goal }) {
  const { updateGoal } = useRoutine();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n < 0) return;
    updateGoal(goal.id, { current: n });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(String(goal.current));
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Atualizar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Onde está agora" hint={`Alvo: ${goal.target} ${goal.unit}`.trim()}>
            {(id) =>
              isMoneyUnit(goal.unit) ? (
                <MoneyInput
                  id={id}
                  autoFocus
                  value={value === "" ? undefined : Number(value)}
                  onValueChange={(v) => setValue(v === undefined ? "" : String(v))}
                />
              ) : (
                <Input
                  placeholder="0"
                  id={id}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={value}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setValue(e.target.value)}
                />
              )
            }
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Atualizar progresso
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
