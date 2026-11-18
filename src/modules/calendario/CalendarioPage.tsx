import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  add,
  endOfMonth,
  endOfWeek,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Layers, Plus, Smartphone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate, toISO, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import { usePersistentState } from "@/lib/storage";
import { isDone, isScheduled, WEEK_ORDER, WEEKDAY_SHORT } from "@/modules/rotina/logic";
import { useRoutine } from "@/modules/rotina/store";
import type { Habit } from "@/modules/rotina/types";
import { Chip, HabitRing, ItemRow, SourceDot, sourceColor } from "./CalendarBits";
import { groupByDate } from "./collect";
import { EventForm } from "./EventForm";
import { IphoneSync } from "./IphoneSync";
import { SOURCES } from "./sources";
import { useCalendar } from "./store";
import type { CalItem } from "./types";
import { useCalendarItems, useOverdue } from "./useCalendarItems";

type View = "month" | "week" | "agenda";

const WEEK = { weekStartsOn: 1 } as const;
/** Quantas etiquetas cabem em um dia do mês antes do "+N". */
const MAX_CHIPS = 3;

function range(view: View, selected: Date): [Date, Date] {
  if (view === "week") return [startOfWeek(selected, WEEK), endOfWeek(selected, WEEK)];
  // A agenda olha para a frente: do dia escolhido até um mês depois.
  if (view === "agenda") return [selected, add(selected, { months: 1, days: -1 })];
  return [startOfWeek(startOfMonth(selected), WEEK), endOfWeek(endOfMonth(selected), WEEK)];
}

function daysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let d = from; d <= to; d = add(d, { days: 1 })) days.push(d);
  return days;
}

interface HabitDay {
  scheduled: Habit[];
  done: number;
}

export function CalendarioPage() {
  const { events, hidden } = useCalendar();
  const { habits } = useRoutine();
  const [params, setParams] = useSearchParams();
  const [view, setView] = usePersistentState<View>("nishios:calendario:visao", () => "month");
  const [form, setForm] = useState<{ open: boolean; eventId?: string }>({ open: false });
  const [syncOpen, setSyncOpen] = useState(false);

  const now = today();
  const todayISO = toISO(now);
  const fromParam = parseISO(params.get("dia") ?? "");
  const selected = isValid(fromParam) ? fromParam : now;
  const selectedISO = toISO(selected);
  const select = (date: Date | string) =>
    setParams({ dia: typeof date === "string" ? date : toISO(date) }, { replace: true, preventScrollReset: true });

  const [from, to] = range(view, selected);
  const { items } = useCalendarItems(toISO(from), toISO(to));
  const byDate = useMemo(() => groupByDate(items), [items]);

  // O que ficou para trás, de qualquer data: aparece no painel de hoje.
  const overdue = useOverdue(true);
  const todayItems = useCalendarItems(todayISO, todayISO).items;

  const showHabits = !hidden.includes("rotina");
  const habitDay = (date: Date): HabitDay | null => {
    if (!showHabits) return null;
    const scheduled = habits.filter((h) => isScheduled(h, date));
    if (scheduled.length === 0) return null;
    return { scheduled, done: scheduled.filter((h) => isDone(h, date)).length };
  };

  const step = (dir: 1 | -1) => select(add(selected, view === "week" ? { weeks: dir } : { months: dir }));
  const days = daysBetween(from, to);
  const title =
    view !== "month"
      ? from.getMonth() === to.getMonth()
        ? `${from.getDate()} a ${formatDate(to, "d 'de' MMMM")}`
        : `${formatDate(from, "d 'de' MMM")} a ${formatDate(to, "d 'de' MMM")}`
      : formatDate(selected, "MMMM");
  const year = formatDate(view === "month" ? selected : to, "yyyy");

  const openEvent = (id: string) => setForm({ open: true, eventId: id });
  const pending = todayItems.filter((i) => i.state !== "done").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendário"
        description={
          [
            pending === 0 ? "Nada marcado para hoje" : `${plural(pending, "item", "itens")} para hoje`,
            overdue.length > 0 && plural(overdue.length, "atrasado", "atrasados"),
          ]
            .filter(Boolean)
            .join(" e ") + "."
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSyncOpen(true)}>
              <Smartphone />
              iPhone
            </Button>
            <Button onClick={() => setForm({ open: true })}>
              <Plus />
              Novo evento
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label={view === "week" ? "Semana anterior" : "Mês anterior"} onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label={view === "week" ? "Próxima semana" : "Próximo mês"} onClick={() => step(1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline" className="h-8" onClick={() => select(now)} disabled={selectedISO === todayISO}>
            Hoje
          </Button>
        </div>
        <h2 aria-live="polite" className="text-xl font-semibold tracking-tight first-letter:uppercase">
          {title} <span className="font-normal text-subtle-foreground">{year}</span>
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Segmented<View>
            label="Modo de visualização"
            value={view}
            onChange={setView}
            options={[
              { value: "month", label: "Mês" },
              { value: "week", label: "Semana" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          <LayersButton />
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {view === "month" && (
            <MonthGrid
              days={days}
              month={selected.getMonth()}
              byDate={byDate}
              habitDay={habitDay}
              selectedISO={selectedISO}
              todayISO={todayISO}
              onSelect={select}
              onCreate={(iso) => {
                select(iso);
                setForm({ open: true });
              }}
            />
          )}
          {view === "week" && (
            <WeekGrid days={days} byDate={byDate} habitDay={habitDay} selectedISO={selectedISO} todayISO={todayISO} onSelect={select} />
          )}
          {view === "agenda" && (
            <Agenda days={days} byDate={byDate} selectedISO={selectedISO} todayISO={todayISO} onSelect={select} onOpenEvent={openEvent} />
          )}
        </div>

        <DayPanel
          date={selected}
          items={byDate.get(selectedISO) ?? []}
          overdue={selectedISO === todayISO ? overdue : []}
          habits={habitDay(selected)}
          isToday={selectedISO === todayISO}
          canToggleHabits={selectedISO <= todayISO}
          onOpenEvent={openEvent}
          onCreate={() => setForm({ open: true })}
        />
      </div>

      <EventForm
        open={form.open}
        event={events.find((e) => e.id === form.eventId)}
        defaultDate={selectedISO}
        onOpenChange={(open) => setForm((f) => (open ? { ...f, open } : { open }))}
      />
      <IphoneSync open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
}

/* ---------- Camadas ---------- */

function LayersButton() {
  const { hidden, toggleSource, events } = useCalendar();
  const hasIphone = events.some((e) => e.origin === "iphone");
  const sources = SOURCES.filter((s) => s.id !== "iphone" || hasIphone);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8">
          <Layers />
          Camadas
          {hidden.length > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {sources.length - hidden.filter((h) => sources.some((s) => s.id === h)).length} de {sources.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <p className="px-2 pt-1 pb-2 text-sm text-muted-foreground">Escolha o que aparece no calendário.</p>
        <ul>
          {sources.map((s) => {
            const on = !hidden.includes(s.id);
            return (
              <li key={s.id} style={sourceColor(s.id)}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-hover">
                  <Checkbox
                    checked={on}
                    onChange={() => toggleSource(s.id)}
                    label={`${on ? "Ocultar" : "Mostrar"} ${s.label}`}
                    className={on ? "border-(--c) bg-(--c) hover:border-(--c)" : undefined}
                  />
                  <span className="min-w-0 flex-1" onClick={() => toggleSource(s.id)}>
                    <span className="block font-medium">{s.label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{s.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Mês ---------- */

interface GridProps {
  days: Date[];
  byDate: Map<string, CalItem[]>;
  habitDay: (date: Date) => HabitDay | null;
  selectedISO: string;
  todayISO: string;
  onSelect: (iso: string) => void;
}

function dayLabel(date: Date, items: CalItem[]): string {
  const late = items.filter((i) => i.state === "overdue").length;
  return [
    formatDate(date, "EEEE, d 'de' MMMM"),
    items.length === 0 ? "nada marcado" : plural(items.length, "item", "itens"),
    late > 0 && plural(late, "atrasado", "atrasados"),
  ]
    .filter(Boolean)
    .join(", ");
}

function DayNumber({ date, isToday, muted }: { date: Date; isToday: boolean; muted?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
        isToday ? "bg-primary font-semibold text-primary-foreground" : muted ? "text-subtle-foreground" : "font-medium",
      )}
    >
      {date.getDate()}
    </span>
  );
}

function MonthGrid({ days, month, byDate, habitDay, selectedISO, todayISO, onSelect, onCreate }: GridProps & { month: number; onCreate: (iso: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div aria-hidden className="grid grid-cols-7 border-b border-border">
        {WEEK_ORDER.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground sm:text-left">
            {WEEKDAY_SHORT[d]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const iso = toISO(date);
          const items = byDate.get(iso) ?? [];
          const outside = date.getMonth() !== month;
          const selected = iso === selectedISO;
          const habits = iso <= todayISO ? habitDay(date) : null;
          const lastRow = i >= days.length - 7;
          return (
            <button
              key={iso}
              type="button"
              aria-label={dayLabel(date, items)}
              aria-pressed={selected}
              onClick={() => onSelect(iso)}
              onDoubleClick={() => onCreate(iso)}
              className={cn(
                "relative flex min-h-14 min-w-0 flex-col items-center gap-1 border-border p-1 text-left transition-colors duration-(--motion-fast) sm:min-h-[7.25rem] sm:items-stretch sm:p-1.5",
                i % 7 !== 6 && "border-r",
                !lastRow && "border-b",
                outside && "bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface))]",
                selected ? "bg-surface-selected" : "hover:bg-surface-hover",
              )}
            >
              <span className="flex items-center justify-between">
                <DayNumber date={date} isToday={iso === todayISO} muted={outside} />
                {habits && <HabitRing done={habits.done} total={habits.scheduled.length} className="hidden sm:block" />}
              </span>

              {/* Celular: só as cores, o detalhe fica no painel do dia. */}
              <span className="flex h-1.5 items-center gap-0.5 sm:hidden">
                {items.slice(0, 4).map((item) => (
                  <SourceDot key={item.key} item={item} />
                ))}
              </span>

              <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {items.slice(0, items.length > MAX_CHIPS ? MAX_CHIPS - 1 : MAX_CHIPS).map((item) => (
                  <Chip key={item.key} item={item} />
                ))}
                {items.length > MAX_CHIPS && (
                  <span className="px-1.5 text-xs text-muted-foreground">mais {items.length - (MAX_CHIPS - 1)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Semana ---------- */

function WeekGrid({ days, byDate, habitDay, selectedISO, todayISO, onSelect }: GridProps) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-7">
      {days.map((date, i) => {
        const iso = toISO(date);
        const items = byDate.get(iso) ?? [];
        const selected = iso === selectedISO;
        const habits = iso <= todayISO ? habitDay(date) : null;
        return (
          <button
            key={iso}
            type="button"
            aria-label={dayLabel(date, items)}
            aria-pressed={selected}
            onClick={() => onSelect(iso)}
            className={cn(
              "flex min-w-0 gap-3 border-border p-2 text-left transition-colors duration-(--motion-fast) md:min-h-[26rem] md:flex-col md:gap-2",
              i < 6 && "border-b md:border-r md:border-b-0",
              selected ? "bg-surface-selected" : "hover:bg-surface-hover",
            )}
          >
            <span className="flex w-12 shrink-0 flex-col items-center gap-1 md:w-auto md:flex-row md:justify-between">
              <span className="flex flex-col items-center gap-0.5 md:flex-row md:gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{WEEKDAY_SHORT[date.getDay()]}</span>
                <DayNumber date={date} isToday={iso === todayISO} />
              </span>
              {habits && <HabitRing done={habits.done} total={habits.scheduled.length} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {items.map((item) => (
                <Chip key={item.key} item={item} wrap />
              ))}
              {items.length === 0 && <span className="py-1 text-xs text-subtle-foreground md:hidden">Livre</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Agenda ---------- */

function Agenda({ days, byDate, selectedISO, todayISO, onSelect, onOpenEvent }: Omit<GridProps, "habitDay"> & { onOpenEvent: (id: string) => void }) {
  const withItems = days.filter((d) => (byDate.get(toISO(d)) ?? []).length > 0);
  if (withItems.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nada marcado nos próximos 30 dias"
        description="Crie um evento ou ligue mais camadas para ver o que vem pela frente."
      />
    );
  }
  return (
    <ol className="overflow-hidden rounded-lg border border-border bg-surface">
      {withItems.map((date) => {
        const iso = toISO(date);
        return (
          <li
            key={iso}
            className={cn(
              "flex flex-col gap-1 border-b border-border p-2 last:border-b-0 sm:flex-row sm:gap-3",
              iso === selectedISO && "bg-[color-mix(in_srgb,var(--surface-selected)_45%,var(--surface))]",
            )}
          >
            <button
              type="button"
              aria-pressed={iso === selectedISO}
              onClick={() => onSelect(iso)}
              className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover sm:w-32 sm:self-start"
            >
              <DayNumber date={date} isToday={iso === todayISO} />
              <span className="text-sm text-muted-foreground first-letter:uppercase">
                {formatDate(date, "EEEE").replace("-feira", "")}
                {date.getDate() === 1 && `, ${formatDate(date, "MMM")}`}
              </span>
            </button>
            <ul className="min-w-0 flex-1">
              {(byDate.get(iso) ?? []).map((item) => (
                <ItemRow key={item.key} item={item} onOpenEvent={onOpenEvent} />
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Painel do dia ---------- */

function DayPanel({
  date,
  items,
  overdue,
  habits,
  isToday,
  canToggleHabits,
  onOpenEvent,
  onCreate,
}: {
  date: Date;
  items: CalItem[];
  overdue: CalItem[];
  habits: HabitDay | null;
  isToday: boolean;
  canToggleHabits: boolean;
  onOpenEvent: (id: string) => void;
  onCreate: () => void;
}) {
  const { toggleHabit } = useRoutine();
  const iso = toISO(date);
  const empty = items.length === 0 && overdue.length === 0 && !habits;

  return (
    <aside aria-label="Dia selecionado" className="rounded-lg border border-border bg-surface xl:sticky xl:top-4">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {isToday ? "Hoje, " : ""}
            {formatDate(date, "EEEE")}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{formatDate(date, "d 'de' MMMM")}</h2>
        </div>
        <Button variant="outline" size="icon" aria-label="Novo evento neste dia" onClick={onCreate}>
          <Plus />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-2">
        {empty && (
          <EmptyState
            size="sm"
            icon={CalendarDays}
            title="Dia livre"
            description="Use o botão + acima para marcar um evento neste dia."
          />
        )}

        {items.length > 0 && (
          <ul>
            {items.map((item) => (
              <ItemRow key={item.key} item={item} onOpenEvent={onOpenEvent} />
            ))}
          </ul>
        )}

        {overdue.length > 0 && (
          <section>
            <h3 className="px-2 pb-1 text-sm font-semibold text-danger-strong">
              Ficou para trás ({overdue.length})
            </h3>
            <ul>
              {overdue.map((item) => (
                <ItemRow key={item.key} item={{ ...item, note: `Era para ${formatDate(item.date, "d 'de' MMM")}` }} onOpenEvent={onOpenEvent} />
              ))}
            </ul>
          </section>
        )}

        {habits && (
          <section>
            <h3 className="flex items-center gap-2 px-2 pb-1 text-sm font-semibold">
              Rotina do dia
              <span className="font-normal text-muted-foreground tabular-nums">
                {canToggleHabits ? `${habits.done} de ${habits.scheduled.length}` : habits.scheduled.length}
              </span>
            </h3>
            <ul>
              {habits.scheduled.map((h) => {
                const done = isDone(h, date);
                return (
                  <li key={h.id} className="flex items-center gap-3 px-2 py-1.5">
                    <span className="flex size-7 shrink-0 items-center justify-center">
                      <Checkbox
                        checked={done}
                        disabled={!canToggleHabits}
                        onChange={() => toggleHabit(h.id, iso)}
                        label={`${done ? "Desmarcar" : "Marcar"} ${h.name}`}
                      />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", done && "text-muted-foreground")}>
                      <span className="mr-1.5">{h.icon}</span>
                      {h.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
