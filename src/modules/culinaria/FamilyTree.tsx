import { Link } from "react-router-dom";
import { Badge, Dot } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { childrenOf, STATUS_META } from "./logic";
import type { Recipe } from "./types";

/**
 * A árvore de variações de uma receita: cada nível entra um pouco, com uma linha ligando ao de cima.
 * `currentId` destaca a receita aberta; `dim` apaga as que não batem com o filtro.
 */
export function FamilyTree({
  recipes,
  root,
  currentId,
  dim,
  showRoot = true,
  compact = false,
}: {
  recipes: Recipe[];
  root: Recipe;
  currentId?: string;
  dim?: (r: Recipe) => boolean;
  /** Sem a raiz: só as variações, para quando a raiz já está no topo do cartão. */
  showRoot?: boolean;
  /** Para colunas estreitas: o nome quebra linha e a situação vira só um ponto colorido. */
  compact?: boolean;
}) {
  const kids = childrenOf(recipes, root.id);
  if (!showRoot) {
    return kids.length > 0 ? <Branch recipes={recipes} items={kids} currentId={currentId} dim={dim} compact={compact} seen={[root.id]} /> : null;
  }
  return <Branch recipes={recipes} items={[root]} currentId={currentId} dim={dim} compact={compact} seen={[]} top />;
}

function Branch({
  recipes,
  items,
  currentId,
  dim,
  seen,
  top,
  compact,
}: {
  recipes: Recipe[];
  items: Recipe[];
  currentId?: string;
  dim?: (r: Recipe) => boolean;
  /** Evita laço infinito se um dado vier com pai circular. */
  seen: string[];
  top?: boolean;
  compact: boolean;
}) {
  return (
    <ul className={cn("flex flex-col", !top && "ml-3.5 border-l border-border-strong pl-3")}>
      {items
        .filter((r) => !seen.includes(r.id))
        .map((r) => {
          const kids = childrenOf(recipes, r.id);
          return (
            <li
              key={r.id}
              className={cn(
                "relative",
                !top &&
                  "before:absolute before:top-[1.15rem] before:-left-3 before:w-2.5 before:border-t before:border-border-strong",
              )}
            >
              <Node recipe={r} current={r.id === currentId} dimmed={dim?.(r) ?? false} compact={compact} />
              {kids.length > 0 && (
                <Branch recipes={recipes} items={kids} currentId={currentId} dim={dim} compact={compact} seen={[...seen, r.id]} />
              )}
            </li>
          );
        })}
    </ul>
  );
}

function Node({ recipe, current, dimmed, compact }: { recipe: Recipe; current: boolean; dimmed: boolean; compact: boolean }) {
  const meta = STATUS_META[recipe.status];
  const count = recipe.attempts.length;
  const name = (
    <span
      className={cn(
        "min-w-0 flex-1",
        compact ? "leading-snug" : "truncate",
        recipe.status === "discarded" && "text-muted-foreground line-through decoration-border-strong",
      )}
    >
      {recipe.name || "Sem nome"}
    </span>
  );
  return (
    <Link
      to={`/culinaria?r=${recipe.id}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-md px-2 py-1 transition-colors duration-(--motion-fast)",
        current ? "bg-surface-selected font-medium" : "hover:bg-surface-hover",
        dimmed && "opacity-45",
      )}
    >
      <span className="text-base leading-none">{recipe.icon}</span>
      {name}
      {compact ? (
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground tabular-nums" title={meta.label}>
          {count > 0 && `${count}x`}
          <Dot tone={meta.tone} />
          <span className="sr-only">{meta.label}</span>
        </span>
      ) : (
        <Badge tone={meta.tone} className="shrink-0">
          {meta.label}
        </Badge>
      )}
    </Link>
  );
}
