import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { shortDate } from "@/lib/dates";
import type { ChartPoint } from "./LineChart";

export interface ChartSeries {
  key: string;
  label: string;
  points: ChartPoint[];
  /** Cor própria; sem ela, a da posição em SERIES_COLORS. */
  color?: string;
}

/** Cores das séries, na ordem; funcionam no tema claro e no escuro. */
export const SERIES_COLORS = [
  "var(--primary)",
  "var(--cal-compromissos)",
  "var(--cal-pessoas)",
  "var(--cal-treinos)",
  "var(--cal-rotina)",
];

const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 26, left: 48 };

function niceStep(span: number, count: number): number {
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / pow;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * pow;
}

/**
 * Várias linhas no mesmo eixo de tempo, para comparar. A legenda fica embaixo,
 * com a cor de cada série; passe o mouse (ou o dedo) para ler todas num dia.
 */
export function MultiLineChart({
  series,
  label,
  format,
  axisFormat,
  baseline,
}: {
  series: ChartSeries[];
  label: string;
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  /** Linha de referência discreta, como o zero da variação. */
  baseline?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (all.length === 0 || width === 0) return null;
    const values = all.map((p) => p.value);
    if (baseline !== undefined) values.push(baseline);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const step = niceStep(Math.max(hi - lo, Math.abs(hi) * 0.02, 0.5), 4);
    const min = Math.floor((lo - step * 0.2) / step) * step;
    const max = Math.ceil((hi + step * 0.2) / step) * step;
    const ticks: number[] = [];
    for (let t = min; t <= max + step / 1000; t += step) ticks.push(Math.round(t * 1000) / 1000);

    const dates = [...new Set(all.map((p) => p.date))].sort();
    const first = parseISO(dates[0]);
    const days = Math.max(1, differenceInCalendarDays(parseISO(dates.at(-1)!), first));
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (date: string) =>
      dates.length === 1 ? PAD.left + innerW / 2 : PAD.left + (differenceInCalendarDays(parseISO(date), first) / days) * innerW;
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
    const lines = series.map((s) => {
      const xy = s.points.map((p) => ({ x: x(p.date), y: y(p.value) }));
      return { key: s.key, color: s.color, xy, path: xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") };
    });
    return { ticks, y, x, dates, lines };
  }, [series, width, baseline]);

  function nearest(clientX: number) {
    if (!geo || !wrap.current) return;
    const px = clientX - wrap.current.getBoundingClientRect().left;
    let best = geo.dates[0];
    for (const d of geo.dates) if (Math.abs(geo.x(d) - px) < Math.abs(geo.x(best) - px)) best = d;
    setHoverDate(best);
  }

  /** Em cada série, o último valor até o dia sob o cursor. */
  const readout =
    hoverDate && geo
      ? series
          .map((s, i) => {
            const upTo = s.points.filter((p) => p.date <= hoverDate);
            const p = upTo.at(-1);
            return p ? { key: s.key, label: s.label, color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length], value: p.value, exact: p.date === hoverDate } : null;
          })
          .filter((r) => r !== null)
      : [];
  const hoverX = hoverDate && geo ? geo.x(hoverDate) : 0;

  return (
    <div>
      <div ref={wrap} className="relative select-none" style={{ height: HEIGHT }}>
        {geo && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={label}
            className="touch-pan-y overflow-visible"
            onPointerMove={(e) => nearest(e.clientX)}
            onPointerDown={(e) => nearest(e.clientX)}
            onPointerLeave={() => setHoverDate(null)}
          >
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} className="stroke-border" />
                <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-subtle-foreground text-xs tabular-nums">
                  {axisFormat ? axisFormat(t) : format(t).replace(/\s.*$/, "")}
                </text>
              </g>
            ))}
            {baseline !== undefined && (
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(baseline)} y2={geo.y(baseline)} strokeWidth={1.5} className="stroke-border-strong" />
            )}
            <text x={geo.x(geo.dates[0])} y={HEIGHT - 6} textAnchor={geo.dates.length === 1 ? "middle" : "start"} className="fill-subtle-foreground text-xs">
              {shortDate(geo.dates[0])}
            </text>
            {geo.dates.length > 1 && (
              <text x={geo.x(geo.dates.at(-1)!)} y={HEIGHT - 6} textAnchor="end" className="fill-subtle-foreground text-xs">
                {shortDate(geo.dates.at(-1)!)}
              </text>
            )}
            {hoverDate && <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-border-strong" />}
            {geo.lines.map((l, i) => {
              const color = l.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
              return (
                <g key={l.key}>
                  <path d={l.path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {l.xy.map((p, j) => (
                    <circle key={j} cx={p.x} cy={p.y} r={l.xy.length > 24 ? 2.5 : 3.5} fill={color} className="stroke-surface" strokeWidth={1.5} />
                  ))}
                </g>
              );
            })}
          </svg>
        )}

        {hoverDate && readout.length > 0 && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md bg-surface-raised px-2.5 py-1.5 text-sm whitespace-nowrap shadow-md"
            style={{ left: Math.min(Math.max(hoverX, 100), Math.max(width - 100, 100)) }}
          >
            <p className="text-muted-foreground">{shortDate(hoverDate)}</p>
            {readout.map((r) => (
              <p key={r.key} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />
                <span className={r.exact ? "font-medium" : "text-muted-foreground"}>{r.label}</span>
                <span className="ml-auto pl-3 font-semibold tabular-nums">{format(r.value)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs text-muted-foreground">
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
