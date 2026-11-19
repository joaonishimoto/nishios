import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { canBePart, ingredientText, partsOf, STATUS_META, usedIn } from "./logic";
import { newId, useCulinaria } from "./store";
import type { Recipe } from "./types";

/** As partes de uma receita composta: outras receitas que precisam estar prontas para ela sair. */
export function PartsSection({ recipe }: { recipe: Recipe }) {
  const { recipes, update } = useCulinaria();
  const [adding, setAdding] = useState(false);
  const parts = partsOf(recipes, recipe);
  const setComponents = (components: Recipe["components"]) => update(recipe.id, { components });

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">
          Partes
          {parts.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{parts.length}</span>}
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Plus className="size-3.5" aria-hidden />
          Adicionar parte
        </button>
      </div>
      {parts.length === 0 ? (
        <p className="flex items-start gap-2 rounded-md border border-dashed border-border-strong px-3 py-3 text-sm text-muted-foreground">
          <Layers className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Esta receita é feita de outras? Adicione cada uma como parte, como a base de legumes e o molho do vinagrete. Cada
            parte tem as próprias tentativas e variações.
          </span>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {parts.map(({ component: c, recipe: part }) => {
            const meta = STATUS_META[part.status];
            const subParts = partsOf(recipes, part);
            return (
              <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{part.icon}</span>
                  <Link to={`/culinaria?r=${part.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {part.name || "Sem nome"}
                  </Link>
                  <Badge tone={meta.tone} className="shrink-0">
                    {meta.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-subtle-foreground"
                    aria-label={`Tirar ${part.name} das partes`}
                    onClick={() => setComponents(recipe.components.filter((x) => x.id !== c.id))}
                  >
                    <X />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label htmlFor={`parte-${c.id}`} className="shrink-0 text-sm text-muted-foreground">
                    Quanto vai
                  </label>
                  <Input
                    id={`parte-${c.id}`}
                    value={c.amount}
                    placeholder="Ex.: 1 receita, metade, 200 ml"
                    className="h-8 max-w-60"
                    onChange={(e) =>
                      setComponents(recipe.components.map((x) => (x.id === c.id ? { ...x, amount: e.target.value } : x)))
                    }
                  />
                </div>
                {(part.ingredients.length > 0 || subParts.length > 0) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[...subParts.map((s) => s.recipe.name), ...part.ingredients.map(ingredientText)].join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <PartForm host={recipe} open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function PartForm({ host, open, onOpenChange }: { host: Recipe; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar parte"
      description={`Uma receita que precisa estar pronta para fazer ${host.name || "esta"}.`}
    >
      {open && <PartContent host={host} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PartContent({ host, onClose }: { host: Recipe; onClose: () => void }) {
  const { recipes, create, update } = useCulinaria();
  const toast = useToast();
  const navigate = useNavigate();
  const options = recipes
    .filter((r) => canBePart(recipes, host, r))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [mode, setMode] = useState<"existing" | "new">(options.length > 0 ? "existing" : "new");
  const [pick, setPick] = useState(options[0]?.id ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [tried, setTried] = useState(false);
  const error = mode === "new" ? (name.trim() ? undefined : "Dê um nome para a parte.") : pick ? undefined : "Escolha uma receita.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (error) return;
    const part = mode === "new" ? create({ name: name.trim(), category: host.category, icon: host.icon }) : recipes.find((r) => r.id === pick)!;
    update(host.id, { components: [...host.components, { id: newId(), recipeId: part.id, amount: amount.trim() }] });
    onClose();
    toast({
      message: mode === "new" ? `${part.name} criada e adicionada como parte` : `${part.name} adicionada como parte`,
      action: mode === "new" ? { label: "Abrir", onClick: () => navigate(`/culinaria?r=${part.id}`) } : undefined,
    });
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <Segmented<"existing" | "new">
          label="De onde vem a parte"
          value={mode}
          onChange={setMode}
          options={[
            { value: "existing", label: "Receita que já tenho", count: options.length },
            { value: "new", label: "Nova receita" },
          ]}
        />
        {mode === "existing" ? (
          options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma outra receita pode entrar aqui ainda. Crie uma nova.</p>
          ) : (
            <Field label="Receita" error={tried ? error : undefined}>
              {(id) => (
                <Select id={id} value={pick} onChange={(e) => setPick(e.target.value)}>
                  {options.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.name || "Sem nome"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )
        ) : (
          <Field label="Nome da nova receita" error={tried ? error : undefined} hint="Ela ganha a página dela, com ingredientes, tentativas e variações.">
            {(id) => (
              <Input id={id} autoFocus value={name} placeholder="Ex.: Molho do vinagrete" onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
        )}
        <Field label="Quanto vai">
          {(id) => <Input id={id} value={amount} placeholder="Ex.: 1 receita, metade, 200 ml" onChange={(e) => setAmount(e.target.value)} />}
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Adicionar</Button>
      </DialogFooter>
    </form>
  );
}

/** Na receita que é parte de outras: onde ela entra. */
export function UsedIn({ recipe }: { recipe: Recipe }) {
  const { recipes } = useCulinaria();
  const hosts = usedIn(recipes, recipe.id);
  if (hosts.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Usada em</h2>
      <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        {hosts.map((h) => {
          const c = h.components.find((x) => x.recipeId === recipe.id);
          return (
            <li key={h.id} className="border-b border-border last:border-b-0">
              <Link to={`/culinaria?r=${h.id}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-hover">
                <span className="text-base leading-none">{h.icon}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{h.name || "Sem nome"}</span>
                {c?.amount && <span className="shrink-0 text-sm text-muted-foreground">{c.amount}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
