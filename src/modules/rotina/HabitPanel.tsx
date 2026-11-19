import { add, startOfWeek, sub } from "date-fns";
import { Pause, Pencil, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { InfoTip } from "@/components/ui/InfoTip";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, toISO, today } from "@/lib/dates";
import { countsOnDay, TodayControl } from "./HabitBits";
import {
  amountOn,
  bestStreak,
  completionRate,
  goalProgress,
  habitScheduleLabel,
  isAvoid,
  isDone,
  streakInfo,
  streakLabel,
  totalTimes,
  WEEK_ORDER,
  WEEKDAY_SHORT,
} from "./logic";
import { useRoutine } from "./store";
import type { Habit } from "./types";

const WEEKS = 18;

/** Painel lateral do hábito: números, o histórico em quadradinhos e as metas que ele alimenta. */
export function HabitPanel({
  habit,
  onClose,
  onEdit,
  onOpenGoal,
}: {
  habit: Habit | undefined;
  onClose: () => void;
  onEdit: (h: Habit) => void;
  onOpenGoal: (id: string) => void;
}) {
  return (
    <Dialog variant="sheet" open={!!habit} onOpenChange={(o) => !o && onClose()} title={habit?.name || "Hábito"} hideTitle>
      {habit && <Content habit={habit} onEdit={() => onEdit(habit)} onOpenGoal={onOpenGoal} onClose={onClose} />}
    </Dialog>
  );
}

function Content({
  habit,
  onEdit,
  onOpenGoal,
  onClose,
}: {
  habit: Habit;
  onEdit: () => void;
  onOpenGoal: (id: string) => void;
  onClose: () => void;
}) {
  const { goals, updateHabit } = useRoutine();
  const toast = useToast();
  const now = today();
  const avoid = isAvoid(habit);
  const current = streakInfo(habit, now);
  const best = bestStreak(habit, now);
  const rate = completionRate(habit, 30, now);
  const feeds = goals.filter((g) => g.link?.kind === "habito" && g.link.habitId === habit.id);

  return (
    <>
      <DialogBody className="flex flex-col gap-6 pt-12">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{habit.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{habit.name}</h2>
            <p className="text-sm text-muted-foreground">
              {habitScheduleLabel(habit)}
              {habit.paused && " · pausado"}
            </p>
          </div>
        </div>

        {habit.why && (
          <blockquote className="rounded-md border-l-2 border-primary bg-surface-muted/60 px-3 py-2 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Por que importa</span>
            {habit.why}
          </blockquote>
        )}

        {!habit.paused && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Hoje</p>
              <p className="text-sm text-muted-foreground">
                {avoid
                  ? isDone(habit, now)
                    ? "Sem marca: conta como vitória"
                    : "Marcado hoje"
                  : habit.amount
                    ? `${amountOn(habit, now)} de ${habit.amount.target} ${habit.amount.unit}`
                    : isDone(habit, now)
                      ? "Feito"
                      : "Em aberto"}
              </p>
            </div>
            <TodayControl habit={habit} now={now} />
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2">
          <Stat label={avoid ? "Dias limpos seguidos" : "Sequência atual"} fallback={streakLabel(current)} />
          <Stat label="Melhor sequência" fallback={streakLabel(best)} />
          <Stat
            label="Últimos 30 dias"
            fallback={rate === null ? "–" : `${Math.round(rate * 100)}%`}
            tip={
              avoid
                ? "Dias sem marca, dos últimos 30."
                : habit.perWeek
                  ? "Quanto das vezes por semana você cumpriu nas últimas 4 semanas."
                  : "Dos dias previstos nos últimos 30, em quantos você fez. Hoje só conta depois de feito."
            }
          />
          <Stat label={avoid ? "Vezes que fez" : "Vezes feito"} fallback={String(totalTimes(habit))} />
        </dl>

        <Heatmap habit={habit} now={now} />

        {feeds.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-sm font-medium">Metas que ele alimenta</h3>
            <ul className="overflow-hidden rounded-lg border border-border">
              {feeds.map((g) => (
                <li key={g.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpenGoal(g.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover"
                  >
                    <Target className="size-4 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{g.name}</span>
                    <span className="text-sm font-medium tabular-nums">{Math.round(goalProgress(g) * 100)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogBody>
      <DialogFooter>
        <Button
          variant="ghost"
          className="mr-auto"
          onClick={() => {
            updateHabit(habit.id, { paused: !habit.paused });
            toast({ message: habit.paused ? `${habit.name} voltou para a rotina` : `${habit.name} foi pausado. O histórico fica guardado.` });
            if (!habit.paused) onClose();
          }}
        >
          {habit.paused ? <Play /> : <Pause />}
          {habit.paused ? "Retomar" : "Pausar"}
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil />
          Editar
        </Button>
      </DialogFooter>
    </>
  );
}

function Stat({
  label,
  fallback,
  tip,
}: {
  label: string;
  fallback: string;
  tip?: string;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <dt className="flex items-center gap-1 text-sm text-muted-foreground">
        {label}
        {tip && (
          <InfoTip label={`Sobre ${label.toLowerCase()}`} className="size-5">
            {tip}
          </InfoTip>
        )}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{fallback}</dd>
    </div>
  );
}

/** As últimas semanas em quadradinhos, de segunda a domingo. Toque para corrigir um dia. */
function Heatmap({ habit, now }: { habit: Habit; now: Date }) {
  const { toggleHabit } = useRoutine();
  const avoid = isAvoid(habit);
  const first = sub(startOfWeek(now, { weekStartsOn: 1 }), { weeks: WEEKS - 1 });
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    WEEK_ORDER.map((_, d) => add(first, { weeks: w, days: d })),
  );
  const todayISO = toISO(now);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Últimas {WEEKS} semanas</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-[3px] bg-surface-muted" /> {avoid ? "fora" : "sem"}
          <span className="ml-1 size-2.5 rounded-[3px] bg-primary" /> {avoid ? "limpo" : "feito"}
          {avoid && (
            <>
              <span className="ml-1 size-2.5 rounded-[3px] bg-danger" /> fez
            </>
          )}
        </span>
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] pt-0 text-[10px] leading-none text-subtle-foreground">
          {WEEK_ORDER.map((d, i) => (
            <span key={d} className="flex h-3.5 items-center">
              {i % 2 === 0 ? WEEKDAY_SHORT[d][0] : ""}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px]" role="grid" aria-label="Histórico do hábito">
          {weeks.flat().map((day) => {
            const iso = toISO(day);
            const future = iso > todayISO;
            const counts = countsOnDay(habit, day) && (!habit.createdAt || iso >= habit.createdAt || habit.log.includes(iso));
            const done = isDone(habit, day);
            const slipped = avoid && habit.log.includes(iso);
            const part = habit.amount && !done ? amountOn(habit, iso) / habit.amount.target : 0;
            return (
              <button
                key={iso}
                type="button"
                disabled={future || !counts}
                onClick={() => toggleHabit(habit.id, iso)}
                title={`${formatDate(day, "EEE, d 'de' MMM")}${slipped ? ": fez" : done ? (avoid ? ": limpo" : ": feito") : ""}`}
                aria-label={`${formatDate(day, "EEEE, d 'de' MMMM")}: ${slipped ? "fez" : done ? (avoid ? "limpo" : "feito") : "não feito"}`}
                className={cn(
                  "h-3.5 min-w-0 rounded-[3px] transition-opacity hover:opacity-70 disabled:hover:opacity-100",
                  future
                    ? "bg-transparent"
                    : !counts
                      ? "bg-surface-muted/40"
                      : slipped
                        ? "bg-danger"
                        : done
                          ? "bg-primary"
                          : part > 0
                            ? "bg-primary/35"
                            : "bg-surface-muted",
                  iso === todayISO && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-surface-raised",
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
