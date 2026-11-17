import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { useRoutine } from "./store";
import { ROUTINE_ICONS, type Goal, type GoalDraft } from "./types";

export function GoalForm({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Editar meta" : "Nova meta"}
      description={goal ? undefined : "Um número aonde você quer chegar, com ou sem prazo."}
    >
      <Content key={goal?.id ?? "nova"} goal={goal} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { createGoal, updateGoal, removeGoal, restoreGoal } = useRoutine();
  const toast = useToast();
  const [draft, setDraft] = useState<GoalDraft>({
    name: goal?.name ?? "",
    icon: goal?.icon ?? "🎯",
    unit: goal?.unit ?? "",
    target: goal?.target ?? 0,
    current: goal?.current ?? 0,
    deadline: goal?.deadline ?? "",
    notes: goal?.notes ?? "",
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameError = draft.name.trim() ? undefined : "Dê um nome à meta.";
  const targetError = draft.target > 0 ? undefined : "O alvo precisa ser maior que zero.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || targetError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      unit: draft.unit.trim(),
      notes: draft.notes.trim(),
      current: Math.max(0, draft.current),
    };
    if (goal) {
      updateGoal(goal.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createGoal(clean);
      toast({ message: `${clean.name} foi criada` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={ROUTINE_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!goal}
                placeholder="Ex.: Ler 24 livros no ano"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Onde está hoje">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={draft.current || ""}
                placeholder="0"
                onChange={(e) => set("current", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Alvo" error={tried ? targetError : undefined}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={draft.target || ""}
                onChange={(e) => set("target", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Unidade">
            {(id) => (
              <Input
                id={id}
                value={draft.unit}
                placeholder="livros, km, reais"
                onChange={(e) => set("unit", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Prazo" hint="Deixe em branco se não tiver.">
          {(id) => (
            <Input
              id={id}
              type="date"
              className="sm:w-1/2"
              value={draft.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          )}
        </Field>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Por que essa meta importa, como vai chegar lá..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {goal && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeGoal(goal.id);
              onClose();
              toast({
                message: `${goal.name} foi excluída`,
                action: { label: "Desfazer", onClick: () => restoreGoal(goal) },
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
        <Button type="submit">{goal ? "Salvar alterações" : "Criar meta"}</Button>
      </DialogFooter>
    </form>
  );
}
