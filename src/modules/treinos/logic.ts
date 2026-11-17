import { add, parseISO, startOfWeek } from "date-fns";
import type { Tone } from "@/components/ui/Badge";
import { toISO, today } from "@/lib/dates";
import type { Intensity, Modality, Session } from "./types";

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const num = (n: number) => decimal.format(n);

export const INTENSITY_META: Record<Intensity, { label: string; tone: Tone }> = {
  leve: { label: "Leve", tone: "neutral" },
  moderado: { label: "Moderado", tone: "info" },
  forte: { label: "Forte", tone: "warning" },
};

/** "45 min" ou "1h05". */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}

function clock(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** Ritmo: min/km para km, min/100 m para metros (natação). */
export function pace(distance: number, duration: number, unit: Modality["unit"]): string | null {
  if (distance <= 0 || duration <= 0) return null;
  return unit === "km"
    ? `${clock(duration / distance)}/km`
    : `${clock(duration / (distance / 100))}/100 m`;
}

export function formatDistance(distance: number, unit: Modality["unit"]): string {
  return `${num(distance)} ${unit}`;
}

/** Uma linha que resume o treino conforme o tipo da modalidade. */
export function sessionSummary(s: Session, m: Modality): string {
  const parts: string[] = [];
  if (m.kind === "distance" && s.distance > 0) {
    parts.push(formatDistance(s.distance, m.unit));
    if (s.duration > 0) parts.push(`em ${formatDuration(s.duration)}`);
    const p = pace(s.distance, s.duration, m.unit);
    return p ? `${parts.join(" ")}, ${p}` : parts.join(" ");
  }
  if (m.kind === "fight") {
    if (s.style) parts.push(s.style);
    if (s.rounds > 0) parts.push(`${s.rounds} ${s.rounds === 1 ? "round" : "rounds"}`);
  }
  if (m.kind === "strength" && s.exercises.length > 0) {
    parts.push(`${s.exercises.length} ${s.exercises.length === 1 ? "exercício" : "exercícios"}`);
  }
  if (s.duration > 0) parts.push(formatDuration(s.duration));
  return parts.join(", ") || "Sem detalhes";
}

export function newestFirst(a: Session, b: Session): number {
  return b.date.localeCompare(a.date);
}

export function inCurrentMonth(s: Session, now: Date = today()): boolean {
  return s.date.slice(0, 7) === toISO(now).slice(0, 7);
}

/** Os sete dias da semana atual, de segunda a domingo. */
export function currentWeek(now: Date = today()): Date[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => add(monday, { days: i }));
}

export function inCurrentWeek(s: Session, now: Date = today()): boolean {
  const week = currentWeek(now);
  return s.date >= toISO(week[0]) && s.date <= toISO(week[6]);
}

export const sum = (list: Session[], key: "duration" | "distance" | "rounds") =>
  list.reduce((total, s) => total + (s[key] || 0), 0);

export interface LoadProgress {
  name: string;
  first: number;
  last: number;
  /** Quantos treinos tiveram esse exercício. */
  times: number;
  lastDate: string;
}

/** Evolução da carga de cada exercício, do primeiro registro ao mais recente. */
export function loadProgress(sessions: Session[]): LoadProgress[] {
  const byName = new Map<string, LoadProgress>();
  const chronological = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of chronological) {
    for (const e of s.exercises) {
      const key = e.name.trim().toLocaleLowerCase("pt-BR");
      if (!key || e.weight <= 0) continue;
      const entry = byName.get(key);
      if (entry) {
        entry.last = e.weight;
        entry.times++;
        entry.lastDate = s.date;
      } else {
        byName.set(key, { name: e.name.trim(), first: e.weight, last: e.weight, times: 1, lastDate: s.date });
      }
    }
  }
  return [...byName.values()].sort((a, b) => b.times - a.times || a.name.localeCompare(b.name, "pt-BR"));
}

export function daysAgoLabel(date: string, now: Date = today()): string {
  const days = Math.round((now.getTime() - parseISO(date).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 14) return `há ${days} dias`;
  if (days < 60) return `há ${Math.round(days / 7)} semanas`;
  return `há ${Math.round(days / 30.44)} meses`;
}
