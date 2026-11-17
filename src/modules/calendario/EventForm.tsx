import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { usePeople } from "@/modules/pessoas/store";
import { REPEAT_LABELS } from "./events";
import { useCalendar } from "./store";
import type { CalEvent, EventDraft, Repeat } from "./types";

export function EventForm({
  open,
  onOpenChange,
  event,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, edita; senão, cria no dia `defaultDate`. */
  event?: CalEvent;
  defaultDate: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={event ? "Editar evento" : "Novo evento"}>
      <Content key={event?.id ?? `novo-${defaultDate}`} event={event} defaultDate={defaultDate} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ event, defaultDate, onClose }: { event?: CalEvent; defaultDate: string; onClose: () => void }) {
  const { create, update, remove, restore } = useCalendar();
  const toast = useToast();
  const people = [...usePeople().people].sort((a, b) => a.name.localeCompare(b.name));
  const [draft, setDraft] = useState<EventDraft>(
    event ?? {
      title: "",
      date: defaultDate,
      endDate: "",
      allDay: false,
      start: "09:00",
      end: "10:00",
      location: "",
      notes: "",
      repeat: "none",
      interval: 1,
      until: "",
    },
  );
  const [tried, setTried] = useState(false);
  const set = <K extends keyof EventDraft>(key: K, v: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: v }));

  const titleError = draft.title.trim() ? undefined : "Dê um nome ao evento.";
  const endError = !draft.allDay && draft.end && draft.end < draft.start ? "O fim precisa ser depois do início." : undefined;
  const untilError = draft.endDate && draft.endDate < draft.date ? "O último dia precisa ser depois do primeiro." : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (titleError || endError || untilError || !draft.date) return;
    const clean: EventDraft = {
      ...draft,
      title: draft.title.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      endDate: draft.allDay && draft.endDate > draft.date ? draft.endDate : "",
      start: draft.allDay ? "" : draft.start,
      end: draft.allDay ? "" : draft.end,
      until: draft.repeat === "none" ? "" : draft.until,
    };
    if (event) {
      update(event.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      create(clean);
      toast({ message: `${clean.title} foi adicionado ao calendário` });
    }
    onClose();
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}>
      <DialogBody className="flex flex-col gap-4">
        <Field label="Título" error={tried ? titleError : undefined}>
          {(id) => (
            <Input
              id={id}
              value={draft.title}
              autoFocus={!event}
              placeholder="Ex.: Reunião com cliente"
              onChange={(e) => set("title", e.target.value)}
            />
          )}
        </Field>

        <label className="flex w-fit items-center gap-2.5">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => set("allDay", e.target.checked)}
            className="size-4 accent-(--primary)"
          />
          Dura o dia todo
        </label>

        {draft.allDay ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dia">
              {(id) => <Input id={id} type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />}
            </Field>
            <Field label="Até" hint="Só se durar mais de um dia." error={tried ? untilError : undefined}>
              {(id) => (
                <Input id={id} type="date" min={draft.date} value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
              )}
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
            <Field label="Dia" className="col-span-2 sm:col-span-1">
              {(id) => <Input id={id} type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />}
            </Field>
            <Field label="Início">
              {(id) => <Input id={id} type="time" value={draft.start} onChange={(e) => set("start", e.target.value)} />}
            </Field>
            <Field label="Fim" error={tried ? endError : undefined}>
              {(id) => <Input id={id} type="time" value={draft.end} onChange={(e) => set("end", e.target.value)} />}
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repete">
            {(id) => (
              <Select id={id} value={draft.repeat} onChange={(e) => set("repeat", e.target.value as Repeat)}>
                {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => (
                  <option key={r} value={r}>
                    {REPEAT_LABELS[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {draft.repeat !== "none" && (
            <Field label="Repete até" hint="Em branco, repete sem fim.">
              {(id) => (
                <Input id={id} type="date" min={draft.date} value={draft.until} onChange={(e) => set("until", e.target.value)} />
              )}
            </Field>
          )}
        </div>

        {people.length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium">Com quem</legend>
            <p className="text-sm text-muted-foreground">Depois que acontece, o evento conta como contato com a pessoa.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {people.map((p) => {
                const on = (draft.personIds ?? []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("personIds", on ? (draft.personIds ?? []).filter((x) => x !== p.id) : [...(draft.personIds ?? []), p.id])
                    }
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-sm transition-colors duration-(--motion-fast)",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-surface text-foreground hover:border-input-hover",
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field label="Local">
          {(id) => (
            <Input id={id} value={draft.location} placeholder="Endereço ou link da chamada" onChange={(e) => set("location", e.target.value)} />
          )}
        </Field>
        <Field label="Anotações">
          {(id) => <Textarea id={id} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
      </DialogBody>
      <DialogFooter>
        {event && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              remove(event.id);
              onClose();
              toast({
                message: `${event.title} foi excluído`,
                action: { label: "Desfazer", onClick: () => restore(event) },
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
        <Button type="submit">{event ? "Salvar alterações" : "Adicionar evento"}</Button>
      </DialogFooter>
    </form>
  );
}
