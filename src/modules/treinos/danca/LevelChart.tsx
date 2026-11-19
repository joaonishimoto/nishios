import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/cn";
import { shortDate, toISO, today } from "@/lib/dates";
import { LEVEL_META, levelIndex } from "./levels";
import { LEVEL_ORDER, type LevelChange } from "./types";

const W = 320;
const H = 150;
const PAD = { top: 8, right: 10, bottom: 22, left: 96 };

/**
 * A evolução da faixa ao longo do tempo: uma escada que sobe a cada mudança e
 * segue reta até hoje. Cada degrau tem a cor da faixa alcançada.
 */
export function LevelChart({ history, className }: { history: LevelChange[]; className?: string }) {
  const end = toISO(today());
  const start = history[0].date < end ? history[0].date : end;
  const span = Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)));
  const x = (date: string) =>
    PAD.left + (differenceInCalendarDays(parseISO(date), parseISO(start)) / span) * (W - PAD.left - PAD.right);
  const rows = LEVEL_ORDER.length - 1;
  const y = (i: number) => PAD.top + ((rows - i) / rows) * (H - PAD.top - PAD.bottom);

  // Degraus: cada mudança vale até a próxima (ou até hoje).
  const segments = history.map((h, i) => ({
    h,
    x1: x(h.date),
    x2: x(history[i + 1]?.date ?? end),
    y: y(levelIndex(h.level)),
    prevY: y(i > 0 ? levelIndex(history[i - 1].level) : 0),
  }));
  const last = history[history.length - 1];

  return (
    <figure className={cn("rounded-lg border border-border p-2", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Evolução da faixa, de ${shortDate(start)} até hoje: agora em ${LEVEL_META[last.level].label}`}
      >
        {LEVEL_ORDER.map((l, i) => (
          <g key={l}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(i)} y2={y(i)} stroke="var(--border)" strokeWidth={1} />
            <rect
              x={6}
              y={y(i) - 3.5}
              width={14}
              height={7}
              rx={1.5}
              fill={l === "nao" ? "transparent" : LEVEL_META[l].color}
              stroke={LEVEL_META[l].border}
              strokeDasharray={l === "nao" ? "2 1.5" : undefined}
            />
            <text x={25} y={y(i) + 3.5} fontSize={10} fill="var(--muted-foreground)">
              {LEVEL_META[l].label}
            </text>
          </g>
        ))}
        {segments.map((s) => (
          <g key={s.h.id}>
            <line x1={s.x1} x2={s.x1} y1={s.prevY} y2={s.y} stroke="var(--border-strong)" strokeWidth={1.5} />
            <line
              x1={s.x1}
              x2={Math.max(s.x2, s.x1 + 0.5)}
              y1={s.y}
              y2={s.y}
              stroke={s.h.level === "nao" ? "var(--border-strong)" : LEVEL_META[s.h.level].border}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle
              cx={s.x1}
              cy={s.y}
              r={4}
              fill={s.h.level === "nao" ? "var(--surface)" : LEVEL_META[s.h.level].color}
              stroke={LEVEL_META[s.h.level].border}
              strokeWidth={1.5}
            >
              <title>{`${shortDate(s.h.date)}: ${LEVEL_META[s.h.level].label}`}</title>
            </circle>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={10} fill="var(--muted-foreground)">
          {shortDate(start)}
        </text>
        <text x={W - PAD.right} y={H - 6} fontSize={10} textAnchor="end" fill="var(--muted-foreground)">
          Hoje
        </text>
      </svg>
    </figure>
  );
}
