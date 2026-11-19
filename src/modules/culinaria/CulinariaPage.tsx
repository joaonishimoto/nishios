import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChefHat, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, NoResults } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { LevelDots } from "@/components/ui/LevelDots";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { shortDate, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import { daysAgoLabel } from "@/modules/treinos/logic";
import { bestRating, childrenOf, family, lastCooked, matches, partsOf, roots, STATUS_META, STATUS_ORDER, usedIn } from "./logic";
import { RecipeDetail } from "./RecipeDetail";
import { StartForm, type StartState } from "./RecipeForms";
import { useCulinaria } from "./store";
import type { Recipe, RecipeStatus } from "./types";

type Filter = "all" | RecipeStatus;
const FILTER_LABEL: Record<RecipeStatus, string> = { testing: "Em teste", approved: "Aprovadas", discarded: "Não deram certo" };

export function CulinariaPage() {
  const { recipes } = useCulinaria();
  const [params] = useSearchParams();
  const open = recipes.find((r) => r.id === params.get("r"));
  if (open) return <RecipeDetail key={open.id} recipe={open} />;
  return <RecipeList />;
}

function RecipeList() {
  const { recipes } = useCulinaria();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [start, setStart] = useState<StartState>({ open: false });
  const now = today();

  const visible = (r: Recipe) => (filter === "all" || r.status === filter) && matches(r, query);
  const families = useMemo(() => {
    return roots(recipes)
      .map((root) => {
        const members = family(recipes, root.id);
        const activity = members.reduce((max, r) => {
          const d = lastCooked(r) || r.createdAt.slice(0, 10);
          return d > max ? d : max;
        }, "");
        return { root, members, activity };
      })
      .sort((a, b) => b.activity.localeCompare(a.activity));
  }, [recipes]);
  const shown = families.filter((f) => f.members.some(visible));

  const recent = useMemo(
    () =>
      recipes
        .flatMap((r) => r.attempts.map((a) => ({ recipe: r, attempt: a })))
        .sort((a, b) => b.attempt.date.localeCompare(a.attempt.date))
        .slice(0, 6),
    [recipes],
  );

  const testing = recipes.filter((r) => r.status === "testing").length;
  const approved = recipes.filter((r) => r.status === "approved").length;
  const last = recent[0];
  const filtering = filter !== "all" || query.trim() !== "";

  const newRecipe = (
    <Button onClick={() => setStart({ open: true })}>
      <Plus />
      Nova receita
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Culinária"
        description={
          recipes.length === 0
            ? "Aprenda cozinhando: cada receita guarda as tentativas, o que deu certo e as variações que nasceram dela."
            : `${testing === 0 ? "Nada em teste" : plural(testing, "receita em teste", "receitas em teste")}, ${plural(approved, "aprovada", "aprovadas")}.${
                last ? ` Última vez na cozinha: ${last.recipe.name}, ${daysAgoLabel(last.attempt.date, now)}.` : ""
              }`
        }
        action={recipes.length > 0 && newRecipe}
      />

      {recipes.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ChefHat}
          title="Nenhuma receita ainda"
          description="Comece pela receita base que você já faz. Cada vez que cozinhar, registre como fez e como ficou; quando quiser testar algo diferente, crie uma variação dela."
          action={newRecipe}
        />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Segmented<Filter>
              label="Situação da receita"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "Todas", count: recipes.length },
                ...STATUS_ORDER.map((s) => ({
                  value: s,
                  label: FILTER_LABEL[s],
                  count: recipes.filter((r) => r.status === s).length,
                })),
              ]}
            />
            <div className="relative ml-auto w-full sm:w-56">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
              />
              <Input
                type="search"
                aria-label="Buscar receita"
                placeholder="Buscar receitas"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            {shown.length === 0 && filtering ? (
              <NoResults
                query={query}
                onClear={() => {
                  setFilter("all");
                  setQuery("");
                }}
              />
            ) : (
              <RecipeTable
                families={shown.map((f) => f.root)}
                recipes={recipes}
                dim={filtering ? (r) => !visible(r) : undefined}
              />
            )}

            <aside className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">Na cozinha</h2>
              {recent.length === 0 ? (
                <EmptyState
                  size="sm"
                  frame="solid"
                  icon={ChefHat}
                  className="mt-3"
                  title="Nenhuma tentativa registrada"
                  description="Abra uma receita e registre a primeira vez que fizer."
                />
              ) : (
                <ol className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
                  {recent.map(({ recipe, attempt }) => (
                    <li key={attempt.id} className="border-b border-border last:border-b-0">
                      <Link to={`/culinaria?r=${recipe.id}`} className="flex gap-3 px-3 py-2.5 hover:bg-surface-hover">
                        <span className="text-lg leading-6">{recipe.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate font-medium">{recipe.name || "Sem nome"}</span>
                            <span className="shrink-0 text-sm text-muted-foreground">{shortDate(attempt.date)}</span>
                          </span>
                          {(attempt.result || attempt.how) && (
                            <span className="line-clamp-2 text-sm text-muted-foreground">{attempt.result || attempt.how}</span>
                          )}
                          {attempt.rating > 0 && <LevelDots value={attempt.rating} label="Nota" className="mt-1.5" />}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          </div>
        </>
      )}

      <StartForm
        state={start}
        onOpenChange={(o) => setStart((s) => ({ ...s, open: o }))}
        onCreated={(r) => navigate(`/culinaria?r=${r.id}`)}
      />
    </>
  );
}

interface Row {
  recipe: Recipe;
  depth: number;
  /** Para cada nível acima, se ainda vêm irmãos depois (a linha vertical continua). */
  rails: boolean[];
  last: boolean;
}

/** Cada família vira um bloco: a receita base e, embaixo, as variações em árvore. */
function flatten(recipes: Recipe[], root: Recipe): Row[] {
  const rows: Row[] = [];
  const walk = (r: Recipe, depth: number, rails: boolean[], last: boolean, seen: string[]) => {
    rows.push({ recipe: r, depth, rails, last });
    const kids = childrenOf(recipes, r.id).filter((k) => !seen.includes(k.id));
    kids.forEach((k, i) => walk(k, depth + 1, depth === 0 ? [] : [...rails, !last], i === kids.length - 1, [...seen, r.id]));
  };
  walk(root, 0, [], true, []);
  return rows;
}

/** Recuo de cada nível e o centro do ícone, em rem, para desenhar as linhas da árvore. */
const pad = (depth: number) => 1 + depth * 2;
const center = (depth: number) => pad(depth) + (depth === 0 ? 1.25 : 1);

const COLS = "md:grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_5.5rem]";

function RecipeTable({ families, recipes, dim }: { families: Recipe[]; recipes: Recipe[]; dim?: (r: Recipe) => boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      <div className={cn("hidden border-b border-border bg-surface-muted/60 px-4 py-2 text-sm font-medium text-muted-foreground md:grid md:gap-4", COLS)}>
        <span>Receita</span>
        <span>Situação</span>
        <span>Na cozinha</span>
        <span className="text-right">Melhor nota</span>
      </div>
      <ul>
        {families.map((root) => (
          <li key={root.id} className="border-b border-border last:border-b-0">
            <ul>
              {flatten(recipes, root).map((row) => (
                <RecipeRow key={row.recipe.id} row={row} recipes={recipes} dimmed={dim?.(row.recipe) ?? false} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeRow({ row, recipes, dimmed }: { row: Row; recipes: Recipe[]; dimmed: boolean }) {
  const { recipe: r, depth } = row;
  const meta = STATUS_META[r.status];
  const count = r.attempts.length;
  const last = lastCooked(r);
  const best = bestRating(r);
  const parts = partsOf(recipes, r);
  const hosts = usedIn(recipes, r.id);
  const discarded = r.status === "discarded";
  const sub =
    depth > 0 && r.change
      ? r.change
      : parts.length > 0
        ? `Feita com ${parts.map((p) => p.recipe.name).join(" + ")}`
        : hosts.length > 0
          ? `Parte de ${hosts.map((h) => h.name).join(", ")}`
          : r.category;
  return (
    <li>
      <Link
        to={`/culinaria?r=${r.id}`}
        className={cn(
          "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 pr-4 transition-colors duration-(--motion-fast) hover:bg-surface-hover",
          COLS,
          dimmed && "opacity-45",
        )}
        style={{ paddingLeft: `${pad(depth)}rem` }}
      >
        {depth > 0 && (
          <>
            {/* Ligação com a receita de cima, como numa árvore; a linha segue enquanto houver irmãs embaixo. */}
            <span aria-hidden className="absolute top-0 w-px bg-border-strong" style={{ left: `${center(depth - 1)}rem`, height: row.last ? "1.625rem" : "100%" }} />
            <span aria-hidden className="absolute top-[1.625rem] h-px bg-border-strong" style={{ left: `${center(depth - 1)}rem`, width: `${pad(depth) - center(depth - 1) - 0.25}rem` }} />
            {row.rails.map((on, i) =>
              on ? <span key={i} aria-hidden className="absolute inset-y-0 w-px bg-border-strong" style={{ left: `${center(i)}rem` }} /> : null,
            )}
          </>
        )}
        <span className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-surface-muted leading-none",
              depth === 0 ? "size-10 text-xl" : "size-8 text-base",
            )}
          >
            {r.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("line-clamp-2 md:line-clamp-1 md:block", depth === 0 && "font-medium", discarded && "text-muted-foreground line-through decoration-border-strong")}>
              {r.name || "Sem nome"}
            </span>
            <span className="line-clamp-2 text-sm text-muted-foreground md:line-clamp-1">{sub}</span>
          </span>
        </span>
        <span className="row-span-2 self-center justify-self-end md:row-span-1 md:justify-self-start">
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </span>
        <span className={cn("col-start-1 truncate text-sm text-muted-foreground md:col-start-auto md:pl-0", depth === 0 ? "pl-[3.25rem]" : "pl-[2.75rem]")}>
          {count === 0 ? "Nunca feita" : `${plural(count, "vez", "vezes")}, ${daysAgoLabel(last)}`}
          {best > 0 && <LevelDots value={best} label="Melhor nota" className="ml-2 md:hidden" />}
        </span>
        <span className="hidden justify-self-end md:inline-flex">
          {best > 0 ? <LevelDots value={best} label="Melhor nota" /> : <span className="text-sm text-subtle-foreground">—</span>}
        </span>
      </Link>
    </li>
  );
}
