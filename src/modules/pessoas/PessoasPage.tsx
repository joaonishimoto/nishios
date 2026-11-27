import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cake, Plus, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { EmptyState, NoResults } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { LogContact } from "./LogContact";
import {
  birthday,
  birthdayLabel,
  byContactUrgency,
  contact,
  lastContactLabel,
  needsContact,
  nextContactLabel,
  upcomingBirthdays,
} from "./logic";
import { PersonForm } from "./PersonForm";
import { PersonPanel } from "./PersonPanel";
import { usePeople } from "./store";
import { balanceLabel } from "./LoansTab";
import type { Person } from "./types";

const GRID =
  "md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_7.5rem_auto] md:items-center md:gap-x-5";

export function PessoasPage() {
  const { people } = usePeople();
  const [params, setParams] = useSearchParams();
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const openPerson = people.find((p) => p.id === params.get("p"));
  const open = (id: string | null) =>
    setParams(id ? { p: id } : {}, { replace: !id, preventScrollReset: true });

  const groups = useMemo(
    () => [...new Set(people.map((p) => p.group))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [people],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return people
      .filter((p) => group === "all" || p.group === group)
      .filter(
        (p) =>
          !q ||
          p.name.toLocaleLowerCase("pt-BR").includes(q) ||
          p.context.toLocaleLowerCase("pt-BR").includes(q),
      )
      .sort((a, b) => byContactUrgency(a, b));
  }, [people, group, query]);

  const birthdays = useMemo(() => upcomingBirthdays(people, 30), [people]);
  const toReach = people.filter((p) => needsContact(p)).length;
  const filtering = group !== "all" || query.trim() !== "";

  return (
    <>
      <PageHeader
        title="Pessoas"
        description={
          people.length === 0
            ? "Família, amigos e contatos de trabalho, e de quanto em quanto tempo você quer falar com cada um."
            : toReach === 0
              ? `${plural(people.length, "pessoa", "pessoas")}. Ninguém esperando contato.`
              : `${plural(people.length, "pessoa", "pessoas")}. ${toReach === 1 ? "Está na hora de procurar 1 delas." : `Está na hora de procurar ${toReach} delas.`}`
        }
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Nova pessoa
          </Button>
        }
      />

      {birthdays.length > 0 && (
        <section className="mt-6" aria-label="Aniversários nos próximos 30 dias">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Cake className="size-4 text-subtle-foreground" aria-hidden />
            Aniversários nos próximos 30 dias
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {birthdays.map(({ person, birthday: b }) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => open(person.id)}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-surface py-1.5 pr-3.5 pl-1.5 text-left transition-colors duration-(--motion-fast) hover:border-border-strong hover:bg-surface-hover"
                >
                  <Avatar name={person.name} />
                  <span>
                    <span className="block font-medium">{person.name}</span>
                    <span
                      className={cn(
                        "block text-sm",
                        b.daysUntil <= 7 ? "text-warning-strong" : "text-muted-foreground",
                      )}
                    >
                      {birthdayLabel(b)}, {formatDate(b.next, "d 'de' MMM")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented
          label="Filtrar por grupo"
          value={group}
          onChange={setGroup}
          options={[
            { value: "all", label: "Todos", count: people.length },
            ...groups.map((g) => ({
              value: g,
              label: g,
              count: people.filter((p) => p.group === g).length,
            })),
          ]}
        />
        <div className="relative ml-auto w-full sm:w-56">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar pessoa"
            placeholder="Buscar pessoas"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        {people.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ninguém por aqui ainda"
            description="Comece pelas pessoas com quem você mais quer manter contato."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus />
                Nova pessoa
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <NoResults
            query={query}
            onClear={
              filtering
                ? () => {
                    setGroup("all");
                    setQuery("");
                  }
                : undefined
            }
          />
        ) : (
          <>
            <div
              aria-hidden
              className={cn(
                "hidden border-b border-border px-3 pb-2 text-sm text-muted-foreground",
                GRID,
              )}
            >
              <span>Pessoa</span>
              <span>Contato</span>
              <span>Aniversário</span>
              <span className="w-[10.25rem]" />
            </div>
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {visible.map((p) => (
                <Row key={p.id} person={p} onOpen={() => open(p.id)} />
              ))}
            </ul>
          </>
        )}
      </div>

      <PersonForm open={creating} onOpenChange={setCreating} />
      <PersonPanel person={openPerson} onClose={() => open(null)} />
    </>
  );
}

function Row({ person: p, onOpen }: { person: Person; onOpen: () => void }) {
  const c = contact(p);
  const b = birthday(p);
  const balance = balanceLabel(p);
  const tone =
    c.status === "overdue"
      ? "text-danger-strong"
      : c.status === "soon"
        ? "text-warning-strong"
        : "text-foreground";

  return (
    <li
      className={cn(
        "relative flex flex-col gap-2.5 border-b border-border px-3 py-3 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover md:py-2",
        GRID,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={p.name} />
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
          >
            {p.name}
          </button>
          <p className="truncate text-sm text-muted-foreground">
            {[p.context, p.group].filter(Boolean).join(", ")}
          </p>
          {balance && balance.tone !== "neutral" && (
            <p className={cn("truncate text-xs font-medium", balance.tone === "success" ? "text-success-strong" : "text-danger-strong")}>
              {balance.text}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {c.status === "none" ? (
          <p className="truncate text-sm text-muted-foreground">{lastContactLabel(c)}</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("truncate font-medium", tone)}>{nextContactLabel(c)}</span>
            </div>
            <CycleTrack derived={{ status: c.status, progress: c.progress }} className="mt-1.5" />
            <p className="mt-1 truncate text-xs text-muted-foreground">{lastContactLabel(c)}</p>
          </>
        )}
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        {b ? formatDate(b.next, "d 'de' MMM") : "–"}
      </p>

      <div className="relative z-10 flex md:w-[10.25rem] md:justify-end">
        <LogContact person={p} />
      </div>
    </li>
  );
}
