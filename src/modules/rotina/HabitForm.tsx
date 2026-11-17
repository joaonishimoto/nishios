import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "./logic";
import { useRoutine } from "./store";
import { ROUTINE_ICONS, type Habit, type HabitDraft } from "./types";

export function HabitForm({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={habit ? "Editar hábito" : "Novo hábito"}
      description={habit ? undefined : "Algo que você quer fazer com frequência e marcar todo dia."}
    >
      <Content key={habit?.id ?? "novo"} habit={habit} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const { createHabit, updateHabit, removeHabit, restoreHabit } = useRoutine();
  const toast = useToast();
  const [draft, setDraft] = useState<HabitDraft>({
    name: habit?.name ?? "",
    icon: habit?.icon ?? "🎯",
    weekdays: habit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
  });
  const [tried, setTried] = useState(false);

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao hábito.";
  const daysError = draft.weekdays.length > 0 ? undefined : "Escolha pelo menos um dia.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || daysError) return;
    const clean = { ...draft, name: draft.name.trim() };
    if (habit) {
      updateHabit(habit.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createHabit(clean);
      toast({ message: `${clean.name} foi criado` });
    }
    onClose();
  }

  const toggleDay = (d: number) =>
    setDraft((s) => ({
      ...s,
      weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d],
    }));

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker
            icons={ROUTINE_ICONS}
            value={draft.icon}
            onChange={(icon) => setDraft((s) => ({ ...s, icon }))}
          />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!habit}
                placeholder="Ex.: Ler 20 minutos"
                onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
              />
            )}
          </Field>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Em quais dias</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => {
              const on = draft.weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_LONG[d]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "h-9 min-w-11 rounded-md border px-2 text-sm font-medium transition-colors duration-(--motion-fast)",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-input-background text-muted-foreground hover:border-input-hover",
                  )}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              );
            })}
          </div>
          {tried && daysError && <p className="text-sm text-danger-strong">{daysError}</p>}
        </fieldset>
      </DialogBody>
      <DialogFooter>
        {habit && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeHabit(habit.id);
              onClose();
              toast({
                message: `${habit.name} foi excluído`,
                action: { label: "Desfazer", onClick: () => restoreHabit(habit) },
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
        <Button type="submit">{habit ? "Salvar alterações" : "Criar hábito"}</Button>
      </DialogFooter>
    </form>
  );
}
