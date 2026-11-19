import { useState } from "react";
import { Link } from "react-router-dom";
import { useBens } from "@/modules/bens/store";
import { usePets } from "@/modules/pets/store";
import { History, Pencil, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { CommitmentForm } from "./CommitmentForm";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { MarkDone } from "./MarkDone";
import {
  derive,
  dueLabel,
  formatDate,
  humanizeDays,
  isOneOff,
  periodLabel,
  shortDate,
  sinceLabel,
  STATUS_META,
} from "./logic";
import { useCommitments } from "./store";
import type { Commitment } from "./types";

/** Painel lateral com tudo sobre um compromisso: ciclo, dados e histórico. */
export function CommitmentPanel({
  commitment,
  onClose,
}: {
  commitment: Commitment | undefined;
  onClose: () => void;
}) {
  return (
    <Dialog
      variant="sheet"
      open={!!commitment}
      onOpenChange={(o) => !o && onClose()}
      title={commitment?.name ?? "Compromisso"}
      hideTitle
    >
      {commitment && <PanelContent commitment={commitment} onClose={onClose} />}
    </Dialog>
  );
}

function PanelContent({ commitment: c, onClose }: { commitment: Commitment; onClose: () => void }) {
  const { remove, restore, removeDone, markDone } = useCommitments();
  const toast = useToast();
  const asset = useBens().assets.find((a) => a.id === c.assetId);
  const pet = usePets().pets.find((p) => p.id === c.petId);
  const [editing, setEditing] = useState(false);
  const d = derive(c);
  const meta = STATUS_META[d.status];
  const oneOff = isOneOff(c);

  function handleDelete() {
    remove(c.id);
    onClose();
    toast({
      message: `${c.name} foi excluído`,
      action: { label: "Desfazer", onClick: () => restore(c) },
    });
  }

  return (
    <>
      <DialogBody className="flex flex-col gap-7 pt-12">
        <header className="flex flex-col gap-3">
          <span className="text-[2.5rem] leading-none">{c.icon}</span>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">{c.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>
              <Dot tone={meta.tone} />
              {meta.label}
            </Badge>
            <Badge>{c.category}</Badge>
          </div>
        </header>

        <section aria-label="Ciclo atual" className="rounded-lg border border-border bg-background p-4">
          <p className="text-lg font-semibold">{dueLabel(d)}</p>
          <CycleTrack derived={d} size="lg" className="mt-3" />
          <div className="mt-2 flex justify-between gap-4 text-sm text-muted-foreground">
            <span>
              {d.lastDone ? (
                <>
                  {oneOff ? "Feito em" : "Última vez"}
                  <br />
                  <span className="font-medium text-foreground">{shortDate(d.lastDone)}</span>
                </>
              ) : (
                "Ainda não foi feito"
              )}
            </span>
            {d.nextDue && (
              <span className="text-right">
                {oneOff ? "Data" : "Próxima"}
                <br />
                <span className="font-medium text-foreground">{shortDate(d.nextDue)}</span>
              </span>
            )}
          </div>
          {d.status !== "done" && (
            <MarkDone commitment={c} variant="primary" size="md" className="mt-4 w-full" />
          )}
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
          <dt className="text-muted-foreground">Repete</dt>
          <dd>{periodLabel(c)}</dd>
          <dt className="text-muted-foreground">Aviso</dt>
          <dd>
            {c.warnDays === 0
              ? oneOff ? "Só no dia" : "Só no dia do vencimento"
              : `${humanizeDays(c.warnDays)} antes ${oneOff ? "da data" : "do vencimento"}`}
          </dd>
          {asset && (
            <>
              <dt className="text-muted-foreground">Bem</dt>
              <dd>
                <Link to="/bens" className="text-primary hover:underline">
                  {asset.icon} {asset.name}
                </Link>
              </dd>
            </>
          )}
          {pet && (
            <>
              <dt className="text-muted-foreground">Pet</dt>
              <dd>
                <Link to={`/pets?p=${pet.id}`} className="text-primary hover:underline">
                  {pet.icon} {pet.name}
                </Link>
              </dd>
            </>
          )}
          {c.notes && (
            <>
              <dt className="text-muted-foreground">Anotações</dt>
              <dd className="whitespace-pre-wrap">{c.notes}</dd>
            </>
          )}
        </dl>

        <section>
          <h3 className="font-semibold">{oneOff ? "Feito em" : "Histórico"}</h3>
          {c.history.length === 0 ? (
            <EmptyState
              size="sm"
              icon={History}
              frame="dashed"
              className="mt-2"
              title="Nenhum registro ainda"
              description="Quando você marcar como feito, as datas aparecem aqui."
            />
          ) : (
            <ol className="mt-2 flex flex-col">
              {c.history.map((date, i) => (
                <li
                  key={date}
                  className="group flex h-9 items-center gap-3 border-b border-border last:border-b-0"
                >
                  <Dot tone={i === 0 ? "info" : "neutral"} />
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="text-sm text-muted-foreground">
                    {sinceLabel(derive({ ...c, history: [date] }).daysSince).toLowerCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover o registro de ${formatDate(date)}`}
                    className="ml-auto size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => {
                      removeDone(c.id, date);
                      toast({
                        message: "Registro removido",
                        action: { label: "Desfazer", onClick: () => markDone(c.id, date) },
                      });
                    }}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </DialogBody>

      <div className="flex items-center gap-2 border-t border-border px-6 py-3">
        <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
          <Pencil />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 hover:bg-danger-soft hover:text-danger-strong"
          onClick={handleDelete}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>

      <CommitmentForm open={editing} onOpenChange={setEditing} commitment={c} />
    </>
  );
}
