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
 * como um anel parcial; no mau hábito, o dia sem marca é o círculo vazio (conta como vitória) e o dia em que fez, um X vermelho.
 * Os mesmos estados em todo lugar: feito = primária cheia, vazio = contorno, futuro = apagado, não vale = traço.
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
    return (
      <SlipToggle
        habit={habit}
        date={iso}
        size="sm"
        disabled={future}
        label={`${habit.name}, ${when}`}
      />
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
      title={isAvoid(habit) ? "Dias seguidos sem marcar" : "Sequência atual"}
    >
      <Flame className={cn("size-3.5", hot ? "text-warning" : "text-subtle-foreground")} aria-hidden />
      {streakLabel(info)}
    </span>
  );
}

/** O controle grande da lista de hoje: check, contador ou X, conforme o tipo. */
export function TodayControl({ habit, now }: { habit: Habit; now: Date }) {
  const { toggleHabit, addAmount } = useRoutine();
  const iso = toISO(now);

  if (isAvoid(habit)) return <SlipToggle habit={habit} date={iso} />;

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
            "bg-primary text-primary-foreground hover:bg-primary-hover",
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

/**
 * O X do mau hábito. Marcar registra que você fez o que queria evitar; o dia sem marca
 * conta como vitória. Tocar de novo desmarca.
 */
export function SlipToggle({
  habit,
  date,
  size = "lg",
  disabled,
  label,
}: {
  habit: Habit;
  date: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label?: string;
}) {
  const { toggleHabit } = useRoutine();
  const slipped = habit.log.includes(date);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={slipped}
      disabled={disabled}
      aria-label={`${label ?? habit.name}: ${slipped ? "marcado, fez o mau hábito" : "sem marca, dia limpo"}`}
      title={slipped ? "Fez neste dia. Toque para desmarcar." : "Sem marca: conta como vitória. Toque se fez."}
      onClick={(e) => {
        e.stopPropagation();
        toggleHabit(habit.id, date);
      }}
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all duration-(--motion-fast) active:scale-95 disabled:opacity-40",
        size === "lg" ? "size-9 border-2" : size === "md" ? "size-[1.125rem] border-[1.5px]" : "size-7 border-[1.5px]",
        slipped
          ? "border-danger bg-danger text-danger-foreground"
          : "border-input-hover bg-surface text-transparent hover:border-danger hover:text-danger/50",
      )}
    >
      <X className={size === "lg" ? "size-5" : size === "md" ? "size-3" : "size-4"} strokeWidth={3} />
    </button>
  );
}
