import { cn } from "@/lib/cn";
import { change, formatDelta, num } from "./logic";
import { MEASURES, type Entry, type Metric } from "./types";

/** Metade direita do corpo, com o centro em x=0. A outra metade é o espelho. */
const HALF_BODY = [
  "M0 60",
  "L9 60 L10 70",
  // ombro e deltoide
  "C22 75 40 76 50 84",
  "C60 90 64 104 64 120",
  // braço e antebraço por fora
  "C66 140 66 152 67 166",
  "C71 182 71 204 67 232",
  // mão
  "C69 244 66 256 60 256 C54 256 51 246 52 234",
  // antebraço e braço por dentro, até a axila
  "C52 208 50 186 48 170",
  "C47 152 46 138 44 124",
  // tronco: peito, cintura, quadril
  "C44 142 40 158 36 172",
  "C34 184 36 204 41 222",
  // coxa, joelho, panturrilha, tornozelo
  "C45 246 44 280 38 312",
  "C36 322 37 330 38 340",
  "C40 362 34 392 27 420",
  // pé
  "C27 428 36 438 34 442 L8 442",
  // perna por dentro até a virilha
  "C8 432 10 424 11 414",
  "C15 388 16 362 14 340",
  "C13 330 14 322 13 312",
  "C11 286 8 262 3 240",
  "L0 238 Z",
].join(" ");

/** Onde as etiquetas terminam e as linhas começam (viewBox 340 x 460). */
const EDGE = { left: 98, right: 242 };
const VIEW = { w: 340, h: 460 };

/**
 * Silhueta com uma etiqueta por medida. Clicar em uma etiqueta escolhe a
 * medida que aparece no gráfico.
 */
export function Silhouette({
  entries,
  selected,
  onSelect,
}: {
  entries: Entry[];
  selected: Metric;
  onSelect: (metric: Metric) => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[23rem]" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden className="absolute inset-0 size-full">
        <g className="fill-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] stroke-[color-mix(in_srgb,var(--primary)_35%,var(--surface))]" strokeWidth={1.5} strokeLinejoin="round">
          <ellipse cx={170} cy={36} rx={19} ry={23} />
          <path d={HALF_BODY} transform="translate(170 0)" />
          <path d={HALF_BODY} transform="translate(170 0) scale(-1 1)" />
        </g>
        {MEASURES.map((m) => {
          const active = selected === m.id;
          const x = m.side === "left" ? EDGE.left : EDGE.right;
          return (
            <g key={m.id} className={active ? "stroke-primary" : "stroke-border-strong"}>
              <line x1={x} y1={m.labelY} x2={m.dot[0]} y2={m.dot[1]} strokeWidth={active ? 1.5 : 1} />
              <circle
                cx={m.dot[0]}
                cy={m.dot[1]}
                r={active ? 4.5 : 3.5}
                strokeWidth={1.5}
                className={active ? "fill-primary stroke-surface" : "fill-surface stroke-[color-mix(in_srgb,var(--primary)_55%,var(--surface))]"}
              />
            </g>
          );
        })}
      </svg>

      {MEASURES.map((m) => {
        const c = change(entries, m.id);
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(m.id)}
            style={{
              top: `${(m.labelY / VIEW.h) * 100}%`,
              width: `${(EDGE.left / VIEW.w) * 100}%`,
              [m.side]: 0,
            }}
            className={cn(
              "absolute -translate-y-1/2 rounded-md px-1.5 py-1 leading-tight transition-colors duration-(--motion-fast)",
              m.side === "left" ? "text-right" : "text-left",
              active ? "bg-surface-selected" : "hover:bg-surface-hover",
            )}
          >
            <span className="block truncate text-xs text-muted-foreground">{m.label}</span>
            {c ? (
              <span className="block text-sm font-semibold whitespace-nowrap tabular-nums">
                {num(c.last.value)}
                <span className="font-normal text-muted-foreground"> cm</span>
                {Math.abs(c.total) >= 0.05 && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatDelta(c.total, m.id).replace(" cm", "")}
                  </span>
                )}
              </span>
            ) : (
              <span className="block text-sm text-subtle-foreground">Sem medida</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
