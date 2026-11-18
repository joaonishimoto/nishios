import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import {
  addDays,
  addMonths,
  addYears,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { toISO, today } from "@/lib/dates";
import { control } from "./control";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
const WEEKDAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2026, i, 1), "MMM", { locale: ptBR }).replace(".", ""));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const parse = (iso: string) => {
  const d = parseISO(iso);
  return iso && isValid(d) ? d : null;
};

type Mode = "dias" | "meses" | "anos";

export interface DatePickerProps {
  id?: string;
  /** yyyy-MM-dd, ou vazio. */
  value?: string;
  /** Chamado como o `<input type="date">`: o dia novo vem em `e.target.value`. */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  /** Sem `required`, aparece "Limpar". */
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Seletor de data do NishiOS: mês com a semana começando na segunda, como o
 * calendário do app. Toque no nome do mês para pular de mês ou de ano (útil em
 * aniversários). Setas andam pelos dias, Page Up e Page Down trocam de mês.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "Escolher data",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  // Sem `value`, guarda o dia por conta própria (uso não controlado).
  const [inner, setInner] = useState("");
  const selected = parse(value ?? inner);
  const [open, setOpen] = useState(false);

  function emit(next: string) {
    if (value === undefined) setInner(next);
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLInputElement>);
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          className={cn(control, "flex h-9 items-center gap-2 text-left data-[state=open]:border-ring", className)}
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-subtle-foreground" />
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-subtle-foreground")}>
            {selected ? format(selected, "d 'de' MMM 'de' yyyy", { locale: ptBR }) : placeholder}
          </span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            // Abre com o foco no dia escolhido (ou hoje), pronto para as setas.
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.querySelector<HTMLButtonElement>('[data-iso][tabindex="0"]')?.focus();
          }}
          className="z-dialog w-[17.5rem] animate-pop-in rounded-lg border border-border bg-surface-raised p-3 shadow-md focus:outline-none"
        >
          <Month
            selected={selected}
            min={parse(min ?? "")}
            max={parse(max ?? "")}
            canClear={!required && !!selected}
            onPick={(d) => {
              emit(d ? toISO(d) : "");
              setOpen(false);
            }}
          />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

function Month({
  selected,
  min,
  max,
  canClear,
  onPick,
}: {
  selected: Date | null;
  min: Date | null;
  max: Date | null;
  canClear: boolean;
  onPick: (d: Date | null) => void;
}) {
  const now = today();
  const start = selected ?? (max && now > max ? max : min && now < min ? min : now);
  const [view, setView] = useState(startOfMonth(start));
  const [focus, setFocus] = useState(start);
  const [mode, setMode] = useState<Mode>("dias");
  const grid = useRef<HTMLDivElement>(null);
  const focusISO = toISO(focus);
  const allowed = (d: Date) => (!min || toISO(d) >= toISO(min)) && (!max || toISO(d) <= toISO(max));

  // O foco segue o dia ativo, para as setas funcionarem como num calendário de verdade.
  useEffect(() => {
    if (mode !== "dias") return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusISO}"]`)?.focus();
  }, [focusISO, mode, view]);

  function goTo(d: Date) {
    setFocus(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(startOfMonth(d));
  }

  function onKey(e: KeyboardEvent) {
    const steps: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => (e.shiftKey ? addYears(focus, -1) : addMonths(focus, -1)),
      PageDown: () => (e.shiftKey ? addYears(focus, 1) : addMonths(focus, 1)),
      Home: () => startOfWeek(focus, { weekStartsOn: 1 }),
      End: () => endOfWeek(focus, { weekStartsOn: 1 }),
    };
    const step = steps[e.key];
    if (step) {
      e.preventDefault();
      goTo(step());
    }
  }

  const first = startOfWeek(view, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const decade = Math.floor(view.getFullYear() / 12) * 12;

  const title =
    mode === "dias" ? cap(format(view, "MMMM 'de' yyyy", { locale: ptBR })) : mode === "meses" ? String(view.getFullYear()) : `${decade} a ${decade + 11}`;
  const shift = (n: number) =>
    setView((v) => (mode === "dias" ? addMonths(v, n) : mode === "meses" ? addYears(v, n) : addYears(v, n * 12)));
  const prevLabel = mode === "dias" ? "Mês anterior" : mode === "meses" ? "Ano anterior" : "Anos anteriores";
  const nextLabel = mode === "dias" ? "Próximo mês" : mode === "meses" ? "Próximo ano" : "Próximos anos";

  const nav = "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground";
  const cell = "flex h-10 items-center justify-center rounded-md text-sm transition-colors duration-(--motion-fast)";

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <button type="button" className={nav} aria-label={prevLabel} onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "dias" ? "meses" : mode === "meses" ? "anos" : "dias")}
          aria-label={mode === "anos" ? "Voltar aos dias" : `${title}, escolher ${mode === "dias" ? "o mês" : "o ano"}`}
          className="h-8 flex-1 rounded-md px-2 font-medium hover:bg-surface-hover"
        >
          {title}
        </button>
        <button type="button" className={nav} aria-label={nextLabel} onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </button>
      </div>

      {mode === "dias" && (
        <div ref={grid} role="grid" aria-label={title} onKeyDown={onKey}>
          <div role="row" className="grid grid-cols-7">
            {WEEKDAYS.map((d, i) => (
              <span key={i} role="columnheader" aria-label={WEEKDAY_NAMES[i]} className="py-1 text-center text-xs text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, w) => (
            <div key={w} role="row" className="grid grid-cols-7">
              {days.slice(w * 7, w * 7 + 7).map((d) => {
                const iso = toISO(d);
                const outside = d.getMonth() !== view.getMonth();
                const isSelected = selected !== null && iso === toISO(selected);
                const isToday = iso === toISO(now);
                const ok = allowed(d);
                return (
                  <span key={iso} role="gridcell" aria-selected={isSelected}>
                    <button
                      type="button"
                      data-iso={iso}
                      tabIndex={iso === focusISO ? 0 : -1}
                      disabled={!ok}
                      aria-label={format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => onPick(d)}
                      className={cn(
                        "flex size-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-ring",
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "hover:bg-surface-hover",
                        !isSelected && outside && "text-subtle-foreground",
                        !isSelected && isToday && "font-semibold text-primary ring-1 ring-primary/40 ring-inset",
                        !ok && "cursor-not-allowed line-through opacity-40 hover:bg-transparent",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {mode === "meses" && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => {
            const isCurrent = selected?.getFullYear() === view.getFullYear() && selected.getMonth() === i;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  const next = new Date(view.getFullYear(), i, 1);
                  setView(next);
                  setFocus(new Date(view.getFullYear(), i, Math.min(focus.getDate(), 28)));
                  setMode("dias");
                }}
                className={cn(cell, isCurrent ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-surface-hover")}
              >
                {cap(m)}
              </button>
            );
          })}
        </div>
      )}

      {mode === "anos" && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => decade + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setView(new Date(y, view.getMonth(), 1));
                setMode("meses");
              }}
              className={cn(
                cell,
                "tabular-nums",
                selected?.getFullYear() === y ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-surface-hover",
                y === now.getFullYear() && selected?.getFullYear() !== y && "font-semibold text-primary",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        {allowed(now) ? (
          <button type="button" onClick={() => onPick(now)} className="h-7 rounded-md px-2 text-sm font-medium text-primary hover:bg-surface-hover">
            Hoje
          </button>
        ) : (
          <span />
        )}
        {canClear && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="h-7 rounded-md px-2 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
