import type { Tone } from "@/components/ui/Badge";
import type { Skill, SkillStatus, SkillType } from "./types";

export const STATUS_ORDER: SkillStatus[] = ["want", "learning", "learned"];

export const STATUS_META: Record<SkillStatus, { label: string; tone: Tone; empty: string }> = {
  want: { label: "Quero aprender", tone: "neutral", empty: "O que você ainda quer aprender entra aqui." },
  learning: { label: "Aprendendo", tone: "info", empty: "Arraste para cá o que você começou a estudar." },
  learned: { label: "Já sei", tone: "success", empty: "O que você já domina aparece aqui." },
};

export const TYPE_LABEL: Record<SkillType, string> = { hard: "Hard skill", soft: "Soft skill" };

export const LEVEL_LABELS = ["Ainda não comecei", "Noções", "Básico", "Intermediário", "Avançado", "Referência"];

export function resourceProgress(s: Skill): { done: number; total: number } {
  return { done: s.resources.filter((r) => r.done).length, total: s.resources.length };
}

/** Última vez que houve anotação no diário, para ordenar por atividade. */
export function lastActivity(s: Skill): string {
  return s.log.reduce((max, l) => (l.date > max ? l.date : max), s.createdAt.slice(0, 10));
}

export function matches(s: Skill, type: "all" | SkillType, query: string): boolean {
  if (type !== "all" && s.type !== type) return false;
  const q = query.trim().toLowerCase();
  return !q || `${s.name} ${s.category}`.toLowerCase().includes(q);
}
