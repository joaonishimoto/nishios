import { MEASURE, type Entry, type MeasureId, type Metric } from "./types";

export interface Point {
  date: string;
  value: number;
}

export function metricLabel(metric: Metric): string {
  if (metric === "peso") return "Peso";
  if (metric === "gordura") return "Gordura corporal";
  return MEASURE[metric].label;
}

export function metricUnit(metric: Metric): string {
  return metric === "peso" ? "kg" : metric === "gordura" ? "%" : "cm";
}

function valueOf(entry: Entry, metric: Metric): number {
  if (metric === "peso") return entry.weight;
  if (metric === "gordura") return entry.bodyFat;
  return entry.measures[metric] ?? 0;
}

/** Histórico de uma métrica, do mais antigo para o mais novo, só com os dias em que foi medida. */
export function series(entries: Entry[], metric: Metric): Point[] {
  return entries
    .map((e) => ({ date: e.date, value: valueOf(e, metric) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latest(entries: Entry[], metric: Metric): Point | undefined {
  return series(entries, metric).at(-1);
}

export interface Change {
  first: Point;
  last: Point;
  /** Último menos o primeiro. */
  total: number;
  /** Último menos o anterior; null quando só há uma medição. */
  recent: number | null;
}

export function change(entries: Entry[], metric: Metric): Change | null {
  const s = series(entries, metric);
  if (s.length === 0) return null;
  const last = s.at(-1)!;
  return {
    first: s[0],
    last,
    total: last.value - s[0].value,
    recent: s.length > 1 ? last.value - s.at(-2)!.value : null,
  };
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const num = (n: number) => decimal.format(n);

export function formatValue(value: number, metric: Metric): string {
  return `${num(value)} ${metricUnit(metric)}`;
}

/** "+1,2 kg", "−0,5 cm" ou "igual". */
export function formatDelta(delta: number, metric: Metric): string {
  if (Math.abs(delta) < 0.05) return "igual";
  // Diferença entre percentuais se diz em pontos, não em "%".
  const unit = metric === "gordura" ? (Math.abs(delta) === 1 ? "ponto" : "pontos") : metricUnit(metric);
  return `${delta > 0 ? "+" : "−"}${num(Math.abs(delta))} ${unit}`;
}

export interface Bmi {
  value: number;
  label: string;
}

export function bmi(weight: number, heightCm: number): Bmi | null {
  if (!(weight > 0) || !(heightCm > 0)) return null;
  const value = weight / (heightCm / 100) ** 2;
  const label =
    value < 18.5 ? "Abaixo do peso" : value < 25 ? "Peso normal" : value < 30 ? "Sobrepeso" : "Obesidade";
  return { value, label };
}

export const MEASURE_IDS = Object.keys(MEASURE) as MeasureId[];

/** Resumo de um dia de medição, para a lista do histórico. */
export function entrySummary(e: Entry): string {
  const parts: string[] = [];
  if (e.bodyFat > 0) parts.push(`${num(e.bodyFat)}% de gordura`);
  const measured = MEASURE_IDS.filter((id) => (e.measures[id] ?? 0) > 0);
  if (measured.length > 0) {
    parts.push(
      measured.length <= 3
        ? measured.map((id) => `${MEASURE[id].label.toLowerCase()} ${num(e.measures[id]!)} cm`).join(", ")
        : `${measured.length} medidas`,
    );
  }
  return parts.join(", ") || e.notes || "Só o peso";
}
