import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ListOrdered, Pencil, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { lines, partsOf } from "./logic";
import { useCulinaria } from "./store";
import type { Ingredient, Recipe } from "./types";

/** "200 g", "3 colheres de sopa", "a gosto"; vazio quando não tem quantidade. */
function measure(i: Ingredient): string {
  return [i.amount, i.unit].filter(Boolean).join(" ");
}

/**
 * A receita para ler e cozinhar: ingredientes que você vai marcando (só nesta visita, não fica salvo)
 * e o modo de fazer em passos numerados.
 */
export function RecipeView({ recipe, onEdit }: { recipe: Recipe; onEdit: () => void }) {
  const { recipes } = useCulinaria();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const parts = partsOf(recipes, recipe);
  const steps = lines(recipe.steps);
  const groups = [
    ...parts.map((p) => ({ key: p.component.id, part: p.recipe, amount: p.component.amount, items: p.recipe.ingredients })),
    ...(recipe.ingredients.length > 0 || parts.length === 0
      ? [{ key: "proprios", part: undefined, amount: "", items: recipe.ingredients }]
      : []),
  ];
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="min-w-0 rounded-lg border border-border bg-surface">
        <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="font-semibold">
            Ingredientes
            {total > 0 && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{total}</span>}
          </h3>
          {checked.size > 0 ? (
            <button type="button" onClick={() => setChecked(new Set())} className="text-sm font-medium text-primary hover:underline">
              Desmarcar {checked.size}
            </button>
          ) : (
            total > 0 && <span className="text-sm text-muted-foreground">Toque para marcar</span>
          )}
        </div>
        {total === 0 && parts.length === 0 ? (
          <Empty icon={ShoppingBasket} text="Nenhum ingrediente ainda." onEdit={onEdit} />
        ) : (
          <div className="flex flex-col py-1.5">
            {groups.map((g) => (
              <div key={g.key} className="px-1.5 py-1">
                {(g.part || parts.length > 0) && (
                  <p className="flex items-center gap-2 px-2.5 pt-1.5 pb-1 text-sm font-medium text-muted-foreground">
                    {g.part ? (
                      <>
                        <span className="leading-none">{g.part.icon}</span>
                        <Link to={`/culinaria?r=${g.part.id}`} className="min-w-0 truncate text-foreground hover:underline">
                          {g.part.name || "Sem nome"}
                        </Link>
                        {g.amount && <span className="shrink-0 font-normal">· {g.amount}</span>}
                      </>
                    ) : (
                      "Outros ingredientes"
                    )}
                  </p>
                )}
                {g.items.length === 0 ? (
                  <p className="px-2.5 py-1 text-sm text-subtle-foreground">Sem ingredientes anotados nesta parte.</p>
                ) : (
                  <ul>
                    {g.items.map((i) => {
                      const on = checked.has(i.id);
                      const m = measure(i);
                      return (
                        <li key={i.id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(i.id)}
                            className="flex w-full items-start gap-3 rounded-md px-2.5 py-1.5 text-left hover:bg-surface-hover"
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--motion-fast)",
                                on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
                              )}
                            >
                              {on && <Check className="size-3" strokeWidth={3} />}
                            </span>
                            <span className={cn("min-w-0 flex-1", on && "text-muted-foreground line-through decoration-border-strong")}>
                              {i.unit === "a gosto" ? (
                                <>
                                  {i.name} <span className="text-muted-foreground">a gosto</span>
                                </>
                              ) : (
                                <>
                                  {m && <span className="font-medium tabular-nums">{m} </span>}
                                  {i.amount && i.unit.length > 2 ? "de " : ""}
                                  {i.name}
                                </>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-surface">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Modo de fazer</h3>
        {steps.length === 0 ? (
          <Empty icon={ListOrdered} text="Nenhum passo anotado ainda." onEdit={onEdit} />
        ) : (
          <ol className="flex flex-col gap-4 px-4 py-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, text, onEdit }: { icon: typeof Check; text: string; onEdit: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil />
        Editar receita
      </Button>
    </div>
  );
}
