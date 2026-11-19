import { Check, Flame, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { toISO } from "@/lib/dates";
import { amountOn, isAvoid, isDone, streakInfo, streakLabel, WEEKDAY_LONG } from "./logic";
import { useRoutine } from "./store";
import type { Habit } from "./types";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Se o dia aparece com check na grade: nos fixos, só os dias escolhidos; nos flexíveis e maus hábitos, todos. */
export function countsOnDay(habit: Habit, day: Date): boolean {
  if (isAvoid(habit)) return !habit.createdAt || toISO(day) >= habit.createdAt;
  if (habit.perWeek) return true;
  return habit.weekdays.includes(day.getDay());
}

/**
 * Um dia na grade da semana. Feito é o check cheio; quantidade pela metade aparece
 * como um anel parcial; no mau hábito, dia limpo é check verde e dia em que escapou, um X.
 */
export function DayCell({ habit, day, now }: { habit: Habit; day: Date; now: Date }) {
  const { toggleHabit } = useRoutine();
  const iso = toISO(day);
  const future = iso > toISO(now);
  const when = `${WEEKDAY_LONG[day.getDay()]}, dia ${day.getDate()}`;

  if (!countsOnDay(habit, day)) {
    return (
      <span className="flex size-7 items-center justify-center text-border-strong" title="Não previsto neste dia">
        <span aria-hidden>–</span>
        <span className="sr-only">Não previsto</span>
      </span>
    );
  }

  if (isAvoid(habit)) {
    const slipped = habit.log.includes(iso);
    return (
      <button
        type="button"
        disabled={future}
        aria-pressed={slipped}
        aria-label={`${habit.name}, ${when}: ${slipped ? "escapou (toque para desfazer)" : "dia limpo (toque se escapou)"}`}
        title={slipped ? "Escapou neste dia" : "Dia limpo"}
        onClick={() => toggleHabit(habit.id, iso)}
        className={cn(
          "flex size-7 items-center justify-center rounded-full border-[1.5px] transition-colors duration-(--motion-fast) disabled:opacity-40",
          future
            ? "border-dashed border-input bg-surface"
            : slipped
              ? "border-danger bg-danger-soft text-danger-strong"
              : "border-success bg-success-soft text-success-strong hover:border-danger hover:text-danger-strong",
        )}
      >
        {!future && (slipped ? <X className="size-4" strokeWidth={3} /> : <Check className="size-4" strokeWidth={3} />)}
      </button>
    );
  }

  const done = isDone(habit, day);
  const part = habit.amount && !done ? Math.min(1, amountOn(habit, iso) / habit.amount.target) : 0;
  const label = habit.amount
    ? `${habit.name}, ${when}: ${fmt.format(amountOn(habit, iso))} de ${fmt.format(habit.amount.target)} ${habit.amount.unit}`
    : `${habit.name}: ${when}`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      title={habit.amount ? `${fmt.format(amountOn(habit, iso))}/${fmt.format(habit.amount.target)} ${habit.amount.unit}` : undefined}
      disabled={future}
      onClick={() => toggleHabit(habit.id, iso)}
      style={part > 0 ? { background: `conic-gradient(var(--color-primary) ${part * 360}deg, transparent 0)` } : undefined}
      className={cn(
        "relative flex size-7 items-center justify-center rounded-full border-[1.5px] transition-colors duration-(--motion-fast) disabled:opacity-40",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input-hover bg-surface text-transparent hover:border-primary hover:text-primary/50",
      )}
    >
      {part > 0 && <span aria-hidden className="absolute inset-[3px] rounded-full bg-surface" />}
      <Check className="relative size-4" strokeWidth={3} />
    </button>
  );
}

export function StreakTag({ habit, now, className }: { habit: Habit; now: Date; className?: string }) {
  const info = streakInfo(habit, now);
  if (info.count === 0) {
    if (habit.perWeek) return null;
    return <span className={cn("shrink-0 text-sm text-subtle-foreground", className)}>{isAvoid(habit) ? "Recomeçou hoje" : "Recomeçar"}</span>;
  }
  const hot = info.unit === "semana" ? info.count >= 3 : info.count >= 7;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums", className)}
      title={isAvoid(habit) ? "Dias seguidos sem escapar" : "Sequência atual"}
    >
      <Flame className={cn("size-3.5", hot ? "text-warning" : "text-subtle-foreground")} aria-hidden />
      {streakLabel(info)}
    </span>
  );
}

/** O controle grande da lista de hoje: check, contador ou "escapei", conforme o tipo. */
export function TodayControl({ habit, now }: { habit: Habit; now: Date }) {
  const { toggleHabit, addAmount } = useRoutine();
  const iso = toISO(now);

  if (isAvoid(habit)) {
    const slipped = habit.log.includes(iso);
    return slipped ? (
      <button
        type="button"
        onClick={() => toggleHabit(habit.id, iso)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-danger-soft px-2.5 text-sm font-medium text-danger-strong hover:opacity-80"
        aria-label={`Desfazer: escapei de ${habit.name} hoje`}
      >
        <X className="size-3.5" strokeWidth={3} />
        Escapei hoje
      </button>
    ) : (
      <button
        type="button"
        onClick={() => toggleHabit(habit.id, iso)}
        className="inline-flex h-8 shrink-0 items-center rounded-md border border-input px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-danger hover:text-danger-strong"
        aria-label={`Marcar que escapei de ${habit.name} hoje`}
      >
        Escapei
      </button>
    );
  }

  if (habit.amount) {
    const value = amountOn(habit, iso);
    const step = habit.amount.target >= 1000 ? 250 : habit.amount.target >= 100 ? 10 : 1;
    const done = value >= habit.amount.target;
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => addAmount(habit.id, iso, -step)}
          disabled={value <= 0}
          aria-label={`Tirar ${step} de ${habit.name}`}
          className="flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-surface-hover disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-14 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {fmt.format(value)}
          <span className="text-muted-foreground">/{fmt.format(habit.amount.target)}</span>
        </span>
        <button
          type="button"
          onClick={() => addAmount(habit.id, iso, step)}
          aria-label={`Somar ${step} em ${habit.name}`}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            done ? "bg-success-soft text-success-strong" : "bg-primary text-primary-foreground hover:bg-primary-hover",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" />}
        </button>
      </div>
    );
  }

  const done = isDone(habit, now);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={habit.name}
      onClick={() => toggleHabit(habit.id, iso)}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-(--motion-fast) active:scale-95",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input-hover bg-surface text-transparent hover:border-primary hover:text-primary/50",
      )}
    >
      <Check className="size-5" strokeWidth={3} />
    </button>
  );
}
