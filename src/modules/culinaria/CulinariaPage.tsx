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
import { FamilyTree } from "./FamilyTree";
import { bestRating, family, partsOf, usedIn, lastCooked, matches, nextTip, roots, STATUS_META, STATUS_ORDER } from "./logic";
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
              <ul className="grid content-start gap-3 xl:grid-cols-2">
                {shown.map(({ root, members }) => (
                  <FamilyCard
                    key={root.id}
                    root={root}
                    variations={members.length - 1}
                    recipes={recipes}
                    dim={filtering ? (r) => !visible(r) : undefined}
                  />
                ))}
              </ul>
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

function FamilyCard({
  root,
  variations,
  recipes,
  dim,
}: {
  root: Recipe;
  variations: number;
  recipes: Recipe[];
  dim?: (r: Recipe) => boolean;
}) {
  const meta = STATUS_META[root.status];
  const count = root.attempts.length;
  const last = lastCooked(root);
  const best = bestRating(root);
  const tip = nextTip(root);
  const parts = partsOf(recipes, root);
  const hosts = usedIn(recipes, root.id);
  return (
    <li className="flex min-w-0 flex-col rounded-lg border border-border bg-surface transition-colors duration-(--motion-fast) hover:border-border-strong">
      <Link
        to={`/culinaria?r=${root.id}`}
        className={cn("flex flex-col gap-2 rounded-t-lg p-4 hover:bg-surface-hover", dim?.(root) && "opacity-45", variations === 0 && "rounded-b-lg")}
      >
        <span className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xl leading-none">{root.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{root.name || "Sem nome"}</span>
            <span className="block truncate text-sm text-muted-foreground">{root.category}</span>
          </span>
          <Badge tone={meta.tone} className="shrink-0">
            {meta.label}
          </Badge>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{count === 0 ? "Nunca feita" : `Feita ${plural(count, "vez", "vezes")}`}</span>
          {last && <span>Última {daysAgoLabel(last)}</span>}
          {best > 0 && (
            <span className="inline-flex items-center gap-1.5">
              Melhor nota <LevelDots value={best} label="Melhor nota" />
            </span>
          )}
        </span>
        {parts.length > 0 && (
          <span className="truncate text-sm">
            <span className="font-medium">Feita com:</span> {parts.map((p) => p.recipe.name).join(" + ")}
          </span>
        )}
        {hosts.length > 0 && (
          <span className="truncate text-sm text-muted-foreground">Parte de {hosts.map((h) => h.name).join(", ")}</span>
        )}
        {tip && (
          <span className="line-clamp-2 text-sm">
            <span className="font-medium">Próxima vez:</span> {tip}
          </span>
        )}
      </Link>
      {variations > 0 && (
        <div className="border-t border-border px-2 pt-2 pb-2">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            {plural(variations, "variação", "variações")}
          </p>
          <div className="-ml-1.5">
            <FamilyTree recipes={recipes} root={root} showRoot={false} dim={dim} />
          </div>
        </div>
      )}
    </li>
  );
}
