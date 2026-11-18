import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { latest, num } from "./logic";
import { useCorpo } from "./store";
import { MEASURES, type Entry, type MeasureId } from "./types";

export function EntryForm({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: Entry;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? "Editar medição" : "Registrar medidas"}
      description={entry ? undefined : "Preencha só o que mediu hoje. O resto continua com o último valor."}
      className="max-w-xl"
    >
      <Content key={entry?.id ?? "nova"} entry={entry} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

/** Aceita vírgula ou ponto; vazio vira 0 (não medido). */
const parse = (text: string) => {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const show = (n: number | undefined) => (n && n > 0 ? String(n).replace(".", ",") : "");

function Content({ entry, onClose }: { entry?: Entry; onClose: () => void }) {
  const { entries, profile, create, update, remove, restore, setHeight } = useCorpo();
  const toast = useToast();
  const max = toISO(today());
  const [date, setDate] = useState(entry?.date ?? max);
  const [weight, setWeight] = useState(show(entry?.weight));
  const [bodyFat, setBodyFat] = useState(show(entry?.bodyFat));
  const [height, setHeightText] = useState(show(profile.height));
  const [measures, setMeasures] = useState<Record<string, string>>(
    Object.fromEntries(MEASURES.map((m) => [m.id, show(entry?.measures[m.id])])),
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [tried, setTried] = useState(false);

  const parsedMeasures = Object.fromEntries(
    MEASURES.map((m) => [m.id, parse(measures[m.id])] as const).filter(([, v]) => v > 0),
  ) as Partial<Record<MeasureId, number>>;
  const empty = parse(weight) === 0 && parse(bodyFat) === 0 && Object.keys(parsedMeasures).length === 0;
  // Placeholder com o último valor: ajuda a lembrar e a notar erro de digitação.
  const others = entry ? entries.filter((e) => e.id !== entry.id) : entries;
  const last = (metric: Parameters<typeof latest>[1]) => {
    const p = latest(others, metric);
    return p ? num(p.value) : "";
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (empty || !date) return;
    const draft = { date, weight: parse(weight), bodyFat: parse(bodyFat), measures: parsedMeasures, notes: notes.trim() };
    if (parse(height) !== profile.height) setHeight(parse(height));
    if (entry) {
      update(entry.id, draft);
      toast({ message: "Alterações salvas" });
    } else {
      create(draft);
      toast({ message: "Medidas registradas" });
    }
    onClose();
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}>
      <DialogBody className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Quando" className="col-span-2 sm:col-span-1">
            {(id) => <Input placeholder="Escolher a data" id={id} type="date" max={max} required value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Peso em kg">
            {(id) => (
              <Input id={id} inputMode="decimal" autoFocus={!entry} value={weight} placeholder={last("peso")} onChange={(e) => setWeight(e.target.value)} />
            )}
          </Field>
          <Field label="Gordura em %">
            {(id) => (
              <Input id={id} inputMode="decimal" value={bodyFat} placeholder={last("gordura")} onChange={(e) => setBodyFat(e.target.value)} />
            )}
          </Field>
          <Field label="Altura em cm">
            {(id) => <Input placeholder="Ex.: 178" id={id} inputMode="decimal" value={height} onChange={(e) => setHeightText(e.target.value)} />}
          </Field>
        </div>

        <fieldset>
          <legend className="font-semibold">Medidas em centímetros</legend>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {MEASURES.map((m) => (
              <Field key={m.id} label={m.label} hint={m.how}>
                {(id) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={measures[m.id]}
                    placeholder={last(m.id)}
                    onChange={(e) => setMeasures((s) => ({ ...s, [m.id]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>

        <Field label="Anotações">
          {(id) => (
            <Textarea id={id} value={notes} placeholder="Em jejum, depois do treino, balança da academia..." onChange={(e) => setNotes(e.target.value)} />
          )}
        </Field>

        {tried && empty && (
          <p role="alert" className="text-sm font-medium text-danger-strong">
            Preencha o peso ou pelo menos uma medida.
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        {entry && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              remove(entry.id);
              onClose();
              toast({ message: "Medição excluída", action: { label: "Desfazer", onClick: () => restore(entry) } });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{entry ? "Salvar alterações" : "Registrar medidas"}</Button>
      </DialogFooter>
    </form>
  );
}
