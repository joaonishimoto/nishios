import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChefHat, ChevronLeft, GitBranchPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { LevelDots } from "@/components/ui/LevelDots";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import { daysAgoLabel } from "@/modules/treinos/logic";
import { FamilyTree } from "./FamilyTree";
import { IngredientList } from "./IngredientList";
import { PartsSection, UsedIn } from "./Parts";
import { bestRating, family, lastCooked, lineage, nextTip, RATING_LABELS, rootOf, STATUS_META, STATUS_ORDER } from "./logic";
import { AttemptForm, StartForm, type AttemptState, type StartState } from "./RecipeForms";
import { useCulinaria } from "./store";
import { CATEGORIES, RECIPE_ICONS, type Recipe, type RecipeStatus } from "./types";

/** A página de uma receita: o que você faz, cada vez que fez e a família de variações. Cada campo salva na hora. */
export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { recipes, update, remove, restore } = useCulinaria();
  const navigate = useNavigate();
  const toast = useToast();
  const [attemptForm, setAttemptForm] = useState<AttemptState>({ open: false });
  const [start, setStart] = useState<StartState>({ open: false });
  const now = today();

  const path = lineage(recipes, recipe);
  const parent = path.length > 1 ? path[path.length - 2] : undefined;
  const root = rootOf(recipes, recipe);
  const inFamily = family(recipes, root.id).length;
  // Não dá para virar variação de si mesma nem de uma variação sua.
  const own = new Set(family(recipes, recipe.id).map((r) => r.id));
  const parentOptions = recipes
    .filter((r) => !own.has(r.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const categories = CATEGORIES.includes(recipe.category) ? CATEGORIES : [...CATEGORIES, recipe.category];
  const last = lastCooked(recipe);
  const best = bestRating(recipe);
  const tip = nextTip(recipe);
  const set = (patch: Partial<Omit<Recipe, "id">>) => update(recipe.id, patch);

  function removeRecipe() {
    const moved = remove(recipe.id);
    navigate(parent ? `/culinaria?r=${parent.id}` : "/culinaria", { replace: true });
    toast({ message: "Receita excluída", action: { label: "Desfazer", onClick: () => restore(recipe, moved) } });
  }

  return (
    <>
      <nav aria-label="Caminho" className="-ml-2 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
        <Link to="/culinaria" className="inline-flex h-7 items-center gap-1 rounded-md px-2 font-medium hover:bg-surface-hover hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          Culinária
        </Link>
        {path.slice(0, -1).map((r) => (
          <span key={r.id} className="flex min-w-0 items-center gap-1">
            <span aria-hidden>/</span>
            <Link to={`/culinaria?r=${r.id}`} className="max-w-[14rem] truncate rounded-md px-1.5 py-0.5 hover:bg-surface-hover hover:text-foreground">
              {r.name || "Sem nome"}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="flex min-w-0 items-start gap-3 md:flex-1">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-2xl leading-none">{recipe.icon}</span>
          <div className="-ml-2 flex min-w-0 flex-1 flex-col">
            <textarea
              aria-label="Nome da receita"
              value={recipe.name}
              rows={1}
              maxLength={120}
              placeholder="Ex.: Vinagrete padrão"
              onChange={(e) => set({ name: e.target.value.replace(/\n/g, "") })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="field-sizing-content min-h-10 w-full min-w-0 resize-none rounded-md bg-transparent px-2 py-0.5 text-2xl font-semibold tracking-tight transition-colors duration-(--motion-fast) placeholder:text-subtle-foreground hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
            />
            <p className="px-2 text-muted-foreground">
              {parent ? <>Variação de {parent.name || "Sem nome"}</> : inFamily > 1 ? `Receita base, ${plural(inFamily - 1, "variação", "variações")}` : "Receita base"}
              {" · "}
              {recipe.attempts.length === 0 ? "nunca feita" : `feita ${plural(recipe.attempts.length, "vez", "vezes")}, a última ${daysAgoLabel(last, now)}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
          <Button variant="outline" onClick={() => setStart({ open: true, parent: recipe })}>
            <GitBranchPlus />
            Criar variação
          </Button>
          <Button onClick={() => setAttemptForm({ open: true })}>
            <Plus />
            Registrar tentativa
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {tip && (
            <p className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
              <span className="font-medium text-warning-strong">Para a próxima vez:</span> {tip}
            </p>
          )}

          <section>
            <h2 className="text-xl font-semibold tracking-tight">A receita</h2>
            {parent && (
              <Field label={`O que muda em relação a ${parent.name || "receita de origem"}`} className="mt-4">
                {(id) => (
                  <Textarea
                    id={id}
                    value={recipe.change}
                    placeholder="Troca o pimentão por banana, menos vinagre..."
                    className="min-h-16"
                    onChange={(e) => set({ change: e.target.value })}
                  />
                )}
              </Field>
            )}
            <div className="mt-4 flex flex-col gap-6">
              <PartsSection recipe={recipe} />
              <div>
                <h3 className="mb-1.5 text-sm font-medium">
                  {recipe.components.length > 0 ? "Outros ingredientes" : "Ingredientes"}{recipe.ingredients.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{recipe.ingredients.length}</span>}
                </h3>
                <IngredientList items={recipe.ingredients} onChange={(ingredients) => set({ ingredients })} />
              </div>
              <Field label="Modo de fazer" hint="Um passo por linha.">
                {(id) => (
                  <Textarea
                    id={id}
                    value={recipe.steps}
                    placeholder={"Picar tudo do mesmo tamanho\nMisturar e temperar..."}
                    className="min-h-44 leading-relaxed"
                    onChange={(e) => set({ steps: e.target.value })}
                  />
                )}
              </Field>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {recipe.attempts.length === 0 ? "Tentativas" : `Tentativas: ${recipe.attempts.length}`}
              </h2>
              {best > 0 && (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  Melhor nota <LevelDots value={best} label="Melhor nota" />
                </span>
              )}
            </div>
            {recipe.attempts.length === 0 ? (
              <EmptyState
                size="sm"
                frame="dashed"
                icon={ChefHat}
                className="mt-3"
                title="Nenhuma tentativa ainda"
                description="Cada vez que fizer, anote como fez, como ficou e o que mudar. É assim que a receita vira sua."
                action={
                  <Button variant="outline" onClick={() => setAttemptForm({ open: true })}>
                    <Plus />
                    Registrar tentativa
                  </Button>
                }
              />
            ) : (
              <ol className="mt-4 flex flex-col">
                {recipe.attempts.map((a, i) => (
                  <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* A linha do tempo liga uma tentativa à anterior. */}
                    {i < recipe.attempts.length - 1 && (
                      <span aria-hidden className="absolute top-7 bottom-0 left-[0.6875rem] w-px bg-border-strong" />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "relative mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface text-xs font-semibold tabular-nums",
                        i === 0 ? "border-primary text-primary" : "border-border-strong text-muted-foreground",
                      )}
                    >
                      {recipe.attempts.length - i}
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-medium">{formatDate(a.date)}</p>
                        {a.rating > 0 && (
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <LevelDots value={a.rating} label="Nota" />
                            {RATING_LABELS[a.rating]}
                          </span>
                        )}
                        <div className="ml-auto flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            title="Criar uma variação com o que mudou nesta tentativa"
                            onClick={() => setStart({ open: true, parent: recipe, change: a.how })}
                          >
                            <GitBranchPlus />
                            <span className="hidden sm:inline">Virar variação</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar tentativa de ${shortDate(a.date)}`} onClick={() => setAttemptForm({ open: true, value: a })}>
                            <Pencil />
                          </Button>
                        </div>
                      </div>
                      <dl className="mt-2 grid gap-2">
                        {a.how && (
                          <div>
                            <dt className="text-sm text-muted-foreground">Como fiz</dt>
                            <dd className="whitespace-pre-line">{a.how}</dd>
                          </div>
                        )}
                        {a.result && (
                          <div>
                            <dt className="text-sm text-muted-foreground">Como ficou</dt>
                            <dd className="whitespace-pre-line">{a.result}</dd>
                          </div>
                        )}
                        {a.next && (
                          <div>
                            <dt className="text-sm text-muted-foreground">Para a próxima</dt>
                            <dd>{a.next}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8">
          <UsedIn recipe={recipe} />
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Família</h2>
              <button
                type="button"
                onClick={() => setStart({ open: true, parent: recipe })}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="size-3.5" aria-hidden />
                Variação
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-surface p-2">
              <FamilyTree recipes={recipes} root={root} currentId={recipe.id} compact />
              <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-2 pt-2 pb-1 mt-2 text-xs text-muted-foreground">
                {STATUS_ORDER.map((st) => (
                  <span key={st} className="inline-flex items-center gap-1.5">
                    <Dot tone={STATUS_META[st].tone} />
                    {STATUS_META[st].label}
                  </span>
                ))}
              </p>
              {inFamily === 1 && (
                <p className="px-2 pt-1 pb-1.5 text-sm text-muted-foreground">
                  Quer testar algo diferente? Crie uma variação: ela nasce com estes ingredientes e fica ligada aqui.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Detalhes</h2>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <IconPicker icons={RECIPE_ICONS} value={recipe.icon} onChange={(icon) => set({ icon })} />
              <Field label="Situação">
                {(id) => (
                  <Select id={id} value={recipe.status} onChange={(e) => set({ status: e.target.value as RecipeStatus })}>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Categoria">
              {(id) => (
                <Select id={id} value={recipe.category} onChange={(e) => set({ category: e.target.value })}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Variação de">
              {(id) => (
                <Select id={id} value={parent?.id ?? ""} onChange={(e) => set({ parentId: e.target.value })}>
                  <option value="">Nenhuma, é uma receita base</option>
                  {parentOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || "Sem nome"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="O que já aprendi">
              {(id) => (
                <Textarea
                  id={id}
                  value={recipe.lessons}
                  placeholder="Truques, pontos de atenção, o que nunca mais fazer..."
                  className="min-h-28"
                  onChange={(e) => set({ lessons: e.target.value })}
                />
              )}
            </Field>
          </section>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <p className="min-w-0 text-sm text-muted-foreground">Criada em {formatDate(recipe.createdAt.slice(0, 10))}</p>
            <Button variant="ghost" size="sm" className="ml-auto h-8 shrink-0 hover:bg-danger-soft hover:text-danger-strong" onClick={removeRecipe}>
              <Trash2 />
              Excluir
            </Button>
          </div>
        </aside>
      </div>

      <AttemptForm recipe={recipe} state={attemptForm} onOpenChange={(o) => setAttemptForm((s) => ({ ...s, open: o }))} />
      <StartForm
        state={start}
        onOpenChange={(o) => setStart((s) => ({ ...s, open: o }))}
        onCreated={(r) => navigate(`/culinaria?r=${r.id}`)}
      />
    </>
  );
}
