import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { shortDate } from "@/lib/dates";

export interface ChartPoint {
  /** yyyy-MM-dd */
  date: string;
  value: number;
}

const HEIGHT = 240;
const PAD = { top: 18, right: 16, bottom: 26, left: 44 };

/** Passos "redondos" para o eixo: 1, 2, 2,5 ou 5 vezes uma potência de dez. */
function niceStep(span: number, count: number): number {
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / pow;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * pow;
}

/**
 * Linha de uma série só ao longo do tempo. O título de quem usa diz o que é,
 * por isso não tem legenda. Passe o mouse (ou o dedo) para ler cada ponto.
 */
export function LineChart({
  points,
  label,
  format,
  axisFormat,
  target,
  band,
}: {
  points: ChartPoint[];
  /** Descrição para leitores de tela. */
  label: string;
  format: (value: number) => string;
  /** Rótulo curto do eixo. Sem ele, usa o número de `format` sem a unidade. */
  axisFormat?: (value: number) => string;
  /** Linha de referência, como o alvo de uma meta. */
  target?: { value: number; label: string };
  /** Faixa de referência sombreada, como o peso ideal pelo IMC. */
  band?: { from: number; to: number; label: string };
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (points.length === 0 || width === 0) return null;
    const values = points.map((p) => p.value);
    if (target) values.push(target.value);
    if (band) values.push(band.from, band.to);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const step = niceStep(Math.max(hi - lo, Math.abs(hi) * 0.02, 0.5), 4);
    const min = Math.floor((lo - step * 0.25) / step) * step;
    const max = Math.ceil((hi + step * 0.25) / step) * step;
    const ticks: number[] = [];
    for (let t = min; t <= max + step / 1000; t += step) ticks.push(Math.round(t * 1000) / 1000);

    const first = parseISO(points[0].date);
    const days = Math.max(1, differenceInCalendarDays(parseISO(points.at(-1)!.date), first));
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (date: string) =>
      points.length === 1 ? PAD.left + innerW / 2 : PAD.left + (differenceInCalendarDays(parseISO(date), first) / days) * innerW;
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
    const xy = points.map((p) => ({ x: x(p.date), y: y(p.value) }));
    return { ticks, xy, y, path: xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") };
  }, [points, width, target, band]);

  function nearest(clientX: number) {
    if (!geo || !wrap.current) return;
    const px = clientX - wrap.current.getBoundingClientRect().left;
    let best = 0;
    geo.xy.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(geo.xy[best].x - px)) best = i;
    });
    setHover(best);
  }

  const active = hover !== null && geo ? { point: points[hover], ...geo.xy[hover], prev: points[hover - 1] } : null;
  const last = geo?.xy.at(-1);

  const lastLabelY = geo && last ? placeLastLabel(geo, format(points.at(-1)!.value), target && geo.y(target.value)) : 0;

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
            onPointerLeave={() => setHover(null)}
          >
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} className="stroke-border" />
                <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-subtle-foreground text-xs tabular-nums">
                  {axisFormat ? axisFormat(t) : format(t).replace(/\s.*$/, "")}
                </text>
              </g>
            ))}

            {band && (
              <g>
                <rect
                  x={PAD.left}
                  width={width - PAD.left - PAD.right}
                  y={geo.y(band.to)}
                  height={Math.max(0, geo.y(band.from) - geo.y(band.to))}
                  className="fill-[color-mix(in_srgb,var(--success)_13%,transparent)]"
                />
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(band.to)} y2={geo.y(band.to)} className="stroke-[color-mix(in_srgb,var(--success)_45%,transparent)]" />
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(band.from)} y2={geo.y(band.from)} className="stroke-[color-mix(in_srgb,var(--success)_45%,transparent)]" />
              </g>
            )}

            {target && (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.y(target.value)}
                  y2={geo.y(target.value)}
                  strokeDasharray="4 4"
                  className={band ? "stroke-foreground" : "stroke-success"}
                  strokeWidth={1.5}
                />
              </g>
            )}

            <text x={geo.xy[0].x} y={HEIGHT - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-subtle-foreground text-xs">
              {shortDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={last!.x} y={HEIGHT - 6} textAnchor="end" className="fill-subtle-foreground text-xs">
                {shortDate(points.at(-1)!.date)}
              </text>
            )}

            {active && (
              <line x1={active.x} x2={active.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-border-strong" />
            )}

            <path d={geo.path} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-primary" />
            {geo.xy.map((p, i) => (
              <circle
                key={points[i].date + i}
                cx={p.x}
                cy={p.y}
                r={hover === i ? 5.5 : 4}
                strokeWidth={2}
                className="fill-primary stroke-surface"
              />
            ))}

            {/* Só o ponto mais recente ganha o número escrito; os outros ficam no hover. */}
            {!active && last && (
              <text
                x={Math.min(last.x, width - PAD.right)}
                y={lastLabelY}
                textAnchor="end"
                className="fill-foreground text-sm font-semibold tabular-nums"
              >
                {format(points.at(-1)!.value)}
              </text>
            )}
          </svg>
        )}

        {active && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-surface-raised px-2.5 py-1.5 text-sm whitespace-nowrap shadow-md"
            style={{
              left: Math.min(Math.max(active.x, 70), Math.max(width - 70, 70)),
              top: active.y - 12,
            }}
          >
            <p className="font-semibold tabular-nums">{format(active.point.value)}</p>
            <p className="text-muted-foreground">
              {shortDate(active.point.date)}
              {active.prev &&
                Math.abs(active.point.value - active.prev.value) >= 0.05 &&
                `, ${active.point.value > active.prev.value ? "+" : "−"}${format(Math.abs(active.point.value - active.prev.value))}`}
            </p>
          </div>
        )}
      </div>
      {(target || band) && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-11 text-xs text-muted-foreground">
          {target && (
            <span className="flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <line x1="0" x2="18" y1="3" y2="3" strokeDasharray="4 3" strokeWidth={1.5} className={band ? "stroke-foreground" : "stroke-success"} />
              </svg>
              {target.label}
            </span>
          )}
          {band && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm border border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color-mix(in_srgb,var(--success)_13%,transparent)]" />
              {band.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Altura (linha de base) do número do último ponto: acima ou abaixo dele, o que
 * não cruzar a linha da meta, a própria linha do gráfico nem a borda.
 */
function placeLastLabel(
  geo: { xy: { x: number; y: number }[] },
  text: string,
  targetY: number | undefined,
): number {
  const p = geo.xy.at(-1)!;
  const w = text.length * 8 + 4;
  const above = p.y - 12;
  const below = p.y + 24;
  const cost = (base: number) => {
    const top = base - 14;
    const bottom = base + 3;
    let c = 0;
    if (top < 2 || bottom > HEIGHT - PAD.bottom) c += 100;
    if (targetY !== undefined && targetY >= top - 2 && targetY <= bottom + 2) c += 10;
    // Trechos da linha que passam por baixo do texto (que fica à esquerda do ponto).
    for (let i = geo.xy.length - 1; i > 0; i--) {
      const a = geo.xy[i - 1];
      const b = geo.xy[i];
      if (b.x < p.x - w) break;
      for (let t = 0; t <= 1; t += 0.1) {
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (x >= p.x - w && x <= p.x && y >= top && y <= bottom) {
          c += 1;
        }
      }
    }
    return c;
  };
  return cost(below) < cost(above) ? below : above;
}
