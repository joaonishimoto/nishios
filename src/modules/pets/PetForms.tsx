import { useState, type FormEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { newId, usePets } from "./store";
import {
  CARE_INTERVALS,
  HEALTH_KINDS,
  PET_ICONS,
  SPECIES,
  type Care,
  type HealthKind,
  type HealthRecord,
  type Pet,
  type PetDraft,
} from "./types";

interface FormProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, edita; senão, cria. */
  value?: T;
}

function Footer({
  editing,
  submitLabel,
  onClose,
  onDelete,
}: {
  editing: boolean;
  submitLabel: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <DialogFooter>
      {editing && (
        <Button
          variant="ghost"
          className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
          onClick={onDelete}
        >
          <Trash2 />
          Excluir
        </Button>
      )}
      <Button variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit">{editing ? "Salvar alterações" : submitLabel}</Button>
    </DialogFooter>
  );
}

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

/* ---------- Pet ---------- */

export function PetForm({ open, onOpenChange, value, onRemoved }: FormProps<Pet> & { onRemoved?: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={value ? "Editar pet" : "Novo pet"}>
      <PetContent key={value?.id ?? "novo"} pet={value} onClose={() => onOpenChange(false)} onRemoved={onRemoved} />
    </Dialog>
  );
}

function PetContent({ pet, onClose, onRemoved }: { pet?: Pet; onClose: () => void; onRemoved?: () => void }) {
  const { createPet, updatePet, removePet, restorePet } = usePets();
  const toast = useToast();
  const [draft, setDraft] = useState<PetDraft>({
    name: pet?.name ?? "",
    icon: pet?.icon ?? "🐶",
    species: pet?.species ?? SPECIES[0],
    breed: pet?.breed ?? "",
    birthday: pet?.birthday ?? "",
    notes: pet?.notes ?? "",
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof PetDraft>(key: K, v: PetDraft[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const nameError = draft.name.trim() ? undefined : "Diga o nome do pet.";

  function submit() {
    setTried(true);
    if (nameError) return;
    const clean = { ...draft, name: draft.name.trim(), breed: draft.breed.trim(), notes: draft.notes.trim() };
    if (pet) {
      updatePet(pet.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createPet(clean);
      toast({ message: `${clean.name} foi adicionado` });
    }
    onClose();
  }

  return (
    <Form onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={PET_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input id={id} value={draft.name} autoFocus={!pet} onChange={(e) => set("name", e.target.value)} />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Espécie">
            {(id) => (
              <Select id={id} value={draft.species} onChange={(e) => set("species", e.target.value)}>
                {SPECIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Raça">
            {(id) => <Input id={id} value={draft.breed} onChange={(e) => set("breed", e.target.value)} />}
          </Field>
          <Field label="Nascimento">
            {(id) => (
              <Input
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.birthday}
                onChange={(e) => set("birthday", e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Alergias, ração, veterinário, comportamento..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <Footer
        editing={!!pet}
        submitLabel="Adicionar pet"
        onClose={onClose}
        onDelete={() => {
          if (!pet) return;
          removePet(pet.id);
          onClose();
          onRemoved?.();
          toast({
            message: `${pet.name} foi excluído`,
            action: { label: "Desfazer", onClick: () => restorePet(pet) },
          });
        }}
      />
    </Form>
  );
}

/* ---------- Vacina ou cuidado ---------- */

export function CareForm({ open, onOpenChange, value, pet }: FormProps<Care> & { pet: Pet }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={value ? "Editar vacina ou cuidado" : "Nova vacina ou cuidado"}
      description={value ? undefined : "Vacina, vermífugo, antipulgas ou qualquer cuidado que se repete."}
    >
      <CareContent key={value?.id ?? "novo"} care={value} pet={pet} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function CareContent({ care, pet, onClose }: { care?: Care; pet: Pet; onClose: () => void }) {
  const { saveItem, removeItem } = usePets();
  const toast = useToast();
  const [draft, setDraft] = useState<Care>(
    care ?? { id: newId(), name: "", lastDate: "", intervalMonths: 12, notes: "" },
  );
  const [tried, setTried] = useState(false);
  const nameError = draft.name.trim() ? undefined : "Dê um nome à vacina ou ao cuidado.";
  const intervals = CARE_INTERVALS.some((i) => i.value === draft.intervalMonths)
    ? CARE_INTERVALS
    : [...CARE_INTERVALS, { value: draft.intervalMonths, label: `A cada ${draft.intervalMonths} meses` }];

  function submit() {
    setTried(true);
    if (nameError) return;
    saveItem(pet.id, "cares", { ...draft, name: draft.name.trim(), notes: draft.notes.trim() });
    toast({ message: care ? "Alterações salvas" : `${draft.name.trim()} foi adicionado` });
    onClose();
  }

  return (
    <Form onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Nome" error={tried ? nameError : undefined}>
          {(id) => (
            <Input
              id={id}
              value={draft.name}
              autoFocus={!care}
              placeholder="Ex.: Vacina antirrábica"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repete">
            {(id) => (
              <Select
                id={id}
                value={draft.intervalMonths}
                onChange={(e) => setDraft((d) => ({ ...d, intervalMonths: Number(e.target.value) }))}
              >
                {intervals.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Última vez" hint="Deixe em branco se ainda não fez.">
            {(id) => (
              <Input
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.lastDate}
                onChange={(e) => setDraft((d) => ({ ...d, lastDate: e.target.value }))}
              />
            )}
          </Field>
        </div>
        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Marca, dose, clínica..."
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          )}
        </Field>
      </DialogBody>
      <Footer
        editing={!!care}
        submitLabel="Adicionar"
        onClose={onClose}
        onDelete={() => {
          if (!care) return;
          removeItem(pet.id, "cares", care.id);
          onClose();
          toast({
            message: `${care.name} foi excluído`,
            action: { label: "Desfazer", onClick: () => saveItem(pet.id, "cares", care) },
          });
        }}
      />
    </Form>
  );
}

/* ---------- Registro de saúde ---------- */

export function HealthForm({ open, onOpenChange, value, pet }: FormProps<HealthRecord> & { pet: Pet }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={value ? "Editar registro de saúde" : "Novo registro de saúde"}
      description={value ? undefined : "Consulta, problema de saúde, exame ou cirurgia."}
    >
      <HealthContent key={value?.id ?? "novo"} record={value} pet={pet} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function HealthContent({ record, pet, onClose }: { record?: HealthRecord; pet: Pet; onClose: () => void }) {
  const { saveItem, removeItem } = usePets();
  const toast = useToast();
  const [draft, setDraft] = useState<HealthRecord>(
    record ?? { id: newId(), date: toISO(today()), kind: "Consulta", title: "", notes: "", ongoing: false },
  );
  const [tried, setTried] = useState(false);
  const titleError = draft.title.trim() ? undefined : "Descreva em poucas palavras o que foi.";
  const isProblem = draft.kind === "Problema de saúde";

  function submit() {
    setTried(true);
    if (titleError || !draft.date) return;
    saveItem(pet.id, "health", {
      ...draft,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      ongoing: isProblem && draft.ongoing,
    });
    toast({ message: record ? "Alterações salvas" : "Registro adicionado" });
    onClose();
  }

  return (
    <Form onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            {(id) => (
              <Select
                id={id}
                value={draft.kind}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    kind: e.target.value as HealthKind,
                    // Um problema novo começa "em tratamento".
                    ongoing: e.target.value === "Problema de saúde" ? (record ? d.ongoing : true) : false,
                  }))
                }
              >
                {HEALTH_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Data">
            {(id) => (
              <Input
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.date}
                required
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              />
            )}
          </Field>
        </div>
        <Field label="O que foi" error={tried ? titleError : undefined}>
          {(id) => (
            <Input
              id={id}
              value={draft.title}
              autoFocus={!record}
              placeholder={isProblem ? "Ex.: Otite no ouvido direito" : "Ex.: Consulta de rotina"}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          )}
        </Field>
        {isProblem && (
          <Field label="Situação">
            {(id) => (
              <Select
                id={id}
                className="sm:w-1/2"
                value={draft.ongoing ? "sim" : "nao"}
                onChange={(e) => setDraft((d) => ({ ...d, ongoing: e.target.value === "sim" }))}
              >
                <option value="sim">Em tratamento</option>
                <option value="nao">Resolvido</option>
              </Select>
            )}
          </Field>
        )}
        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Veterinário, remédios, dose, retorno..."
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          )}
        </Field>
      </DialogBody>
      <Footer
        editing={!!record}
        submitLabel="Adicionar registro"
        onClose={onClose}
        onDelete={() => {
          if (!record) return;
          removeItem(pet.id, "health", record.id);
          onClose();
          toast({
            message: "Registro excluído",
            action: { label: "Desfazer", onClick: () => saveItem(pet.id, "health", record) },
          });
        }}
      />
    </Form>
  );
}
