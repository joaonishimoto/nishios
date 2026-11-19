import { useId, useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { normalizeName, resolveByName } from "./strength";
import { useTreinos } from "./store";
import { EQUIPMENT_LABELS, type ExerciseDef, type Plan, type PlanItem } from "./types";

interface DraftItem extends Omit<PlanItem, "exerciseId"> {
  key: string;
  name: string;
  exerciseId?: string;
}

const blank = (): DraftItem => ({ key: crypto.randomUUID(), name: "", sets: 3, repsMin: 8, repsMax: 12, weight: 0, rest: 90, notes: "" });

export function PlanForm({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={plan ? "Editar ficha" : "Nova ficha"} className="max-w-2xl">
      <Content key={plan?.id ?? "nova"} plan={plan} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ plan, onClose }: { plan?: Plan; onClose: () => void }) {
  const { exercises: catalog, plans, addExercises, createPlan, updatePlan, removePlan, restorePlan } = useTreinos();
  const toast = useToast();
  const listId = useId();
  const byName = useMemo(() => new Map(catalog.map((d) => [normalizeName(d.name), d])), [catalog]);
  const [name, setName] = useState(plan?.name ?? `Treino ${String.fromCharCode(65 + plans.length)}`);
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(() =>
    plan
      ? plan.items.map((i) => ({ ...i, key: crypto.randomUUID(), name: catalog.find((d) => d.id === i.exerciseId)?.name ?? "" }))
      : [blank()],
  );
  const [error, setError] = useState("");

  const patch = (key: string, next: Partial<DraftItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...next } : i)));
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Dê um nome para a ficha.");
      return;
    }
    const created: ExerciseDef[] = [];
    const clean: PlanItem[] = [];
    for (const i of items) {
      if (!i.name.trim()) continue;
      const known = i.exerciseId ? catalog.find((d) => d.id === i.exerciseId) : undefined;
      let def = known && normalizeName(known.name) === normalizeName(i.name) ? known : undefined;
      if (!def) {
        const r = resolveByName(i.name, [...catalog, ...created]);
        if (!r) continue;
        if (r.created) created.push(r.def);
        def = r.def;
      }
      const repsMin = Math.max(1, Math.floor(i.repsMin || 1));
      clean.push({
        exerciseId: def.id,
        sets: Math.max(1, Math.floor(i.sets || 1)),
        repsMin,
        repsMax: Math.max(repsMin, Math.floor(i.repsMax || repsMin)),
        weight: Math.max(0, i.weight || 0),
        rest: Math.max(0, Math.floor(i.rest || 0)),
        notes: i.notes.trim(),
      });
    }
    addExercises(created);
    const draft = { name: name.trim(), notes: notes.trim(), items: clean };
    if (plan) {
      updatePlan(plan.id, draft);
      toast({ message: "Ficha salva" });
    } else {
      createPlan(draft);
      toast({ message: `${draft.name} criada` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Nome" error={error}>
          {(id) => (
            <Input id={id} value={name} placeholder="Ex.: Treino A · Peito e tríceps" onChange={(e) => (setName(e.target.value), setError(""))} />
          )}
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1.5 text-sm font-medium">Exercícios</legend>
          <datalist id={listId}>
            {catalog.map((d) => (
              <option key={d.id} value={d.name}>
                {EQUIPMENT_LABELS[d.equipment]}
              </option>
            ))}
          </datalist>
          {items.map((item, index) => {
            const def = item.exerciseId ? catalog.find((d) => d.id === item.exerciseId) : byName.get(normalizeName(item.name));
            const label = item.name || `exercício ${index + 1}`;
            return (
              <div key={item.key} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 text-sm text-subtle-foreground tabular-nums">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label={`Exercício ${index + 1}`}
                      list={listId}
                      value={item.name}
                      placeholder="Ex.: Supino reto"
                      onChange={(e) => patch(item.key, { name: e.target.value, exerciseId: byName.get(normalizeName(e.target.value))?.id })}
                    />
                    <div className="mt-1.5 min-h-5">
                      {def ? <Badge>{EQUIPMENT_LABELS[def.equipment]}</Badge> : item.name.trim() && <Badge tone="info">Novo no catálogo</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Subir ${label}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Descer ${label}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Remover ${label}`} onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}>
                      <X />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 ml-7 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  <NumberCell label="Séries" value={item.sets} onChange={(v) => patch(item.key, { sets: v })} aria={`Séries de ${label}`} />
                  <NumberCell label="Reps mín." value={item.repsMin} onChange={(v) => patch(item.key, { repsMin: v })} aria={`Repetições mínimas de ${label}`} />
                  <NumberCell label="Reps máx." value={item.repsMax} onChange={(v) => patch(item.key, { repsMax: v })} aria={`Repetições máximas de ${label}`} />
                  <NumberCell label={def?.equipment === "halteres" ? "Kg (cada)" : "Carga (kg)"} value={item.weight} decimal onChange={(v) => patch(item.key, { weight: v })} aria={`Carga alvo de ${label}, em kg`} placeholder={def?.equipment === "livre" ? "Corpo" : "kg"} />
                  <NumberCell label="Descanso (s)" value={item.rest} onChange={(v) => patch(item.key, { rest: v })} aria={`Descanso de ${label}, em segundos`} placeholder="90" />
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" className="h-8 self-start" onClick={() => setItems((list) => [...list, blank()])}>
            <Plus />
            Adicionar exercício
          </Button>
        </fieldset>

        <Field label="Anotações">
          {(id) => (
            <Textarea id={id} value={notes} placeholder="Aquecimento, técnica, como progredir a carga..." onChange={(e) => setNotes(e.target.value)} />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {plan && (
          <>
            <Button
              variant="ghost"
              className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
              onClick={() => {
                const index = plans.findIndex((p) => p.id === plan.id);
                removePlan(plan.id);
                onClose();
                toast({ message: "Ficha excluída. Os treinos feitos com ela continuam no histórico.", action: { label: "Desfazer", onClick: () => restorePlan(plan, index) } });
              }}
            >
              <Trash2 />
              Excluir
            </Button>
            <DuplicateButton plan={plan} onDone={onClose} />
          </>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{plan ? "Salvar ficha" : "Criar ficha"}</Button>
      </DialogFooter>
    </form>
  );
}

function DuplicateButton({ plan, onDone }: { plan: Plan; onDone: () => void }) {
  const { createPlan } = useTreinos();
  const toast = useToast();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        createPlan({ name: `${plan.name} (cópia)`, notes: plan.notes, items: plan.items.map((i) => ({ ...i })) });
        toast({ message: "Ficha duplicada" });
        onDone();
      }}
    >
      <Copy />
      Duplicar
    </Button>
  );
}

function NumberCell({
  label,
  value,
  onChange,
  aria,
  decimal,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  aria: string;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span aria-hidden className="text-xs text-muted-foreground">
        {label}
      </span>
      <Input
        aria-label={aria}
        type="number"
        min={0}
        step={decimal ? "any" : 1}
        inputMode={decimal ? "decimal" : "numeric"}
        className="h-8 px-2"
        placeholder={placeholder ?? "0"}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
