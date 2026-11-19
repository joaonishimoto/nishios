import type { Tone } from "@/components/ui/Badge";
import { UNITS, type Ingredient, type Recipe, type RecipeStatus } from "./types";

export const STATUS_META: Record<RecipeStatus, { label: string; tone: Tone }> = {
  testing: { label: "Em teste", tone: "warning" },
  approved: { label: "Aprovada", tone: "success" },
  discarded: { label: "Não deu certo", tone: "neutral" },
};
export const STATUS_ORDER: RecipeStatus[] = ["testing", "approved", "discarded"];

export const RATING_LABELS = ["Sem nota", "Não deu certo", "Fraca", "Ok", "Boa", "Perfeita"];

/** Data da última vez que fez; vazio se nunca fez. As tentativas ficam da mais nova para a mais antiga. */
export const lastCooked = (r: Recipe) => r.attempts.reduce((max, a) => (a.date > max ? a.date : max), "");

export function bestRating(r: Recipe): number {
  return r.attempts.reduce((max, a) => Math.max(max, a.rating), 0);
}

/** O que fazer na próxima vez, da tentativa mais recente que deixou anotado. */
export function nextTip(r: Recipe): string {
  const latest = [...r.attempts].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest?.next.trim() ?? "";
}

export function childrenOf(recipes: Recipe[], id: string): Recipe[] {
  return recipes
    .filter((r) => r.parentId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Receita base da família (sobe pelos pais; um pai que sumiu conta como base). */
export function rootOf(recipes: Recipe[], recipe: Recipe): Recipe {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  let cur = recipe;
  const seen = new Set<string>();
  while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = byId.get(cur.parentId)!;
  }
  return cur;
}

/** Bases: sem pai, ou com um pai que não existe mais. */
export function roots(recipes: Recipe[]): Recipe[] {
  const ids = new Set(recipes.map((r) => r.id));
  return recipes.filter((r) => !r.parentId || !ids.has(r.parentId));
}

/** A própria receita e todas as que nasceram dela, em qualquer nível. */
export function family(recipes: Recipe[], id: string): Recipe[] {
  const out: Recipe[] = [];
  const walk = (rid: string) => {
    const r = recipes.find((x) => x.id === rid);
    if (!r || out.includes(r)) return;
    out.push(r);
    for (const c of childrenOf(recipes, rid)) walk(c.id);
  };
  walk(id);
  return out;
}

/** O caminho da base até a receita: Vinagrete padrão › Com banana › Com pimenta. */
export function lineage(recipes: Recipe[], recipe: Recipe): Recipe[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const path = [recipe];
  let cur = recipe;
  while (cur.parentId && byId.has(cur.parentId) && path.length < 50) {
    cur = byId.get(cur.parentId)!;
    if (path.includes(cur)) break;
    path.unshift(cur);
  }
  return path;
}

export const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function matches(r: Recipe, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold(
    `${r.name} ${r.category} ${r.change} ${r.ingredients.map(ingredientText).join(" ")} ${r.lessons} ${r.attempts.map((a) => `${a.how} ${a.result} ${a.next}`).join(" ")}`,
  );
  return q.split(/\s+/).every((t) => hay.includes(t));
}

/** "200 g de cogumelos", "2 tomates", "Sal a gosto". */
export function ingredientText(i: Ingredient): string {
  if (i.unit === "a gosto") return `${i.name} a gosto`.trim();
  const unit = i.unit && i.amount ? `${i.unit}${i.unit.length > 2 ? " de" : ""}` : i.unit;
  return [i.amount, unit, i.name].filter(Boolean).join(" ");
}

// Unidades mais longas primeiro, para "colher de sopa" ganhar de "colher".
const UNIT_WORDS = [...UNITS, "xícaras", "colheres de sopa", "colheres de chá", "colher", "colheres", "unidades", "dentes", "fatias", "latas", "pacotes", "pitadas"]
  .filter((u) => u !== "a gosto")
  .sort((a, b) => b.length - a.length);

/** Lê uma linha de texto ("2 colheres de azeite") como quantidade, unidade e ingrediente. */
export function parseIngredient(line: string): Omit<Ingredient, "id"> {
  let rest = line.trim();
  let unit = "";
  if (/\sa gosto$/i.test(rest)) {
    return { amount: "", unit: "a gosto", name: rest.replace(/\s+a gosto$/i, "").trim() };
  }
  const num = rest.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?(?:\s+\d\/\d)?)\s*/);
  const amount = num ? num[1].replace(/\s+/g, " ") : "";
  if (num) rest = rest.slice(num[0].length);
  if (amount) {
    const lower = rest.toLowerCase();
    const found = UNIT_WORDS.find((u) => lower === u || lower.startsWith(`${u} `));
    if (found) {
      unit = found;
      rest = rest.slice(found.length).trim().replace(/^de\s+/i, "");
    }
  }
  return { amount, unit, name: rest.trim() };
}
