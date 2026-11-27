import { useState, type FormEvent } from "react";
import { Merge, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { LIBRARY_BY_ID } from "./library";
import { normalizeName } from "./strength";
import { useTreinos } from "./store";
import {
  EQUIPMENT_HINTS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Equipment,
  type ExerciseDef,
  type ExerciseDefDraft,
  type MuscleGroup,
} from "./types";

export function ExerciseForm({
  open,
  onOpenChange,
  exercise,
  onCreated,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: ExerciseDef;
  onCreated?: (def: ExerciseDef) => void;
  onRemoved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={exercise ? "Editar exercício" : "Novo exercício"}>
      <Content key={exercise?.id ?? "novo"} exercise={exercise} onCreated={onCreated} onRemoved={onRemoved} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({
  exercise,
  onCreated,
  onRemoved,
  onClose,
}: {
  exercise?: ExerciseDef;
  onCreated?: (def: ExerciseDef) => void;
  onRemoved?: () => void;
  onClose: () => void;
}) {
  const { exercises, sessions, planned, plans, createExercise, updateExercise, removeExercise, restoreExercise, mergeExercise } = useTreinos();
  const toast = useToast();
  const [draft, setDraft] = useState<ExerciseDefDraft>({
    name: exercise?.name ?? "",
    equipment: exercise?.equipment ?? "maquina",
    muscle: exercise?.muscle ?? "peito",
    notes: exercise?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [mergeInto, setMergeInto] = useState("");

  const uses = exercise
    ? [...sessions, ...planned].filter((s) => s.exercises.some((e) => e.exerciseId === exercise.id)).length
    : 0;
  const inPlans = exercise ? plans.filter((p) => p.items.some((i) => i.exerciseId === exercise.id)).length : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return setError("Dê um nome para o exercício.");
    const clash = exercises.find((d) => d.id !== exercise?.id && normalizeName(d.name) === normalizeName(name));
    if (clash) return setError(`Já existe "${clash.name}" no catálogo. Para unir os dois, use "Juntar com".`);
    const clean = { ...draft, name, notes: draft.notes.trim() };
    if (exercise) {
      updateExercise(exercise.id, clean);
      toast({ message: "Exercício salvo" });
    } else {
      const def = createExercise(clean);
      toast({ message: `${def.name} no catálogo` });
      onCreated?.(def);
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Nome" error={error}>
          {(id) => (
            <Input id={id} value={draft.name} placeholder="Ex.: Supino reto" onChange={(e) => (setDraft((d) => ({ ...d, name: e.target.value })), setError(""))} />
          )}
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Equipamento</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => {
              const active = draft.equipment === eq;
              return (
                <button
                  key={eq}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDraft((d) => ({ ...d, equipment: eq }))}
                  className={cn(
                    "flex flex-col rounded-md border px-2.5 py-2 text-left transition-colors duration-(--motion-fast)",
                    active ? "border-primary bg-surface-selected" : "border-border hover:border-border-strong hover:bg-surface-hover",
                  )}
                >
                  <span className="text-sm font-medium">{EQUIPMENT_LABELS[eq]}</span>
                  <span className="text-xs text-muted-foreground">{EQUIPMENT_HINTS[eq]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Grupo muscular">
          {(id) => (
            <Select id={id} value={draft.muscle} onChange={(e) => setDraft((d) => ({ ...d, muscle: e.target.value as MuscleGroup }))}>
              {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {exercise?.secondary && exercise.secondary.length > 0 && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Também trabalha: {exercise.secondary.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(", ")}.
          </p>
        )}

        <Field label={exercise && LIBRARY_BY_ID.has(exercise.id) ? "Como fazer e anotações" : "Anotações"}>
          {(id) => (
            <Textarea id={id} value={draft.notes} placeholder="Ajuste do banco, pegada, cuidados..." onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          )}
        </Field>

        {exercise && exercises.length > 1 && (
          <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
            <p className="text-sm font-medium">Juntar com outro exercício</p>
            <p className="text-sm text-muted-foreground">
              Para nomes repetidos ("Supino" e "Supino reto"): os treinos e as fichas deste passam para o escolhido, e este sai do catálogo.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Select aria-label="Exercício que fica" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className="min-w-48 flex-1">
                <option value="">Escolher o que fica</option>
                {exercises
                  .filter((d) => d.id !== exercise.id)
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </Select>
              <Button
                variant="outline"
                disabled={!mergeInto}
                onClick={() => {
                  const into = exercises.find((d) => d.id === mergeInto);
                  mergeExercise(exercise.id, mergeInto);
                  toast({ message: `${exercise.name} juntado com ${into?.name ?? "o exercício escolhido"}` });
                  onRemoved?.();
                  onClose();
                }}
              >
                <Merge />
                Juntar
              </Button>
            </div>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        {exercise && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            disabled={uses + inPlans > 0}
            title={
              uses + inPlans > 0
                ? `Está em ${[uses ? plural(uses, "treino", "treinos") : "", inPlans ? plural(inPlans, "ficha", "fichas") : ""].filter(Boolean).join(" e ")}. Use "Juntar com" para tirá-lo do catálogo.`
                : undefined
            }
            onClick={() => {
              removeExercise(exercise.id);
              onRemoved?.();
              onClose();
              toast({ message: "Exercício excluído", action: { label: "Desfazer", onClick: () => restoreExercise(exercise) } });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{exercise ? "Salvar" : "Adicionar ao catálogo"}</Button>
      </DialogFooter>
    </form>
  );
}
