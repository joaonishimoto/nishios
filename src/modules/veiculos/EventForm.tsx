import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { toISO, today } from "@/lib/dates";
import { useVeiculos } from "./store";
import { EVENT_KINDS, type EventKind, type Vehicle, type VehicleEvent } from "./types";

const PLACEHOLDER: Record<EventKind, string> = {
  oleo: "Ex.: Óleo 5W30 sintético e filtro",
  pneus: "Ex.: Troca dos 4 pneus, rodízio, alinhamento",
  lavagem: "Ex.: Lavagem completa com cera",
  revisao: "Ex.: Revisão dos 30 mil km, troca da bateria",
  modificacao: "Ex.: Película nos vidros, central multimídia, rodas aro 15",
  batida: "Ex.: Ralado no para-choque no estacionamento",
  multa: "Ex.: Excesso de velocidade na Marginal",
  outro: "O que foi",
};

/** Registra ou edita um item do diário do carro. */
export function EventForm({
  vehicle,
  event,
  kind,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle;
  event?: VehicleEvent;
  /** Tipo já escolhido ao criar (o "+" de um quadro). */
  kind?: EventKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={event ? "Editar registro" : `Registrar no ${vehicle.name}`}>
      <Content key={event?.id ?? kind ?? "novo"} vehicle={vehicle} event={event} kind={kind} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ vehicle, event, kind, onClose }: { vehicle: Vehicle; event?: VehicleEvent; kind?: EventKind; onClose: () => void }) {
  const { saveEvent, removeEvent } = useVeiculos();
  const toast = useToast();
  const [d, setD] = useState<VehicleEvent>(
    () =>
      event ?? {
        id: crypto.randomUUID(),
        kind: kind ?? "oleo",
        date: toISO(today()),
        cost: 0,
        km: vehicle.km,
        title: "",
        notes: "",
      },
  );
  const set = <K extends keyof VehicleEvent>(k: K, v: VehicleEvent[K]) => setD((x) => ({ ...x, [k]: v }));
  const meta = EVENT_KINDS.find((k) => k.value === d.kind)!;

  function submit(e: FormEvent) {
    e.preventDefault();
    saveEvent(vehicle.id, {
      ...d,
      title: d.title.trim(),
      notes: d.notes.trim(),
      cost: Math.max(0, d.cost || 0),
      km: d.km || undefined,
      points: d.kind === "multa" ? d.points || undefined : undefined,
      covered: d.kind === "multa" || d.kind === "batida" ? d.covered : undefined,
    });
    toast({ message: event ? "Registro salvo" : `${meta.label} registrada no ${vehicle.name}` });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="O que foi" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {EVENT_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={d.kind === k.value}
              onClick={() => set("kind", k.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-sm transition-colors duration-(--motion-fast)",
                d.kind === k.value ? "border-primary bg-secondary font-medium text-secondary-foreground" : "border-border hover:bg-surface-hover",
              )}
            >
              <span aria-hidden>{k.icon}</span>
              <span className="truncate">{k.label}</span>
            </button>
          ))}
        </div>

        <Field label="Descrição" hint={meta.hint}>
          {(id) => <Input id={id} value={d.title} placeholder={PLACEHOLDER[d.kind]} onChange={(e) => set("title", e.target.value)} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Quando">
            {(id) => <Input id={id} type="date" placeholder="Data" value={d.date} onChange={(e) => set("date", e.target.value)} />}
          </Field>
          <Field label={d.kind === "batida" ? "Gastei (R$)" : "Valor (R$)"}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={d.cost || ""}
                onChange={(e) => set("cost", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Quilometragem">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="km"
                value={d.km ?? ""}
                onChange={(e) => set("km", e.target.value ? Number(e.target.value) : undefined)}
              />
            )}
          </Field>
        </div>

        {d.kind === "multa" && (
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <Field label="Pontos na carteira">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  max={7}
                  inputMode="numeric"
                  placeholder="Ex.: 4"
                  value={d.points ?? ""}
                  onChange={(e) => set("points", e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            </Field>
            <label className="flex h-9 items-center gap-2 text-sm">
              <Checkbox checked={!!d.covered} onChange={(c) => set("covered", c)} label="Já paguei" />
              Já paguei
            </label>
          </div>
        )}
        {d.kind === "batida" && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!d.covered} onChange={(c) => set("covered", c)} label="Acionei o seguro" />
            Acionei o seguro (o valor acima é só o que saiu do meu bolso, como a franquia)
          </label>
        )}

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={d.notes}
              placeholder={d.kind === "batida" ? "Onde foi, quem bateu, oficina, número do sinistro..." : "Oficina, marca do produto, próxima vez..."}
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {event && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeEvent(vehicle.id, event.id);
              onClose();
              toast({ message: "Registro apagado", action: { label: "Desfazer", onClick: () => saveEvent(vehicle.id, event) } });
            }}
          >
            <Trash2 />
            Apagar
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{event ? "Salvar" : "Registrar"}</Button>
      </DialogFooter>
    </form>
  );
}
