import { useState, type FormEvent } from "react";
import { Gift as GiftIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { formatDate, toISO, today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { giftsOf, giftTotals } from "./extras";
import { usePeople } from "./store";
import { OCCASIONS, type Gift, type GiftDirection, type Person } from "./types";

type Filter = "todos" | GiftDirection;

export function GiftsTab({ person: p }: { person: Person }) {
  const { removeGift, saveGift } = usePeople();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("todos");
  const [editing, setEditing] = useState<Gift | "dei" | "recebi" | null>(null);
  const all = giftsOf(p);
  const t = giftTotals(p);
  const list = filter === "todos" ? all : all.filter((g) => g.direction === filter);
  const first = p.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Summary label="Você deu" count={t.given} value={t.givenValue} />
        <Summary label={`${first} te deu`} count={t.received} value={t.receivedValue} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8" onClick={() => setEditing("dei")}>
          <Plus />
          Presente que dei
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing("recebi")}>
          <Plus />
          Presente que recebi
        </Button>
      </div>

      {all.length === 0 ? (
        <EmptyState
          size="sm"
          icon={GiftIcon}
          frame="dashed"
          title="Nenhum presente registrado"
          description={`Anote o que você deu para ${first} e o que ganhou, para não repetir e lembrar quanto gastou.`}
        />
      ) : (
        <section>
          <Segmented<Filter>
            label="Filtrar presentes"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todos", label: "Todos", count: all.length },
              { value: "dei", label: "Dei", count: t.given },
              { value: "recebi", label: "Recebi", count: t.received },
            ]}
          />
          <ul className="mt-2 flex flex-col">
            {list.map((g) => (
              <li key={g.id} className="group flex items-start gap-3 border-b border-border py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{g.item}</span>
                    <Badge tone={g.direction === "dei" ? "info" : "success"}>
                      {g.direction === "dei" ? "Dei" : "Recebi"}
                    </Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[formatDate(g.date), g.occasion].filter(Boolean).join(" · ")}
                  </p>
                  {g.note && <p className="text-sm text-muted-foreground">{g.note}</p>}
                </div>
                <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                  {g.value != null ? money(g.value) : <span className="text-subtle-foreground">–</span>}
                </span>
                <div className="flex shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar ${g.item}`} onClick={() => setEditing(g)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Excluir ${g.item}`}
                    onClick={() => {
                      removeGift(p.id, g.id);
                      toast({ message: "Presente excluído", action: { label: "Desfazer", onClick: () => saveGift(p.id, g) } });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GiftForm person={p} editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Summary({ label, count, value }: { label: string; count: number; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">
        {value > 0 ? money(value) : count > 0 ? <span className="text-muted-foreground">Sem valor</span> : money(0)}
      </p>
      <p className="text-xs text-muted-foreground">{plural(count, "presente", "presentes")}</p>
    </div>
  );
}

/** Formulário de presente. `editing` é o presente, ou só a direção para um novo. */
export function GiftForm({
  person,
  editing,
  onClose,
  initial,
  onSaved,
}: {
  person: Person;
  editing: Gift | GiftDirection | null;
  onClose: () => void;
  /** Chamado depois de salvar. */
  onSaved?: () => void;
  /** Valores para começar um presente novo (ex.: vindo de uma ideia de presente). */
  initial?: Partial<Gift>;
}) {
  const isNew = typeof editing === "string";
  const direction = typeof editing === "string" ? editing : editing?.direction ?? "dei";
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? (direction === "dei" ? "Presente que dei" : "Presente que recebi") : "Editar presente"}
      description={isNew ? (direction === "dei" ? `O que você deu para ${person.name.split(" ")[0]}.` : `O que ${person.name.split(" ")[0]} te deu.`) : undefined}
    >
      {editing !== null && (
        <GiftFormContent
          key={typeof editing === "string" ? editing : editing.id}
          person={person}
          gift={typeof editing === "string" ? { direction: editing, ...initial } : editing}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function GiftFormContent({
  person,
  gift,
  onClose,
  onSaved,
}: {
  person: Person;
  gift: Partial<Gift>;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { saveGift } = usePeople();
  const toast = useToast();
  const [direction, setDirection] = useState<GiftDirection>(gift.direction ?? "dei");
  const [item, setItem] = useState(gift.item ?? "");
  const [date, setDate] = useState(gift.date ?? toISO(today()));
  const [value, setValue] = useState<number | undefined>(gift.value);
  const [occasion, setOccasion] = useState(gift.occasion ?? "");
  const [note, setNote] = useState(gift.note ?? "");
  const [tried, setTried] = useState(false);
  const itemError = item.trim() ? undefined : "Diga qual foi o presente.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (itemError || !date) return;
    saveGift(person.id, {
      id: gift.id ?? crypto.randomUUID(),
      direction,
      item: item.trim(),
      date,
      value,
      occasion: occasion.trim(),
      note: note.trim(),
    });
    toast({ message: gift.id ? "Presente atualizado" : "Presente registrado" });
    onSaved?.();
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <Segmented<GiftDirection>
          label="Quem deu"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "dei", label: "Eu dei" },
            { value: "recebi", label: "Eu recebi" },
          ]}
        />
        <Field label="Presente" error={tried ? itemError : undefined}>
          {(id) => (
            <Input id={id} value={item} autoFocus placeholder="Ex.: Perfume Malbec" onChange={(e) => setItem(e.target.value)} />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quando">
            {(id) => <Input id={id} type="date" value={date} required placeholder="Escolher a data" onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Quanto custou" hint="Deixe vazio se não souber.">
            {(id) => <MoneyInput id={id} value={value} onValueChange={setValue} />}
          </Field>
        </div>
        <Field label="Ocasião">
          {(id) => (
            <>
              <Input id={id} list={`${id}-ocasioes`} value={occasion} placeholder="Ex.: Aniversário" onChange={(e) => setOccasion(e.target.value)} />
              <datalist id={`${id}-ocasioes`}>
                {OCCASIONS.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Observação">
          {(id) => (
            <Textarea id={id} value={note} placeholder="Onde comprou, se a pessoa gostou, se precisa trocar..." onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{gift.id ? "Salvar" : "Registrar presente"}</Button>
      </DialogFooter>
    </form>
  );
}
