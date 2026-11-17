import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Tone } from "@/components/ui/Badge";
import { shortDate, today } from "@/lib/dates";
import type { Asset, Wish, WishPriority } from "./types";

export const PRIORITY_ORDER: WishPriority[] = ["high", "medium", "low"];

export const PRIORITY_META: Record<WishPriority, { label: string; tone: Tone }> = {
  high: { label: "Alta", tone: "warning" },
  medium: { label: "Média", tone: "info" },
  low: { label: "Baixa", tone: "neutral" },
};

export function total(items: { value: number }[]): number {
  return items.reduce((sum, i) => sum + i.value, 0);
}

export interface Warranty {
  label: string;
  state: "active" | "ending" | "expired";
}

/** Situação da garantia: ativa, acabando (30 dias ou menos) ou vencida. */
export function warranty(asset: Asset, now: Date = today()): Warranty | null {
  if (!asset.warrantyUntil) return null;
  const days = differenceInCalendarDays(parseISO(asset.warrantyUntil), now);
  const date = shortDate(asset.warrantyUntil, now);
  if (days < 0) return { label: `Venceu em ${date}`, state: "expired" };
  if (days === 0) return { label: "Vence hoje", state: "ending" };
  if (days <= 30) return { label: `Vence em ${days} ${days === 1 ? "dia" : "dias"}`, state: "ending" };
  return { label: `Até ${date}`, state: "active" };
}

/** Mais caro primeiro. */
export function byValue(a: Asset, b: Asset): number {
  return b.value - a.value || a.name.localeCompare(b.name, "pt-BR");
}

/** Prioridade, depois a data pretendida mais próxima. */
export function byWishPriority(a: Wish, b: Wish): number {
  const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  if (p !== 0) return p;
  return (a.targetDate || "9999").localeCompare(b.targetDate || "9999") || a.price - b.price;
}
