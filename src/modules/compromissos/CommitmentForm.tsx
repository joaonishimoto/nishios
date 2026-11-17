import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { toISO, today, unitLabel } from "./logic";
import { useCommitments } from "./store";
import { CATEGORIES, ICONS, type Commitment, type CommitmentDraft, type IntervalUnit } from "./types";

const UNITS: IntervalUnit[] = ["days", "weeks", "months", "years"];

function initial(c?: Commitment): CommitmentDraft {
  return {
    name: c?.name ?? "",
    icon: c?.icon ?? "📌",
    category: c?.category ?? CATEGORIES[0],
    intervalValue: c?.intervalValue ?? 30,
    intervalUnit: c?.intervalUnit ?? "days",
    warnDays: c?.warnDays ?? 7,
    notes: c?.notes ?? "",
    lastDone: c?.history[0] ?? "",
  };
}

export function CommitmentForm({
  open,
  onOpenChange,
  commitment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, edita; senão, cria. */
  commitment?: Commitment;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={commitment ? "Editar compromisso" : "Novo compromisso"}
      description={
        commitment
          ? undefined
          : "Algo que se repete de tempos em tempos. O NishiOS calcula a próxima data e avisa quando estiver chegando."
      }
    >
      {/* A chave recria o formulário a cada abertura, já com os valores certos. */}
      <FormContent key={commitment?.id ?? "novo"} commitment={commitment} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function FormContent({ commitment, onClose }: { commitment?: Commitment; onClose: () => void }) {
  const { create, update } = useCommitments();
  const toast = useToast();
  const [draft, setDraft] = useState<CommitmentDraft>(() => initial(commitment));
  const [triedSubmit, setTriedSubmit] = useState(false);
  const set = <K extends keyof CommitmentDraft>(key: K, value: CommitmentDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao compromisso.";
  const intervalError =
    draft.intervalValue >= 1 ? undefined : "O período precisa ser de pelo menos 1.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);
    if (nameError || intervalError) return;
    const clean = { ...draft, name: draft.name.trim(), notes: draft.notes.trim() };
    if (commitment) {
      update(commitment.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      create(clean);
      toast({ message: `${clean.name} foi criado` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Ícone</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Ícone atual: ${draft.icon}. Trocar ícone`}
                  className="flex size-9 items-center justify-center rounded-md border border-input bg-input-background text-lg hover:border-input-hover hover:bg-surface-hover"
                >
                  {draft.icon}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="grid w-auto grid-cols-8 gap-0.5 p-2">
                {ICONS.map((icon) => (
                  <PopoverClose asChild key={icon}>
                    <button
                      type="button"
                      aria-label={`Usar ${icon}`}
                      onClick={() => set("icon", icon)}
                      className="flex size-8 items-center justify-center rounded-sm text-lg hover:bg-surface-hover aria-pressed:bg-surface-selected"
                      aria-pressed={icon === draft.icon}
                    >
                      {icon}
                    </button>
                  </PopoverClose>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <Field label="Nome" className="flex-1" error={triedSubmit ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!commitment}
                placeholder="Ex.: Cortar o cabelo"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repetir a cada" error={triedSubmit ? intervalError : undefined}>
            {(id) => (
              <div className="flex gap-2">
                <Input
                  id={id}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="w-20"
                  value={draft.intervalValue || ""}
                  onChange={(e) => set("intervalValue", Math.floor(Number(e.target.value)))}
                />
                <Select
                  aria-label="Unidade do período"
                  value={draft.intervalUnit}
                  onChange={(e) => set("intervalUnit", e.target.value as IntervalUnit)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {unitLabel(u, draft.intervalValue)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Field>
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Última vez que fez" hint="Deixe em branco se ainda não fez.">
            {(id) => (
              <Input
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.lastDone}
                onChange={(e) => set("lastDone", e.target.value)}
              />
            )}
          </Field>
          <Field label="Avisar com antecedência de" hint="Em dias antes do vencimento.">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.warnDays}
                onChange={(e) => set("warnDays", Math.max(0, Math.floor(Number(e.target.value))))}
              />
            )}
          </Field>
        </div>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Onde faz, com quem, o que lembrar de pedir..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{commitment ? "Salvar alterações" : "Criar compromisso"}</Button>
      </DialogFooter>
    </form>
  );
}
