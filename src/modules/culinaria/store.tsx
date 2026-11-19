import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { parseIngredient } from "./logic";
import type { Attempt, Ingredient, Recipe } from "./types";

const KEY = "nishios:culinaria:receitas:v1";

/** Começa vazia. As receitas de exemplo da primeira versão (ids "seed-...") saem de quem já as tinha. */
const withoutExamples = (list: Recipe[]): Recipe[] =>
  list
    .filter((r) => !r.id.startsWith("seed-"))
    .map((r) => (r.parentId.startsWith("seed-") ? { ...r, parentId: "" } : r))
    .map(withIngredientList);

/** A primeira versão guardava os ingredientes como texto, um por linha: cada linha vira um item da lista. */
function withIngredientList(r: Recipe): Recipe {
  const old = r.ingredients as unknown;
  if (Array.isArray(old)) return r;
  const text = typeof old === "string" ? old : "";
  return {
    ...r,
    ingredients: text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ id: newId(), ...parseIngredient(l) })),
  };
}

const copyIngredients = (list: Ingredient[]): Ingredient[] => list.map((i) => ({ ...i, id: newId() }));

interface Store {
  recipes: Recipe[];
  create: (patch?: Partial<Omit<Recipe, "id" | "createdAt">>) => Recipe;
  /** Nova receita ligada a esta, já com os ingredientes e o modo de fazer dela para ajustar. */
  createVariation: (parent: Recipe, fields: Partial<Omit<Recipe, "id" | "createdAt">>) => Recipe;
  update: (id: string, patch: Partial<Omit<Recipe, "id">>) => void;
  /** Exclui; as variações dela passam a descender da receita de cima. Devolve quem mudou de lugar. */
  remove: (id: string) => string[];
  restore: (recipe: Recipe, children: string[]) => void;
  saveAttempt: (recipeId: string, attempt: Attempt) => void;
  removeAttempt: (recipeId: string, attemptId: string) => void;
}

const Ctx = createContext<Store | null>(null);

export const newId = () => crypto.randomUUID();

export function CulinariaProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = usePersistentState<Recipe[]>(KEY, () => [], withoutExamples);

  const store = useMemo<Store>(() => {
    const blank = (patch: Partial<Omit<Recipe, "id" | "createdAt">> = {}): Recipe => ({
      id: newId(),
      name: "",
      icon: "🍳",
      category: "Outros",
      parentId: "",
      change: "",
      status: "testing",
      ingredients: [],
      steps: "",
      lessons: "",
      attempts: [],
      ...patch,
      createdAt: new Date().toISOString(),
    });
    return {
      recipes,
      create(patch) {
        const recipe = blank(patch);
        setRecipes((list) => [...list, recipe]);
        return recipe;
      },
      createVariation(parent, fields) {
        const recipe = blank({
          icon: parent.icon,
          category: parent.category,
          ingredients: copyIngredients(parent.ingredients),
          steps: parent.steps,
          ...fields,
          parentId: parent.id,
        });
        setRecipes((list) => [...list, recipe]);
        return recipe;
      },
      update(id, patch) {
        setRecipes((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      remove(id) {
        const gone = recipes.find((r) => r.id === id);
        const moved = recipes.filter((r) => r.parentId === id).map((r) => r.id);
        setRecipes((list) =>
          list
            .filter((r) => r.id !== id)
            .map((r) => (r.parentId === id ? { ...r, parentId: gone?.parentId ?? "" } : r)),
        );
        return moved;
      },
      restore(recipe, childIds) {
        setRecipes((list) => {
          const back = list.map((r) => (childIds.includes(r.id) ? { ...r, parentId: recipe.id } : r));
          return back.some((r) => r.id === recipe.id) ? back : [...back, recipe];
        });
      },
      saveAttempt(recipeId, attempt) {
        setRecipes((list) =>
          list.map((r) => {
            if (r.id !== recipeId) return r;
            const others = r.attempts.filter((a) => a.id !== attempt.id);
            return { ...r, attempts: [...others, attempt].sort((a, b) => b.date.localeCompare(a.date)) };
          }),
        );
      },
      removeAttempt(recipeId, attemptId) {
        setRecipes((list) =>
          list.map((r) => (r.id === recipeId ? { ...r, attempts: r.attempts.filter((a) => a.id !== attemptId) } : r)),
        );
      },
    };
  }, [recipes, setRecipes]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCulinaria(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCulinaria precisa estar dentro de CulinariaProvider");
  return store;
}
