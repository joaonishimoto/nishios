import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { usePeople } from "./store";
import { CONTACT_PRESETS, GROUPS, type Person, type PersonDraft } from "./types";

export function PersonForm({
  open,
  onOpenChange,
  person,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={person ? "Editar pessoa" : "Nova pessoa"}
      description={
        person ? undefined : "Alguém com quem você quer manter contato: família, amigos, trabalho."
      }
    >
      <Content key={person?.id ?? "nova"} person={person} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ person, onClose }: { person?: Person; onClose: () => void }) {
  const { create, update } = usePeople();
  const toast = useToast();
  const [draft, setDraft] = useState<PersonDraft>({
    name: person?.name ?? "",
    group: person?.group ?? GROUPS[1],
    context: person?.context ?? "",
    city: person?.city ?? "",
    phone: person?.phone ?? "",
    birthday: person?.birthday ?? "",
    contactEvery: person?.contactEvery ?? 30,
    notes: person?.notes ?? "",
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const groups = GROUPS.includes(draft.group) ? GROUPS : [...GROUPS, draft.group];
  const presets = CONTACT_PRESETS.some((p) => p.value === draft.contactEvery)
    ? CONTACT_PRESETS
    : [...CONTACT_PRESETS, { value: draft.contactEvery, label: `A cada ${draft.contactEvery} dias` }];

  const nameError = draft.name.trim() ? undefined : "Diga o nome da pessoa.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      context: draft.context.trim(),
      city: draft.city.trim(),
      phone: draft.phone.trim(),
      notes: draft.notes.trim(),
    };
    if (person) {
      update(person.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      create(clean);
      toast({ message: `${clean.name} foi adicionado` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Nome" error={tried ? nameError : undefined}>
          {(id) => (
            <Input
              id={id}
              value={draft.name}
              autoFocus={!person}
              placeholder="Nome e sobrenome"
              onChange={(e) => set("name", e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grupo">
            {(id) => (
              <Select id={id} value={draft.group} onChange={(e) => set("group", e.target.value)}>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Manter contato">
            {(id) => (
              <Select
                id={id}
                value={draft.contactEvery}
                onChange={(e) => set("contactEvery", Number(e.target.value))}
              >
                {presets.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Quem é para você">
          {(id) => (
            <Input
              id={id}
              value={draft.context}
              placeholder="Ex.: Amigo da faculdade, cliente, primo"
              onChange={(e) => set("context", e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Aniversário">
            {(id) => (
              <Input
                placeholder="Sem data"
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.birthday}
                onChange={(e) => set("birthday", e.target.value)}
              />
            )}
          </Field>
          <Field label="Cidade">
            {(id) => <Input placeholder="Ex.: São Paulo" id={id} value={draft.city} onChange={(e) => set("city", e.target.value)} />}
          </Field>
          <Field label="Telefone">
            {(id) => (
              <Input
                placeholder="(11) 91234-5678"
                id={id}
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Do que gosta, ideias de presente, assuntos para retomar..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{person ? "Salvar alterações" : "Adicionar pessoa"}</Button>
      </DialogFooter>
    </form>
  );
}
