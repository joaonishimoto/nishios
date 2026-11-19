import { useState, type FormEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { LevelDots } from "@/components/ui/LevelDots";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { RATING_LABELS } from "./logic";
import { newId, useCulinaria } from "./store";
import { CATEGORIES, RECIPE_ICONS, type Attempt, type Recipe } from "./types";

function Form({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

/* ---------- Nova receita ou variação ---------- */

export interface StartState {
  open: boolean;
  /** Com pai, cria uma variação dele. */
  parent?: Recipe;
  /** Texto inicial de "O que muda" (vindo de uma tentativa). */
  change?: string;
}

/** Começa uma receita só com o essencial; o resto se preenche na página dela. */
export function StartForm({
  state,
  onOpenChange,
  onCreated,
}: {
  state: StartState;
  onOpenChange: (open: boolean) => void;
  onCreated: (recipe: Recipe) => void;
}) {
  const p = state.parent;
  return (
    <Dialog
      open={state.open}
      onOpenChange={onOpenChange}
      title={p ? "Nova variação" : "Nova receita"}
      description={p ? `Nasce de ${p.name || "Sem nome"}, com os ingredientes e o modo de fazer dela para você ajustar.` : undefined}
    >
      <StartContent key={`${p?.id ?? "base"}-${state.change ?? ""}`} state={state} onClose={() => onOpenChange(false)} onCreated={onCreated} />
    </Dialog>
  );
}

function StartContent({ state, onClose, onCreated }: { state: StartState; onClose: () => void; onCreated: (r: Recipe) => void }) {
  const { create, createVariation } = useCulinaria();
  const parent = state.parent;
  const [name, setName] = useState("");
  const [change, setChange] = useState(state.change ?? "");
  const [icon, setIcon] = useState(parent?.icon ?? "🍳");
  const [category, setCategory] = useState("Outros");
  const [tried, setTried] = useState(false);
  const nameError = name.trim() ? undefined : "Dê um nome para a receita.";

  function submit() {
    setTried(true);
    if (nameError) return;
    const recipe = parent
      ? createVariation(parent, { name: name.trim(), change: change.trim(), icon })
      : create({ name: name.trim(), icon, category });
    onCreated(recipe);
    onClose();
  }

  return (
    <Form onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={RECIPE_ICONS} value={icon} onChange={setIcon} />
          <Field label="Nome" className="min-w-0 flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={name}
                autoFocus
                placeholder={parent ? `Ex.: ${parent.name.replace(/\s+(padrão|tradicional|clássic[oa])$/i, "")} com banana` : "Ex.: Vinagrete padrão"}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
        </div>
        {parent ? (
          <Field label="O que muda" hint="Dá para deixar em branco e anotar depois.">
            {(id) => (
              <Textarea
                id={id}
                value={change}
                placeholder="Troca o pimentão por banana, menos vinagre..."
                onChange={(e) => setChange(e.target.value)}
              />
            )}
          </Field>
        ) : (
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{parent ? "Criar variação" : "Criar receita"}</Button>
      </DialogFooter>
    </Form>
  );
}

/* ---------- Tentativa ---------- */

export interface AttemptState {
  open: boolean;
  value?: Attempt;
}

export function AttemptForm({
  recipe,
  state,
  onOpenChange,
}: {
  recipe: Recipe;
  state: AttemptState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={state.open}
      onOpenChange={onOpenChange}
      title={state.value ? "Editar tentativa" : "Registrar tentativa"}
      description={recipe.name || undefined}
    >
      <AttemptContent key={state.value?.id ?? "nova"} recipe={recipe} attempt={state.value} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function AttemptContent({ recipe, attempt, onClose }: { recipe: Recipe; attempt?: Attempt; onClose: () => void }) {
  const { saveAttempt, removeAttempt } = useCulinaria();
  const toast = useToast();
  const last = recipe.attempts[0];
  const [draft, setDraft] = useState<Attempt>(
    attempt ?? { id: newId(), date: toISO(today()), rating: 0, how: "", result: "", next: "" },
  );
  const set = (patch: Partial<Attempt>) => setDraft((d) => ({ ...d, ...patch }));

  function submit() {
    if (!draft.date) return;
    saveAttempt(recipe.id, { ...draft, how: draft.how.trim(), result: draft.result.trim(), next: draft.next.trim() });
    toast({ message: attempt ? "Alterações salvas" : "Tentativa registrada" });
    onClose();
  }

  return (
    <Form onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        {!attempt && last?.next && (
          <p className="rounded-md bg-surface-muted px-3 py-2 text-sm">
            <span className="font-medium">Da última vez você anotou:</span> {last.next}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quando">
            {(id) => (
              <Input
                id={id}
                type="date"
                placeholder="Escolher a data"
                max={toISO(today())}
                required
                value={draft.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nota</span>
            <div className="flex h-9 items-center gap-3">
              <LevelDots value={draft.rating} onChange={(rating) => set({ rating })} label="Nota" className="-ml-1.5" />
              <span className="text-sm text-muted-foreground">{RATING_LABELS[draft.rating]}</span>
            </div>
          </div>
        </div>
        <Field label="Como fiz">
          {(id) => (
            <Textarea
              id={id}
              value={draft.how}
              autoFocus={!attempt}
              placeholder="O que fez diferente desta vez: quantidades, tempo, ingrediente trocado..."
              onChange={(e) => set({ how: e.target.value })}
            />
          )}
        </Field>
        <Field label="Como ficou">
          {(id) => (
            <Textarea
              id={id}
              value={draft.result}
              placeholder="Sabor, textura, o que deu certo e o que não deu..."
              onChange={(e) => set({ result: e.target.value })}
            />
          )}
        </Field>
        <Field label="Para a próxima vez">
          {(id) => (
            <Input
              id={id}
              value={draft.next}
              placeholder="Ex.: Salgar só na hora de servir"
              onChange={(e) => set({ next: e.target.value })}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {attempt && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeAttempt(recipe.id, attempt.id);
              onClose();
              toast({
                message: "Tentativa excluída",
                action: { label: "Desfazer", onClick: () => saveAttempt(recipe.id, attempt) },
              });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{attempt ? "Salvar alterações" : "Registrar"}</Button>
      </DialogFooter>
    </Form>
  );
}
