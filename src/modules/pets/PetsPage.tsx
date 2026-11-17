import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Pencil, Plus, Scale, Sofa } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { LineChart } from "@/components/ui/LineChart";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import {
  ageLabel,
  byCareUrgency,
  careLabel,
  careState,
  currentWeight,
  formatKg,
  intervalLabel,
  newestFirst,
  overdueCares,
  petHeadline,
} from "./logic";
import { CareForm, HealthForm, PetForm } from "./PetForms";
import { PETS_IN_HOUSE } from "./seed";
import { newId, usePets } from "./store";
import type { Care, HealthRecord, Pet } from "./types";

type FormState<T> = { open: boolean; value?: T };

export function PetsPage() {
  const { pets } = usePets();
  const [params, setParams] = useSearchParams();
  const [petForm, setPetForm] = useState<FormState<Pet>>({ open: false });

  const selected = pets.find((p) => p.id === params.get("p")) ?? pets[0];
  const select = (id: string) => setParams({ p: id }, { replace: true, preventScrollReset: true });
  const overdue = pets.reduce((n, p) => n + overdueCares(p).length, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Pets"
        description={
          pets.length === 0
            ? "Vacinas, saúde e peso dos seus bichos em um lugar só."
            : overdue > 0
              ? `${plural(overdue, "cuidado atrasado", "cuidados atrasados")}. Veja abaixo qual pet precisa de você.`
              : "Vacinas e cuidados em dia."
        }
        action={
          pets.length > 0 && (
            <Button onClick={() => setPetForm({ open: true })}>
              <Plus />
              Novo pet
            </Button>
          )
        }
      />

      {pets.length === 0 || !selected ? (
        <EmptyState
          title="Nenhum pet cadastrado"
          description="Adicione seu pet para acompanhar vacinas, consultas, problemas de saúde e peso."
          action={
            <Button onClick={() => setPetForm({ open: true })}>
              <Plus />
              Novo pet
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pets.map((p) => (
              <li key={p.id}>
                <PetCard pet={p} selected={p.id === selected.id} onSelect={() => select(p.id)} />
              </li>
            ))}
          </ul>
          <PetDetail key={selected.id} pet={selected} onEdit={() => setPetForm({ open: true, value: selected })} />
        </>
      )}

      <PetForm
        open={petForm.open}
        value={petForm.value}
        onRemoved={() => setParams({}, { replace: true })}
        onOpenChange={(open) => setPetForm((s) => ({ ...s, open }))}
      />
    </div>
  );
}

const headlineTone = {
  danger: "text-danger-strong",
  warning: "text-warning-strong",
  muted: "text-muted-foreground",
};

function PetCard({ pet, selected, onSelect }: { pet: Pet; selected: boolean; onSelect: () => void }) {
  const headline = petHeadline(pet);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full w-full items-center gap-3 rounded-lg border bg-surface p-3.5 text-left transition-colors duration-(--motion-fast)",
        selected
          ? "border-primary bg-surface-selected"
          : "border-border hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-2xl leading-none">
        {pet.icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{pet.name}</span>
        <span className={cn("block truncate text-sm", headlineTone[headline.tone])}>{headline.text}</span>
      </span>
    </button>
  );
}

function SectionHead({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

function PetDetail({ pet, onEdit }: { pet: Pet; onEdit: () => void }) {
  const [careForm, setCareForm] = useState<FormState<Care>>({ open: false });
  const [healthForm, setHealthForm] = useState<FormState<HealthRecord>>({ open: false });

  const cares = [...pet.cares].sort((a, b) => byCareUrgency(a, b));
  const health = newestFirst(pet.health).sort((a, b) => Number(b.ongoing) - Number(a.ongoing));
  const weight = currentWeight(pet);
  const age = ageLabel(pet.birthday);
  const facts = [pet.species, pet.breed, age, weight && formatKg(weight.kg)].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-muted text-3xl leading-none">
              {pet.icon}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">{pet.name}</h2>
              <p className="text-muted-foreground">{facts.join(", ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PETS_IN_HOUSE.includes(pet.id) && (
              <Link
                to="/casa"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-primary hover:bg-surface-hover"
              >
                <Sofa className="size-4" aria-hidden />
                Ver andando pela casa
              </Link>
            )}
            <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
              <Pencil />
              Editar pet
            </Button>
          </div>
        </div>
        {pet.notes && <p className="mt-4 max-w-[70ch] whitespace-pre-line">{pet.notes}</p>}
        {pet.birthday && (
          <p className="mt-2 text-sm text-muted-foreground">Nasceu em {formatDate(pet.birthday)}.</p>
        )}
      </section>

      <section>
        <SectionHead
          title="Vacinas e cuidados"
          action={
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCareForm({ open: true })}>
              <Plus />
              Nova vacina ou cuidado
            </Button>
          }
        />
        {cares.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Cadastre as vacinas, o vermífugo e o antipulgas para o NishiOS avisar quando vencerem.
          </p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
            {cares.map((c) => (
              <CareRow key={c.id} pet={pet} care={c} onOpen={() => setCareForm({ open: true, value: c })} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHead
          title="Saúde"
          action={
            <Button variant="outline" size="sm" className="h-8" onClick={() => setHealthForm({ open: true })}>
              <Plus />
              Novo registro
            </Button>
          }
        />
        {health.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Anote consultas, exames e problemas de saúde para ter o histórico na mão quando o veterinário perguntar.
          </p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
            {health.map((h) => (
              <li
                key={h.id}
                className="relative flex items-start gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setHealthForm({ open: true, value: h })}
                    className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
                  >
                    {h.title}
                  </button>
                  <p className="text-sm text-muted-foreground">
                    {h.kind}
                    {h.notes && `. ${h.notes}`}
                  </p>
                </div>
                {h.kind === "Problema de saúde" && (
                  <Badge tone={h.ongoing ? "warning" : "success"}>{h.ongoing ? "Em tratamento" : "Resolvido"}</Badge>
                )}
                <span className="w-20 shrink-0 pt-0.5 text-right text-sm text-muted-foreground">
                  {shortDate(h.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WeightSection pet={pet} />

      <CareForm
        open={careForm.open}
        value={careForm.value}
        pet={pet}
        onOpenChange={(open) => setCareForm((s) => ({ ...s, open }))}
      />
      <HealthForm
        open={healthForm.open}
        value={healthForm.value}
        pet={pet}
        onOpenChange={(open) => setHealthForm((s) => ({ ...s, open }))}
      />
    </div>
  );
}

const careTone = {
  overdue: "text-danger-strong",
  soon: "text-warning-strong",
  ok: "text-muted-foreground",
  never: "text-muted-foreground",
  once: "text-muted-foreground",
};

function CareRow({ pet, care, onOpen }: { pet: Pet; care: Care; onOpen: () => void }) {
  const state = careState(care);
  return (
    <li className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover">
      <div className="min-w-0 flex-1 basis-48">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
        >
          {care.name}
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {intervalLabel(care.intervalMonths)}
          {care.lastDate && `, última em ${shortDate(care.lastDate)}`}
        </p>
      </div>
      <div className="flex w-40 flex-col gap-1.5">
        <span className={cn("text-sm font-medium", careTone[state.status])}>{careLabel(state)}</span>
        {state.status !== "once" && (
          <CycleTrack derived={{ status: state.status, progress: state.progress }} />
        )}
      </div>
      <div className="relative z-10 ml-auto">
        {state.status === "once" ? (
          <span className="flex h-8 items-center gap-1.5 px-2 text-sm text-success-strong">
            <Check className="size-4" aria-hidden />
            Feito
          </span>
        ) : (
          <MarkCareDone pet={pet} care={care} />
        )}
      </div>
    </li>
  );
}

function MarkCareDone({ pet, care }: { pet: Pet; care: Care }) {
  const { saveItem } = usePets();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const max = toISO(today());
  const [date, setDate] = useState(max);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return;
    saveItem(pet.id, "cares", { ...care, lastDate: date });
    setOpen(false);
    toast({
      message: `${care.name} de ${pet.name} marcado como feito`,
      action: { label: "Desfazer", onClick: () => saveItem(pet.id, "cares", care) },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDate(max);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Check />
          Marcar como feito
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Quando foi feito">
            {(id) => (
              <Input id={id} type="date" max={max} value={date} required onChange={(e) => setDate(e.target.value)} />
            )}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Marcar como feito
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function WeightSection({ pet }: { pet: Pet }) {
  const { saveItem, removeItem } = usePets();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const max = toISO(today());
  const [date, setDate] = useState(max);
  const [kg, setKg] = useState("");
  const weights = newestFirst(pet.weights);
  const heaviest = Math.max(...weights.map((w) => w.kg), 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(kg.replace(",", "."));
    if (!date || !(value > 0)) return;
    const item = { id: newId(), date, kg: value };
    saveItem(pet.id, "weights", item);
    setOpen(false);
    toast({
      message: `Peso de ${pet.name} registrado`,
      action: { label: "Desfazer", onClick: () => removeItem(pet.id, "weights", item.id) },
    });
  }

  return (
    <section>
      <SectionHead
        title="Peso"
        action={
          <Popover
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (o) {
                setDate(max);
                setKg("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Scale />
                Registrar peso
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <form className="flex flex-col gap-3" onSubmit={submit}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Peso em kg">
                    {(id) => (
                      <Input
                        id={id}
                        inputMode="decimal"
                        value={kg}
                        placeholder="0,0"
                        required
                        onChange={(e) => setKg(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Quando">
                    {(id) => (
                      <Input id={id} type="date" max={max} value={date} required onChange={(e) => setDate(e.target.value)} />
                    )}
                  </Field>
                </div>
                <Button type="submit" size="sm" className="h-8">
                  Registrar peso
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        }
      />
      {weights.length === 0 ? (
        <p className="mt-3 text-muted-foreground">
          Registre o peso depois de cada consulta para acompanhar se está subindo ou caindo.
        </p>
      ) : (
        <>
        {weights.length > 1 && (
          <div className="mt-3 rounded-lg border border-border bg-surface p-3">
            <LineChart
              points={[...weights].reverse().map((w) => ({ date: w.date, value: w.kg }))}
              label={`Peso de ${pet.name} ao longo do tempo`}
              format={formatKg}
            />
          </div>
        )}
        <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
          {weights.map((w, i) => {
            const prev = weights[i + 1];
            const diff = prev ? w.kg - prev.kg : 0;
            return (
              <li key={w.id} className="flex items-center gap-4 border-b border-border px-3 py-2.5 last:border-b-0">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{shortDate(w.date)}</span>
                <span className="w-16 shrink-0 font-medium tabular-nums">{formatKg(w.kg)}</span>
                <span aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(w.kg / heaviest) * 100}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {!prev ? "Primeiro" : Math.abs(diff) < 0.05 ? "Igual" : `${diff > 0 ? "+" : "−"}${formatKg(Math.abs(diff))}`}
                </span>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </section>
  );
}
