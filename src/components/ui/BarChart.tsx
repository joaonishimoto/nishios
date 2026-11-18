import { cn } from "@/lib/cn";

export interface Bar {
  key: string;
  /** Rótulo curto embaixo da barra: "nov", "dez". */
  label: string;
  value: number;
  /** Frase para leitores de tela e para a dica ao passar o mouse. */
  title: string;
}

const HEIGHT = 160;

/**
 * Barras de um número por período, com o zero no meio quando há valores
 * negativos: positivo sobe em verde, negativo desce em vermelho. Tocar numa
 * barra a seleciona.
 */
export function BarChart({
  bars,
  label,
  selected,
  onSelect,
  format,
}: {
  bars: Bar[];
  /** Descrição do gráfico para leitores de tela. */
  label: string;
  selected?: string;
  onSelect?: (key: string) => void;
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => Math.max(0, b.value)));
  const min = Math.min(0, ...bars.map((b) => b.value));
  const span = max - min;
  const zero = (max / span) * HEIGHT;

  return (
    <div role="group" aria-label={label} className="select-none">
      <div className="relative flex items-stretch gap-1 sm:gap-1.5" style={{ height: HEIGHT }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-border-strong" style={{ top: zero }} />
        {bars.map((b) => {
          const h = Math.max(2, (Math.abs(b.value) / span) * HEIGHT);
          const active = b.key === selected;
          const negative = b.value < 0;
          return (
            <button
              key={b.key}
              type="button"
              title={`${b.title}: ${format(b.value)}`}
              aria-label={`${b.title}: ${format(b.value)}`}
              aria-pressed={active}
              onClick={() => onSelect?.(b.key)}
              className="group relative flex-1 rounded-sm outline-offset-2 hover:bg-surface-hover"
            >
              <span
                className={cn(
                  "absolute inset-x-0.5 rounded-sm transition-opacity duration-(--motion-fast) sm:inset-x-1",
                  negative ? "bg-danger" : "bg-success",
                  active ? "opacity-100" : "opacity-45 group-hover:opacity-70",
                )}
                style={negative ? { top: zero, height: h } : { top: zero - h, height: h }}
              />
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1 sm:gap-1.5">
        {bars.map((b) => (
          <span
            key={b.key}
            className={cn(
              "flex-1 truncate text-center text-xs",
              b.key === selected ? "font-semibold text-foreground" : "text-subtle-foreground",
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
