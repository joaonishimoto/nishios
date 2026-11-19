import { differenceInCalendarDays, parseISO, startOfWeek, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type {
  Equipment,
  Exercise,
  ExerciseDef,
  MuscleGroup,
  Plan,
  PlanItem,
  Session,
  SetEntry,
} from "./types";

/** Nome comparável: sem acento, sem caixa e sem espaços sobrando. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const has = (n: string, ...words: string[]) => words.some((w) => n.includes(w));

/** Palpite do equipamento pelo nome, para os exercícios que entram sozinhos no catálogo. */
export function guessEquipment(name: string): Equipment {
  const n = normalizeName(name);
  if (has(n, "halter", "dumbbell")) return "halteres";
  if (has(n, "polia", "cabo", "crossover", "cross over", "puxada", "pulley", "corda")) return "polia";
  if (has(n, "maquina", "leg press", "cadeira", "mesa flexora", "smith", "hack", "peck deck", "voador", "pec deck")) return "maquina";
  if (has(n, "barra fixa", "flexao", "paralela", "prancha", "abdominal", "burpee", "mergulho", "pull up", "chin up")) return "livre";
  if (has(n, "barra", "supino", "agachamento", "levantamento terra", "terra", "remada curvada", "desenvolvimento", "rosca direta", "stiff")) return "barra";
  if (has(n, "kettlebell", "elastico", "anilha")) return "outro";
  return "outro";
}

/** Palpite do grupo muscular pelo nome. */
export function guessMuscle(name: string): MuscleGroup {
  const n = normalizeName(name);
  if (has(n, "supino", "crucifixo", "crossover", "peck deck", "pec deck", "voador", "flexao", "peito")) return "peito";
  if (has(n, "puxada", "remada", "barra fixa", "pulldown", "pull up", "levantamento terra", "costas", "serrote")) return "costas";
  if (has(n, "desenvolvimento", "elevacao lateral", "elevacao frontal", "ombro", "face pull", "encolhimento")) return "ombros";
  if (has(n, "rosca punho", "antebraco")) return "antebraco";
  if (has(n, "rosca", "biceps")) return "biceps";
  if (has(n, "triceps", "frances", "testa", "paralela", "mergulho")) return "triceps";
  if (has(n, "panturrilha", "gemeos")) return "panturrilha";
  if (has(n, "flexora", "stiff", "posterior")) return "posterior";
  if (has(n, "gluteo", "elevacao pelvica", "hip thrust", "abducao")) return "gluteos";
  if (has(n, "agachamento", "leg press", "extensora", "afundo", "hack", "quadriceps", "bulgaro")) return "quadriceps";
  if (has(n, "abdominal", "prancha", "abdomen", "core")) return "abdomen";
  return "corpo";
}

/** As séries de um exercício: as detalhadas ou, em treinos antigos, `sets` vezes a mesma. */
export function setsOf(e: Exercise): SetEntry[] {
  if (e.setsDetail && e.setsDetail.length > 0) return e.setsDetail;
  return Array.from({ length: Math.max(0, e.sets) }, () => ({ reps: e.reps, weight: e.weight }));
}

/** Resumo que fica em `sets`, `reps` e `weight`: a série mais pesada manda. */
export function summarizeSets(sets: SetEntry[]): Pick<Exercise, "sets" | "reps" | "weight"> {
  if (sets.length === 0) return { sets: 0, reps: 0, weight: 0 };
  const top = sets.reduce((best, s) => (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best), sets[0]);
  return { sets: sets.length, reps: top.reps, weight: top.weight };
}

/** Carga máxima estimada para uma repetição (Epley). Só conta séries de até 12 repetições. */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

export interface ExerciseMetrics {
  /** Carga da série mais pesada. */
  top: number;
  /** Repetições feitas na série mais pesada. */
  topReps: number;
  e1rm: number;
  /** Repetições vezes carga, somando as séries. */
  volume: number;
  /** Mais repetições numa série. */
  bestReps: number;
  totalReps: number;
  sets: number;
}

export function metricsOf(e: Exercise): ExerciseMetrics {
  const sets = setsOf(e).filter((s) => s.reps > 0 || s.weight > 0);
  const m: ExerciseMetrics = { top: 0, topReps: 0, e1rm: 0, volume: 0, bestReps: 0, totalReps: 0, sets: sets.length };
  for (const s of sets) {
    if (s.weight > m.top || (s.weight === m.top && s.reps > m.topReps)) {
      m.top = s.weight;
      m.topReps = s.reps;
    }
    m.e1rm = Math.max(m.e1rm, estimate1RM(s.weight, s.reps));
    m.volume += s.reps * s.weight;
    m.bestReps = Math.max(m.bestReps, s.reps);
    m.totalReps += s.reps;
  }
  return m;
}

export type StrengthMetric = "top" | "e1rm" | "volume" | "bestReps";

export const METRIC_LABELS: Record<StrengthMetric, string> = {
  top: "Carga máxima",
  e1rm: "1RM estimado",
  volume: "Volume",
  bestReps: "Repetições",
};

export const METRIC_HINTS: Record<StrengthMetric, string> = {
  top: "A carga da série mais pesada de cada treino.",
  e1rm: "Quanto você levantaria numa repetição só, estimado pelas séries (fórmula de Epley).",
  volume: "Séries vezes repetições vezes carga: o trabalho total do exercício no treino.",
  bestReps: "O máximo de repetições numa série. É o que conta nos exercícios sem carga.",
};

export interface HistoryPoint {
  date: string;
  sessionId: string;
  planId?: string;
  exercise: Exercise;
  metrics: ExerciseMetrics;
}

/** Ordena os treinos do mais antigo para o mais novo, sem mudar a lista original. */
const chronological = (sessions: Session[]) => [...sessions].sort((a, b) => a.date.localeCompare(b.date));

/** Cada vez que um exercício foi feito, do mais antigo para o mais novo. */
export function historyByExercise(sessions: Session[]): Map<string, HistoryPoint[]> {
  const map = new Map<string, HistoryPoint[]>();
  for (const s of chronological(sessions)) {
    for (const e of s.exercises) {
      if (!e.exerciseId) continue;
      const metrics = metricsOf(e);
      if (metrics.sets === 0) continue;
      const list = map.get(e.exerciseId) ?? [];
      list.push({ date: s.date, sessionId: s.id, planId: s.planId, exercise: e, metrics });
      map.set(e.exerciseId, list);
    }
  }
  return map;
}

/** Sem carga em nenhum registro, o exercício conta por repetições. */
export function usesLoad(history: HistoryPoint[]): boolean {
  return history.some((h) => h.metrics.top > 0);
}

export function defaultMetric(history: HistoryPoint[]): StrengthMetric {
  return usesLoad(history) ? "top" : "bestReps";
}

export interface RecordEntry {
  value: number;
  date: string;
  /** Repetições da série, para a carga máxima. */
  reps?: number;
}

export interface Records {
  top?: RecordEntry;
  e1rm?: RecordEntry;
  volume?: RecordEntry;
  bestReps?: RecordEntry;
}

export function recordsOf(history: HistoryPoint[]): Records {
  const r: Records = {};
  for (const h of history) {
    const m = h.metrics;
    if (m.top > 0 && (!r.top || m.top > r.top.value || (m.top === r.top.value && m.topReps > (r.top.reps ?? 0))))
      r.top = { value: m.top, date: h.date, reps: m.topReps };
    if (m.e1rm > 0 && (!r.e1rm || m.e1rm > r.e1rm.value)) r.e1rm = { value: m.e1rm, date: h.date };
    if (m.volume > 0 && (!r.volume || m.volume > r.volume.value)) r.volume = { value: m.volume, date: h.date };
    if (m.bestReps > 0 && (!r.bestReps || m.bestReps > r.bestReps.value)) r.bestReps = { value: m.bestReps, date: h.date };
  }
  return r;
}

/** Treinos em que o exercício bateu o próprio recorde (de carga ou, sem carga, de repetições). */
export function recordSessions(history: HistoryPoint[]): Set<string> {
  const load = usesLoad(history);
  const out = new Set<string>();
  let best = 0;
  for (const [i, h] of history.entries()) {
    const v = load ? h.metrics.e1rm || h.metrics.top : h.metrics.bestReps;
    if (i > 0 && v > best) out.add(h.sessionId);
    best = Math.max(best, v);
  }
  return out;
}

export interface Recent {
  exerciseId: string;
  date: string;
  metric: StrengthMetric;
  value: number;
  previous: number;
}

/** Recordes batidos nos últimos `days` dias, do mais novo para o mais antigo. */
export function recentRecords(histories: Map<string, HistoryPoint[]>, days = 30, now: Date = today()): Recent[] {
  const since = toISO(sub(now, { days }));
  const out: Recent[] = [];
  for (const [exerciseId, history] of histories) {
    const metric: StrengthMetric = usesLoad(history) ? "top" : "bestReps";
    let best = 0;
    let latest: Recent | undefined;
    for (const [i, h] of history.entries()) {
      const v = h.metrics[metric];
      if (i > 0 && v > best && h.date >= since) latest = { exerciseId, date: h.date, metric, value: v, previous: best };
      best = Math.max(best, v);
    }
    if (latest) out.push(latest);
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Evolution {
  first: number;
  last: number;
  /** Variação em %, do primeiro ao último ponto. */
  change: number;
  /** Ganho médio por mês, na unidade da métrica. */
  perMonth: number;
  days: number;
}

export function evolution(history: HistoryPoint[], metric: StrengthMetric): Evolution | null {
  const points = history.filter((h) => h.metrics[metric] > 0);
  if (points.length === 0) return null;
  const first = points[0].metrics[metric];
  const last = points.at(-1)!.metrics[metric];
  const days = differenceInCalendarDays(parseISO(points.at(-1)!.date), parseISO(points[0].date));
  return {
    first,
    last,
    change: first > 0 ? ((last - first) / first) * 100 : 0,
    perMonth: days >= 7 ? ((last - first) / days) * 30.44 : 0,
    days,
  };
}

/** Um ponto por dia (o melhor, quando o exercício aparece duas vezes no mesmo dia). */
export function seriesOf(history: HistoryPoint[], metric: StrengthMetric): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const h of history) {
    const v = h.metrics[metric];
    if (v <= 0) continue;
    byDate.set(h.date, Math.max(byDate.get(h.date) ?? 0, v));
  }
  return [...byDate].map(([date, value]) => ({ date, value }));
}

export type Period = "3m" | "6m" | "1a" | "tudo";

export const PERIOD_LABELS: Record<Period, string> = { "3m": "3 meses", "6m": "6 meses", "1a": "1 ano", tudo: "Tudo" };

export function periodStart(p: Period, now: Date = today()): string {
  if (p === "tudo") return "";
  return toISO(sub(now, p === "3m" ? { months: 3 } : p === "6m" ? { months: 6 } : { years: 1 }));
}

/** Séries por grupo muscular, em média por semana nas últimas `weeks` semanas fechadas mais a atual. */
export function weeklySetsByMuscle(
  sessions: Session[],
  catalog: Map<string, ExerciseDef>,
  weeks = 4,
  now: Date = today(),
): { muscle: MuscleGroup; sets: number }[] {
  const since = toISO(sub(startOfWeek(now, { weekStartsOn: 1 }), { weeks: weeks - 1 }));
  const totals = new Map<MuscleGroup, number>();
  for (const s of sessions) {
    if (s.date < since) continue;
    for (const e of s.exercises) {
      const def = e.exerciseId ? catalog.get(e.exerciseId) : undefined;
      if (!def) continue;
      totals.set(def.muscle, (totals.get(def.muscle) ?? 0) + metricsOf(e).sets);
    }
  }
  return [...totals]
    .map(([muscle, sets]) => ({ muscle, sets: sets / weeks }))
    .sort((a, b) => b.sets - a.sets);
}

/** Volume total (kg) de uma lista de treinos. */
export function totalVolume(sessions: Session[]): number {
  return sessions.reduce((t, s) => t + s.exercises.reduce((v, e) => v + metricsOf(e).volume, 0), 0);
}

/** Próxima ficha do rodízio: a seguinte à última usada. */
export function nextPlan(plans: Plan[], sessions: Session[]): Plan | undefined {
  if (plans.length === 0) return undefined;
  const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).find((s) => s.planId && plans.some((p) => p.id === s.planId));
  if (!last) return plans[0];
  const i = plans.findIndex((p) => p.id === last.planId);
  return plans[(i + 1) % plans.length];
}

/** "8" ou "8–12". */
export function repsLabel(item: Pick<PlanItem, "repsMin" | "repsMax">): string {
  return item.repsMax > item.repsMin ? `${item.repsMin}–${item.repsMax}` : `${item.repsMin}`;
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const kg = (n: number) => `${decimal.format(n)} kg`;

export function formatMetric(metric: StrengthMetric, value: number): string {
  if (metric === "bestReps") return `${whole.format(value)} reps`;
  if (metric === "volume") return value >= 10_000 ? `${decimal.format(value / 1000)} t` : `${whole.format(value)} kg`;
  return kg(value);
}

/** "70 × 8, 70 × 8, 72,5 × 6", ou "4 × 8 · 70 kg" quando todas são iguais. */
export function setsLabel(e: Exercise): string {
  const sets = setsOf(e);
  if (sets.length === 0) return "Sem séries";
  const same = sets.every((s) => s.reps === sets[0].reps && s.weight === sets[0].weight);
  if (same) {
    const { reps, weight } = sets[0];
    return weight > 0 ? `${sets.length} × ${reps} · ${kg(weight)}` : `${sets.length} × ${reps}`;
  }
  return sets.map((s) => (s.weight > 0 ? `${decimal.format(s.weight)} × ${s.reps}` : `${s.reps}`)).join(", ");
}

export function formatRest(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}min${String(s).padStart(2, "0")}` : `${m} min`;
}

/**
 * Liga cada exercício dos treinos ao catálogo, pelo nome, e cria no catálogo os
 * que ainda não estão lá. Devolve null quando não há nada a mudar.
 */
export function linkToCatalog(
  sessions: Session[],
  catalog: ExerciseDef[],
): { sessions: Session[]; catalog: ExerciseDef[] } | null {
  const byName = new Map(catalog.map((d) => [normalizeName(d.name), d]));
  const ids = new Set(catalog.map((d) => d.id));
  const added: ExerciseDef[] = [];
  let changed = false;

  const next = sessions.map((s) => {
    if (s.exercises.every((e) => e.exerciseId && ids.has(e.exerciseId))) return s;
    const exercises = s.exercises.map((e) => {
      if (e.exerciseId && ids.has(e.exerciseId)) return e;
      const key = normalizeName(e.name);
      if (!key) return e;
      let def = byName.get(key);
      if (!def) {
        def = { id: crypto.randomUUID(), name: e.name.trim(), equipment: guessEquipment(e.name), muscle: guessMuscle(e.name), notes: "" };
        byName.set(key, def);
        ids.add(def.id);
        added.push(def);
      }
      changed = true;
      return { ...e, exerciseId: def.id };
    });
    return { ...s, exercises };
  });

  return changed ? { sessions: next, catalog: added.length ? [...catalog, ...added] : catalog } : null;
}

/** Acha (ou cria) o exercício do catálogo para um nome digitado. */
export function resolveByName(name: string, catalog: ExerciseDef[]): { def: ExerciseDef; created: boolean } | null {
  const key = normalizeName(name);
  if (!key) return null;
  const found = catalog.find((d) => normalizeName(d.name) === key);
  if (found) return { def: found, created: false };
  return {
    def: { id: crypto.randomUUID(), name: name.trim(), equipment: guessEquipment(name), muscle: guessMuscle(name), notes: "" },
    created: true,
  };
}

/**
 * Fichas sugeridas a partir dos treinos: cada combinação de exercícios que se
 * repete vira uma ficha, com as séries e cargas do treino mais recente dela.
 */
export function suggestPlans(sessions: Session[], max = 6): Omit<Plan, "id">[] {
  const groups = new Map<string, Session[]>();
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    const ids = s.exercises.map((e) => e.exerciseId).filter((id): id is string => !!id);
    if (ids.length === 0) continue;
    const sig = [...new Set(ids)].sort().join("|");
    groups.set(sig, [...(groups.get(sig) ?? []), s]);
  }
  const ranked = [...groups.values()].filter((g) => g.length >= 2);
  const chosen = (ranked.length > 0 ? ranked : [...groups.values()]).slice(0, max);
  return chosen.map((group, i) => {
    const latest = group[0];
    return {
      name: `Treino ${String.fromCharCode(65 + i)}`,
      notes: "",
      items: latest.exercises
        .filter((e) => e.exerciseId)
        .map((e) => {
          const sets = setsOf(e);
          const reps = sets.map((s) => s.reps).filter((r) => r > 0);
          return {
            exerciseId: e.exerciseId!,
            sets: Math.max(1, sets.length),
            repsMin: reps.length ? Math.min(...reps) : 10,
            repsMax: reps.length ? Math.max(...reps) : 10,
            weight: metricsOf(e).top,
            rest: 90,
            notes: "",
          };
        }),
    };
  });
}
