import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Flame, Link2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { toISO, today } from "@/lib/dates";
import { useTreinos } from "@/modules/treinos/store";
import { GoalForm } from "./GoalForm";
import { linkLabel, linkRoute } from "./linked";
import { HabitForm } from "./HabitForm";
import {
  currentWeek,
  deadlineLabel,
  goalAmountLabel,
  goalDone,
  goalProgress,
  isDone,
  isScheduled,
  scheduleLabel,
  streak,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
} from "./logic";
import { useRoutine } from "./store";
import type { Goal, Habit } from "./types";

export function RotinaPage() {
  const { habits, goals } = useRoutine();
  const [habitForm, setHabitForm] = useState<{ open: boolean; habit?: Habit }>({ open: false });
  const [goalForm, setGoalForm] = useState<{ open: boolean; goal?: Goal }>({ open: false });

  const now = today();
  const week = currentWeek(now);
  const dueToday = habits.filter((h) => isScheduled(h, now));
  const doneToday = dueToday.filter((h) => isDone(h, now)).length;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Rotina e metas"
        description="Os checks de cada dia e os números aonde você quer chegar."
      />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Checks da semana</h2>
            <p className="mt-0.5 text-muted-foreground">
              {dueToday.length === 0
                ? "Nenhum hábito previsto para hoje."
                : doneToday === dueToday.length
                  ? `Tudo feito hoje: ${doneToday} de ${dueToday.length}.`
                  : `${doneToday} de ${dueToday.length} feitos hoje.`}
            </p>
          </div>
          <Button variant="outline" onClick={() => setHabitForm({ open: true })}>
            <Plus />
            Novo hábito
          </Button>
        </div>

        {habits.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nenhum hábito ainda"
              description="Comece com um só, pequeno o bastante para fazer todo dia."
              action={
                <Button onClick={() => setHabitForm({ open: true })}>
                  <Plus />
                  Novo hábito
                </Button>
              }
            />
          </div>
        ) : (
          <>
          <ul className="mt-4 overflow-hidden rounded-lg border border-border bg-surface sm:hidden">
            {habits.map((h) => (
              <HabitBlock
                key={h.id}
                habit={h}
                week={week}
                now={now}
                onEdit={() => setHabitForm({ open: true, habit: h })}
              />
            ))}
          </ul>
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left font-normal">
                    Hábito
                  </th>
                  {week.map((day) => {
                    const isToday = toISO(day) === toISO(now);
                    return (
                      <th
                        key={day.getTime()}
                        scope="col"
                        abbr={WEEKDAY_LONG[day.getDay()]}
                        className={cn(
                          "w-9 py-1.5 text-center font-normal sm:w-12",
                          isToday && "bg-surface-selected font-semibold text-foreground",
                        )}
                      >
                        <span className="block text-xs">{WEEKDAY_SHORT[day.getDay()]}</span>
                        <span className="block tabular-nums">{day.getDate()}</span>
                      </th>
                    );
                  })}
                  <th scope="col" className="hidden w-28 px-3 text-right font-normal md:table-cell">
                    Sequência
                  </th>
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    week={week}
                    now={now}
                    onEdit={() => setHabitForm({ open: true, habit: h })}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Metas</h2>
          <Button variant="outline" onClick={() => setGoalForm({ open: true })}>
            <Plus />
            Nova meta
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nenhuma meta ainda"
              description="Uma meta tem um número e, se quiser, um prazo: 24 livros no ano, 500 km corridos."
              action={
                <Button onClick={() => setGoalForm({ open: true })}>
                  <Plus />
                  Nova meta
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={() => setGoalForm({ open: true, goal: g })} />
            ))}
          </ul>
        )}
      </section>

      <HabitForm
        open={habitForm.open}
        habit={habitForm.habit}
        onOpenChange={(open) => setHabitForm((s) => ({ ...s, open }))}
      />
      <GoalForm
        open={goalForm.open}
        goal={goalForm.goal}
        onOpenChange={(open) => setGoalForm((s) => ({ ...s, open }))}
      />
    </div>
  );
}

function DayCheck({ habit, day, now }: { habit: Habit; day: Date; now: Date }) {
  const { toggleHabit } = useRoutine();
  if (!isScheduled(habit, day)) {
    return (
      <span className="flex size-6 items-center justify-center text-border-strong" title="Não previsto neste dia">
        <span aria-hidden>–</span>
        <span className="sr-only">Não previsto</span>
      </span>
    );
  }
  return (
    <Checkbox
      size="lg"
      checked={isDone(habit, day)}
      disabled={day > now}
      onChange={() => toggleHabit(habit.id, toISO(day))}
      label={`${habit.name}: ${WEEKDAY_LONG[day.getDay()]}, dia ${day.getDate()}`}
    />
  );
}

function Streak({ run }: { run: number }) {
  return run > 0 ? (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums">
      <Flame className={cn("size-3.5", run >= 7 ? "text-warning" : "text-subtle-foreground")} aria-hidden />
      {run} {run === 1 ? "dia" : "dias"}
    </span>
  ) : (
    <span className="shrink-0 text-sm text-subtle-foreground">Recomeçar</span>
  );
}

/** Versão para celular: o nome em cima e a semana embaixo. */
function HabitBlock({
  habit,
  week,
  now,
  onEdit,
}: {
  habit: Habit;
  week: Date[];
  now: Date;
  onEdit: () => void;
}) {
  return (
    <li className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="text-lg leading-none">{habit.icon}</span>
          <span className="truncate font-medium">{habit.name}</span>
        </button>
        <Streak run={streak(habit, now)} />
      </div>
      <div className="mt-2.5 grid grid-cols-7">
        {week.map((day) => {
          const isToday = toISO(day) === toISO(now);
          return (
            <div
              key={day.getTime()}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md py-1",
                isToday && "bg-surface-selected",
              )}
            >
              <span className={cn("text-xs", isToday ? "font-semibold" : "text-muted-foreground")}>
                {WEEKDAY_SHORT[day.getDay()]}
              </span>
              <DayCheck habit={habit} day={day} now={now} />
            </div>
          );
        })}
      </div>
    </li>
  );
}

function HabitRow({
  habit,
  week,
  now,
  onEdit,
}: {
  habit: Habit;
  week: Date[];
  now: Date;
  onEdit: () => void;
}) {
  const run = streak(habit, now);

  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full min-w-0 items-center gap-2.5 rounded-sm text-left hover:text-primary"
        >
          <span className="text-lg leading-none">{habit.icon}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{habit.name}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {scheduleLabel(habit.weekdays)}
            </span>
          </span>
        </button>
      </th>
      {week.map((day) => {
        const iso = toISO(day);
        const isToday = iso === toISO(now);
        return (
          <td key={iso} className={cn("p-0", isToday && "bg-surface-selected/60")}>
            <span className="flex justify-center">
              <DayCheck habit={habit} day={day} now={now} />
            </span>
          </td>
        );
      })}
      <td className="hidden px-3 text-right md:table-cell">
        <Streak run={run} />
      </td>
    </tr>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { habits } = useRoutine();
  const { modalities } = useTreinos();
  const done = goalDone(goal);
  const progress = goalProgress(goal);
  const deadline = deadlineLabel(goal);

  return (
    <li className="relative flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{goal.icon}</span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEdit}
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
      <Progress value={progress} done={done} label={`Progresso de ${goal.name}`} className="mt-4" />
      <div className="mt-3 flex min-h-7 items-center justify-between gap-3">
        <span
          className={cn(
            "text-sm",
            deadline === "Prazo vencido" ? "text-danger-strong" : "text-muted-foreground",
          )}
        >
          {deadline}
        </span>
        {goal.link ? (
          goal.link.kind !== "habito" && (
            <Link to={linkRoute(goal.link)} className="relative z-10 text-sm font-medium text-primary hover:underline">
              Abrir origem
            </Link>
          )
        ) : (
          <UpdateProgress goal={goal} />
        )}
      </div>
      {goal.link && (
        <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-sm text-muted-foreground">
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{linkLabel(goal.link, { modalities, habits })}</span>
        </p>
      )}
    </li>
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
        <Button variant="outline" size="sm" className="relative z-10">
          Atualizar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Onde está agora" hint={`Alvo: ${goal.target} ${goal.unit}`.trim()}>
            {(id) => (
              <Input
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
            )}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Atualizar progresso
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
