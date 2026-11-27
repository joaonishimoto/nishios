import { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate, shortDate, today } from "@/lib/dates";
import { useCalendar } from "@/modules/calendario/store";
import { upcomingWith } from "./linked";
import { giftTotals, profileCount, profileOf, remainingOf } from "./extras";
import { GiftsTab } from "./GiftsTab";
import { balanceLabel, LoansTab } from "./LoansTab";
import { LogContact } from "./LogContact";
import { ProfileTab } from "./ProfileTab";
import {
  birthday,
  birthdayLabel,
  contact,
  CONTACT_META,
  frequencyLabel,
  lastContactLabel,
  nextContactLabel,
} from "./logic";
import { PersonForm } from "./PersonForm";
import { usePeople } from "./store";
import type { Person } from "./types";

type Tab = "resumo" | "presentes" | "dinheiro" | "gostos";

export function PersonPanel({ person, onClose }: { person: Person | undefined; onClose: () => void }) {
  return (
    <Dialog
      variant="sheet"
      open={!!person}
      onOpenChange={(o) => !o && onClose()}
      title={person?.name ?? "Pessoa"}
      hideTitle
    >
      {person && <PanelContent key={person.id} person={person} onClose={onClose} />}
    </Dialog>
  );
}

function PanelContent({ person: p, onClose }: { person: Person; onClose: () => void }) {
  const { remove, restore, removeInteraction, addInteraction } = usePeople();
  const toast = useToast();
  const { events } = useCalendar();
  const upcoming = upcomingWith(p.id, events, today());
  const [editing, setEditing] = useState(false);
  const c = contact(p);
  const meta = CONTACT_META[c.status];
  const b = birthday(p);
  const [tab, setTab] = useState<Tab>("resumo");
  const balance = balanceLabel(p);
  const gifts = giftTotals(p);
  const openLoans = (p.loans ?? []).filter((l) => remainingOf(l) > 0).length;
  const ideas = profileOf(p).ideas;

  return (
    <>
      <DialogBody className="flex flex-col gap-7 pt-12">
        <header className="flex flex-col gap-3">
          <Avatar name={p.name} size="lg" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">{p.name}</h2>
            {p.context && <p className="mt-0.5 text-muted-foreground">{p.context}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>
              <Dot tone={meta.tone} />
              {meta.label}
            </Badge>
            <Badge>{p.group}</Badge>
            {balance && balance.tone !== "neutral" && (
              <Badge tone={balance.tone === "success" ? "success" : "danger"}>{balance.text}</Badge>
            )}
          </div>
        </header>

        <Segmented<Tab>
          label="Seções da pessoa"
          value={tab}
          onChange={setTab}
          options={[
            { value: "resumo", label: "Resumo" },
            { value: "presentes", label: "Presentes", count: gifts.given + gifts.received || undefined },
            { value: "dinheiro", label: "Empréstimos", count: openLoans || undefined },
            { value: "gostos", label: "Gostos", count: profileCount(p) || undefined },
          ]}
        />

        {tab === "presentes" && <GiftsTab person={p} />}
        {tab === "dinheiro" && <LoansTab person={p} />}
        {tab === "gostos" && <ProfileTab person={p} />}

        {tab === "resumo" && (
        <>

        <section aria-label="Contato" className="rounded-lg border border-border bg-background p-4">
          <p className="text-lg font-semibold">{nextContactLabel(c)}</p>
          {c.status !== "none" && (
            <>
              <CycleTrack derived={{ status: c.status, progress: c.progress }} size="lg" className="mt-3" />
              <div className="mt-2 flex justify-between gap-4 text-sm text-muted-foreground">
                <span>
                  {c.lastContact ? (
                    <>
                      Último contato
                      <br />
                      <span className="font-medium text-foreground">{shortDate(c.lastContact)}</span>
                    </>
                  ) : (
                    "Ainda sem contato registrado"
                  )}
                </span>
                {c.nextContact && (
                  <span className="text-right">
                    Próximo
                    <br />
                    <span className="font-medium text-foreground">{shortDate(c.nextContact)}</span>
                  </span>
                )}
              </div>
            </>
          )}
          {c.status === "none" && (
            <p className="mt-1 text-sm text-muted-foreground">{lastContactLabel(c)}.</p>
          )}
          <LogContact person={p} variant="primary" size="md" className="mt-4 w-full" />
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
          <dt className="text-muted-foreground">Manter contato</dt>
          <dd>{frequencyLabel(p.contactEvery)}</dd>
          {b && (
            <>
              <dt className="text-muted-foreground">Aniversário</dt>
              <dd>
                {formatDate(b.next, "d 'de' MMMM")}
                <span className="text-muted-foreground">
                  {" "}
                  ({birthdayLabel(b).toLowerCase()}, faz {b.turning})
                </span>
                {b.daysUntil <= 30 && ideas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab("gostos")}
                    className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Gift className="size-3.5" aria-hidden />
                    {ideas.length === 1 ? "1 ideia de presente anotada" : `${ideas.length} ideias de presente anotadas`}
                  </button>
                )}
              </dd>
            </>
          )}
          {p.city && (
            <>
              <dt className="text-muted-foreground">Cidade</dt>
              <dd>{p.city}</dd>
            </>
          )}
          {p.phone && (
            <>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd>
                <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
                  {p.phone}
                </a>
              </dd>
            </>
          )}
          {p.notes && (
            <>
              <dt className="text-muted-foreground">Anotações</dt>
              <dd className="whitespace-pre-wrap">{p.notes}</dd>
            </>
          )}
        </dl>

        {upcoming.length > 0 && (
          <section>
            <h3 className="font-semibold">Próximos eventos juntos</h3>
            <ul className="mt-2 flex flex-col">
              {upcoming.map(({ event, date }) => (
                <li key={`${event.id}-${date}`} className="border-b border-border last:border-b-0">
                  <Link to={`/calendario?dia=${date}`} className="flex items-baseline justify-between gap-3 py-2 hover:text-primary">
                    <span className="min-w-0 truncate">{event.title}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {shortDate(date)}
                      {!event.allDay && event.start && `, ${event.start}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="font-semibold">Histórico de contatos</h3>
          {p.interactions.length === 0 ? (
            <EmptyState
              size="sm"
              icon={MessageCircle}
              frame="dashed"
              className="mt-2"
              title="Nenhum contato registrado"
              description="Quando vocês se falarem, registre aqui para saber quando procurar de novo."
            />
          ) : (
            <ol className="mt-2 flex flex-col">
              {p.interactions.map((i, index) => (
                <li
                  key={i.id}
                  className="group flex items-start gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <Dot tone={index === 0 ? "info" : "neutral"} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{formatDate(i.date)}</span>
                      <span className="text-sm text-muted-foreground"> {i.type.toLowerCase()}</span>
                    </p>
                    {i.note && <p className="text-sm text-muted-foreground">{i.note}</p>}
                  </div>
                  {i.eventId ? (
                    <Link to={`/calendario?dia=${i.date}`} className="shrink-0 pt-0.5 text-sm text-primary hover:underline">
                      Do calendário
                    </Link>
                  ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover o contato de ${formatDate(i.date)}`}
                    className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => {
                      removeInteraction(p.id, i.id);
                      toast({
                        message: "Contato removido",
                        action: { label: "Desfazer", onClick: () => addInteraction(p.id, i) },
                      });
                    }}
                  >
                    <X />
                  </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
        </>
        )}
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
          onClick={() => {
            remove(p.id);
            onClose();
            toast({
              message: `${p.name} foi excluído`,
              action: { label: "Desfazer", onClick: () => restore(p) },
            });
          }}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>

      <PersonForm open={editing} onOpenChange={setEditing} person={p} />
    </>
  );
}
