import { cn } from "@/lib/cn";
import { change, formatDelta, num } from "./logic";
import { MEASURES, type Entry, type MeasureMeta, type Metric } from "./types";

type Pt = [number, number];
/** Curva cúbica: dois pontos de controle e o ponto final. */
type Seg = [Pt, Pt, Pt];

/**
 * Contorno da metade direita do corpo, com o centro em x=0, do queixo até a
 * virilha. A outra metade é o espelho, e as duas viram um contorno só (sem
 * costura no meio). Os braços ficam soltos do tronco.
 */
const START: Pt = [0, 56];
const RIGHT_HALF: Seg[] = [
  [[4, 56], [8, 56], [9, 58]],
  // pescoço e trapézio
  [[9, 66], [10, 72], [13, 76]],
  [[22, 80], [34, 82], [43, 86]],
  // ombro (deltoide)
  [[53, 90], [58, 100], [58, 113]],
  // braço e antebraço por fora
  [[59, 127], [61, 141], [61, 154]],
  [[61, 162], [62, 167], [62, 173]],
  [[65, 190], [66, 208], [65, 228]],
  // mão
  [[67, 240], [68, 254], [63, 262]],
  [[59, 268], [53, 265], [53, 257]],
  [[53, 249], [54, 240], [55, 228]],
  // antebraço e braço por dentro, até a axila
  [[53, 210], [50, 192], [49, 176]],
  [[48, 160], [46, 140], [44, 124]],
  [[43, 119], [42, 116], [40, 114]],
  // tronco: costelas, cintura, quadril
  [[40, 132], [37, 152], [33, 172]],
  [[31, 186], [33, 206], [37, 222]],
  // coxa, joelho, panturrilha, tornozelo
  [[40, 234], [40, 246], [39, 258]],
  [[38, 284], [35, 306], [30, 330]],
  [[29, 340], [30, 348], [31, 356]],
  [[34, 376], [30, 400], [24, 420]],
  // pé
  [[24, 430], [31, 436], [31, 442]],
  [[24, 443], [14, 443], [7, 442]],
  // perna por dentro até a virilha
  [[7, 434], [8, 428], [9, 420]],
  [[12, 398], [14, 376], [12, 356]],
  [[11, 346], [11, 338], [10, 330]],
  [[8, 306], [6, 282], [3, 262]],
  [[2, 256], [1, 254], [0, 252]],
];

function bodyPath(): string {
  const f = (p: Pt) => `${p[0]} ${p[1]}`;
  const parts = [`M${f(START)}`];
  for (const [c1, c2, p] of RIGHT_HALF) parts.push(`C${f(c1)} ${f(c2)} ${f(p)}`);
  // Volta pela metade esquerda: as mesmas curvas espelhadas, de trás para frente.
  const m = (p: Pt): Pt => [-p[0], p[1]];
  for (let i = RIGHT_HALF.length - 1; i >= 0; i--) {
    const [c1, c2] = RIGHT_HALF[i];
    const from = i === 0 ? START : RIGHT_HALF[i - 1][2];
    parts.push(`C${f(m(c2))} ${f(m(c1))} ${f(m(from))}`);
  }
  return parts.join(" ") + " Z";
}

const BODY = bodyPath();

/** Traços leves de anatomia por cima do contorno. */
const DETAILS = [
  // clavículas
  "M-10 80 C-20 84 -30 85 -38 88",
  "M10 80 C20 84 30 85 38 88",
  // peitoral
  "M-34 118 C-26 132 -10 134 -2 126",
  "M34 118 C26 132 10 134 2 126",
  // linha do abdômen
  "M0 136 L0 192",
  // joelhos
  "M-26 340 C-22 346 -15 346 -12 340",
  "M26 340 C22 346 15 346 12 340",
];

const VIEW = { w: 360, h: 470 };
const CX = 180;
/** Onde as etiquetas terminam e as linhas começam. */
const EDGE = { left: 104, right: 256 };

/** Ponta da fita do lado da etiqueta, onde a linha encosta. */
function anchor(m: MeasureMeta): Pt {
  const { x, y, hw } = m.tape;
  return [CX + x + (m.side === "left" ? -hw : hw), y];
}

/** A fita: um arco raso na frente do corpo, como uma fita métrica vista de frente. */
function tapePath(m: MeasureMeta): string {
  const { x, y, hw } = m.tape;
  const sag = Math.max(2, hw * 0.16);
  return `M${CX + x - hw} ${y} Q${CX + x} ${y + sag * 2} ${CX + x + hw} ${y}`;
}

/**
 * Silhueta com uma etiqueta por medida e uma fita no lugar onde ela é tirada.
 * Clicar em uma etiqueta (ou na fita) escolhe a medida que aparece no gráfico.
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
    <div className="relative mx-auto w-full max-w-[25rem]" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden className="absolute inset-0 size-full">
        {/* Linhas por baixo do corpo: quando cruzam um braço, passam por trás dele. */}
        {MEASURES.map((m) => {
          const active = selected === m.id;
          const [ax, ay] = anchor(m);
          const x = m.side === "left" ? EDGE.left : EDGE.right;
          const knee = m.side === "left" ? x + 8 : x - 8;
          return (
            <polyline
              key={m.id}
              points={`${x},${m.labelY} ${knee},${m.labelY} ${ax},${ay}`}
              fill="none"
              strokeWidth={active ? 1.5 : 1}
              className={cn(
                "transition-colors duration-(--motion-fast)",
                active ? "stroke-primary" : "stroke-[color-mix(in_srgb,var(--primary)_22%,var(--surface))]",
              )}
            />
          );
        })}

        <g
          className="fill-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] stroke-[color-mix(in_srgb,var(--primary)_38%,var(--surface))]"
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          <path d={BODY} transform={`translate(${CX} 0)`} />
          <ellipse cx={CX} cy={35} rx={17.5} ry={22.5} />
        </g>
        <g
          transform={`translate(${CX} 0)`}
          fill="none"
          strokeWidth={1}
          strokeLinecap="round"
          className="stroke-[color-mix(in_srgb,var(--primary)_20%,var(--surface))]"
        >
          {DETAILS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {MEASURES.map((m) => {
          const active = selected === m.id;
          const [ax, ay] = anchor(m);
          return (
            <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => onSelect(m.id)}>
              <path
                d={tapePath(m)}
                fill="none"
                strokeLinecap="round"
                strokeWidth={active ? 2.5 : 1.25}
                strokeDasharray={active ? undefined : "2.5 3"}
                className={cn(
                  "transition-colors duration-(--motion-fast)",
                  active ? "stroke-primary" : "stroke-[color-mix(in_srgb,var(--primary)_45%,var(--surface))]",
                )}
              />
              <circle
                cx={ax}
                cy={ay}
                r={active ? 4 : 2.75}
                strokeWidth={1.5}
                className={active ? "fill-primary stroke-surface" : "fill-[color-mix(in_srgb,var(--primary)_55%,var(--surface))] stroke-surface"}
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
            <span className={cn("block truncate text-xs", active ? "text-primary" : "text-muted-foreground")}>{m.label}</span>
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
