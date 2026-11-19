import { useState } from "react";
import { add, startOfWeek, sub } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Pause, Play, Plus, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, toISO } from "@/lib/dates";
import { DayCell, StreakTag, TodayControl } from "./HabitBits";
import {
  amountOn,
  habitScheduleLabel,
  isAvoid,
  isDone,
  isScheduled,
  PERIODS,
  streakInfo,
  weekCount,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
} from "./logic";
import { useRoutine } from "./store";
import type { Habit } from "./types";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function HabitsTab({
  now,
  onNew,
  onOpen,
}: {
  now: Date;
  onNew: () => void;
  onOpen: (habit: Habit) => void;
}) {
  const { habits } = useRoutine();
  const active = habits.filter((h) => !h.paused);
  const paused = habits.filter((h) => h.paused);

  if (habits.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhum hábito ainda"
        description="Comece com um só, pequeno o bastante para fazer todo dia. Vale também um hábito para largar, como celular na cama."
        action={
          <Button onClick={onNew}>
            <Plus />
            Novo hábito
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <TodaySection habits={active} now={now} onOpen={onOpen} />
      {active.length > 0 && <WeekSection habits={active} now={now} onOpen={onOpen} />}
      {paused.length > 0 && <PausedSection habits={paused} onOpen={onOpen} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Hoje */

function TodaySection({ habits, now, onOpen }: { habits: Habit[]; now: Date; onOpen: (h: Habit) => void }) {
  const due = habits.filter((h) => isScheduled(h, now));
  const done = due.filter((h) => isDone(h, now)).length;
  // Os flexíveis que já fecharam a semana saem da lista de hoje; ficam lembrados embaixo.
  const weekClosed = habits.filter((h) => h.perWeek && !isScheduled(h, now));

  const groups = PERIODS.map((p) => ({
    ...p,
    items: due.filter((h) => (h.period ?? "qualquer") === p.value),
  })).filter((g) => g.items.length > 0);
  const showGroupNames = groups.length > 1;

  return (
    <section aria-labelledby="hoje-titulo">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="hoje-titulo" className="text-xl font-semibold tracking-tight">
            Hoje
          </h2>
          <p className="mt-0.5 text-muted-foreground first-letter:uppercase">
            {formatDate(now, "EEEE, d 'de' MMMM")}
          </p>
        </div>
        {due.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="text-2xl font-semibold text-foreground">{done}</span> de {due.length}{" "}
            {done === due.length ? "· tudo feito" : "feitos"}
          </p>
        )}
      </div>

      {due.length === 0 ? (
        <EmptyState
          size="sm"
          frame="solid"
          icon={Sparkles}
          tone="success"
          className="mt-4"
          title="Nada previsto para hoje"
          description="Os hábitos aparecem aqui nos dias escolhidos para eles."
        />
      ) : (
        <>
          <Progress
            value={done / due.length}
            done={done === due.length}
            label="Hábitos feitos hoje"
            className="mt-3 h-1.5"
          />
          <div className="mt-4 grid gap-x-6 gap-y-5 lg:grid-cols-2">
            {groups.map((g) => (
              <div key={g.value} className="min-w-0">
                {showGroupNames && (
                  <h3 className="mb-1.5 px-1 text-sm font-medium text-muted-foreground">{g.label}</h3>
                )}
                <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                  {g.items.map((h) => (
                    <TodayRow key={h.id} habit={h} now={now} onOpen={() => onOpen(h)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {weekClosed.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Semana fechada: {weekClosed.map((h) => `${h.icon} ${h.name}`).join(", ")}.
        </p>
      )}
    </section>
  );
}

function TodayRow({ habit, now, onOpen }: { habit: Habit; now: Date; onOpen: () => void }) {
  const done = isDone(habit, now);
  const avoid = isAvoid(habit);
  const sub = avoid
    ? done
      ? "Sem marca hoje: conta como vitória"
      : "Marcado hoje. Amanhã é outro dia."
    : habit.perWeek
      ? `${weekCount(habit, now)} de ${habit.perWeek} nesta semana`
      : habit.amount
        ? `${fmt.format(amountOn(habit, now))} de ${fmt.format(habit.amount.target)} ${habit.amount.unit}`
        : habitScheduleLabel(habit);
  const part = habit.amount ? Math.min(1, amountOn(habit, now) / habit.amount.target) : 0;

  return (
    <li className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <span className="text-xl leading-none" aria-hidden>
        {habit.icon}
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block truncate font-medium",
            done && !avoid && "text-muted-foreground line-through decoration-1",
          )}
        >
          {avoid && <span className="mr-1.5 rounded-sm bg-surface-muted px-1 py-0.5 text-xs font-medium text-muted-foreground no-underline">evitar</span>}
          {habit.name}
        </span>
        <span className={cn("block truncate text-sm", avoid && !done ? "text-danger-strong" : "text-muted-foreground")}>
          {sub}
          {!(habit.perWeek && streakInfo(habit, now).count === 0) && !(avoid && !done) && (
            <>
              {" · "}
              <StreakTag habit={habit} now={now} className="text-sm font-normal" />
            </>
          )}
        </span>
      </button>
      <TodayControl habit={habit} now={now} />
      {habit.amount && part > 0 && part < 1 && (
        <span aria-hidden className="absolute bottom-0 left-0 h-0.5 bg-primary/60" style={{ width: `${part * 100}%` }} />
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- Semana */

function WeekSection({ habits, now, onOpen }: { habits: Habit[]; now: Date; onOpen: (h: Habit) => void }) {
  const [offset, setOffset] = useState(0);
  const monday = sub(startOfWeek(now, { weekStartsOn: 1 }), { weeks: offset });
  const week = Array.from({ length: 7 }, (_, i) => add(monday, { days: i }));
  const todayISO = toISO(now);
  const range = `${formatDate(week[0], "d 'de' MMM")} a ${formatDate(week[6], "d 'de' MMM")}`;

  return (
    <section aria-labelledby="semana-titulo">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="semana-titulo" className="text-xl font-semibold tracking-tight">
            {offset === 0 ? "Esta semana" : offset === 1 ? "Semana passada" : `${offset} semanas atrás`}
          </h2>
          <p className="mt-0.5 text-muted-foreground">{range}. Toque num dia para corrigir.</p>
        </div>
        <div className="flex items-center gap-1">
          {offset > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Esta semana
            </Button>
          )}
          <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setOffset((o) => o + 1)}>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima semana"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* Celular: o nome em cima e a semana embaixo. */}
      <ul className="mt-4 overflow-hidden rounded-lg border border-border bg-surface sm:hidden">
        {habits.map((h) => (
          <li key={h.id} className="border-b border-border px-3 py-3 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => onOpen(h)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <span className="text-lg leading-none">{h.icon}</span>
                <span className="truncate font-medium">{h.name}</span>
              </button>
              <WeekTotal habit={h} day={week[0]} now={now} />
            </div>
            <div className="mt-2.5 grid grid-cols-7">
              {week.map((day) => {
                const isToday = toISO(day) === todayISO;
                return (
                  <div
                    key={day.getTime()}
                    className={cn("flex flex-col items-center gap-1 rounded-md py-1", isToday && "bg-surface-selected")}
                  >
                    <span className={cn("text-xs", isToday ? "font-semibold" : "text-muted-foreground")}>
                      {WEEKDAY_SHORT[day.getDay()]}
                    </span>
                    <DayCell habit={h} day={day} now={now} />
                  </div>
                );
              })}
            </div>
          </li>
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
                const isToday = toISO(day) === todayISO;
                return (
                  <th
                    key={day.getTime()}
                    scope="col"
                    abbr={WEEKDAY_LONG[day.getDay()]}
                    className={cn("w-12 py-1.5 text-center font-normal", isToday && "bg-surface-selected font-semibold text-foreground")}
                  >
                    <span className="block text-xs">{WEEKDAY_SHORT[day.getDay()]}</span>
                    <span className="block tabular-nums">{day.getDate()}</span>
                  </th>
                );
              })}
              <th scope="col" className="hidden w-32 px-3 text-right font-normal md:table-cell">
                {offset === 0 ? "Sequência" : "Na semana"}
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onOpen(h)}
                    className="flex w-full min-w-0 items-center gap-2.5 rounded-sm text-left hover:text-primary"
                  >
                    <span className="text-lg leading-none">{h.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{h.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{habitScheduleLabel(h)}</span>
                    </span>
                  </button>
                </th>
                {week.map((day) => {
                  const iso = toISO(day);
                  return (
                    <td key={iso} className={cn("p-0", iso === todayISO && "bg-surface-selected/60")}>
                      <span className="flex justify-center">
                        <DayCell habit={h} day={day} now={now} />
                      </span>
                    </td>
                  );
                })}
                <td className="hidden px-3 text-right md:table-cell">
                  {offset === 0 && !h.perWeek ? <StreakTag habit={h} now={now} /> : <WeekTotal habit={h} day={week[0]} now={now} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** "2 de 3" nos flexíveis, "5 de 7" nos fixos, "6 dias limpos" nos maus hábitos. */
function WeekTotal({ habit, day, now }: { habit: Habit; day: Date; now: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => add(day, { days: i })).filter((d) => d <= now);
  if (isAvoid(habit)) {
    const clean = days.filter((d) => isDone(habit, d)).length;
    return <span className="text-sm font-medium tabular-nums">{clean} {clean === 1 ? "dia limpo" : "dias limpos"}</span>;
  }
  const doneN = weekCount(habit, day);
  const goal = habit.perWeek ?? habit.weekdays.length;
  return (
    <span className={cn("text-sm font-medium tabular-nums", doneN >= goal && "text-success-strong")}>
      {doneN} de {goal}
    </span>
  );
}

/* -------------------------------------------------------------- Pausados */

function PausedSection({ habits, onOpen }: { habits: Habit[]; onOpen: (h: Habit) => void }) {
  const { updateHabit } = useRoutine();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        <Pause className="size-3.5" />
        Pausados ({habits.length})
      </button>
      {open && (
        <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
              <span className="text-lg leading-none opacity-60">{h.icon}</span>
              <button type="button" onClick={() => onOpen(h)} className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                {h.name}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateHabit(h.id, { paused: false });
                  toast({ message: `${h.name} voltou para a rotina` });
                }}
              >
                <Play />
                Retomar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
