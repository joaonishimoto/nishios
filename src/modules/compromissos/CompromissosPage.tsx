import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, ChevronDown, Plus, Search } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, NoResults } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { CommitmentForm } from "./CommitmentForm";
import { CommitmentPanel } from "./CommitmentPanel";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { MarkDone } from "./MarkDone";
import {
  byUrgency,
  derive,
  dueLabel,
  isOneOff,
  periodLabel,
  shortDate,
  sinceLabel,
  STATUS_META,
  STATUS_ORDER,
} from "./logic";
import { useCommitments } from "./store";
import { usePets } from "@/modules/pets/store";
import type { Commitment, Status } from "./types";

type Filter = "all" | Status;

/* Uma grade só para cabeçalho e linhas, para as colunas alinharem entre os grupos. */
const GRID =
  "md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-center md:gap-x-5";

export function CompromissosPage() {
  const { commitments } = useCommitments();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set());

  const openId = params.get("c");
  const openCommitment = commitments.find((c) => c.id === openId);
  const open = (id: string | null) =>
    setParams(id ? { c: id } : {}, { replace: !id, preventScrollReset: true });

  const counts = useMemo(() => {
    const n: Record<Status, number> = { overdue: 0, soon: 0, ok: 0, never: 0, done: 0 };
    for (const c of commitments) n[derive(c).status]++;
    return n;
  }, [commitments]);

  const categories = useMemo(
    () => [...new Set(commitments.map((c) => c.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [commitments],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const visible = commitments
      .filter((c) => category === "all" || c.category === category)
      .filter((c) => !q || c.name.toLocaleLowerCase("pt-BR").includes(q))
      .sort((a, b) => byUrgency(a, b));
    return STATUS_ORDER.filter((s) => filter === "all" || filter === s)
      .map((status) => ({ status, items: visible.filter((c) => derive(c).status === status) }))
      .filter((g) => g.items.length > 0);
  }, [commitments, category, query, filter]);

  const toggle = (s: Status) =>
    setCollapsed((set) => {
      const next = new Set(set);
      if (!next.delete(s)) next.add(s);
      return next;
    });

  const filtering = filter !== "all" || category !== "all" || query.trim() !== "";

  return (
    <>
      <PageHeader
        title="Compromissos"
        description="O que se repete de tempos em tempos e o que é pontual: quando foi a última vez e quando é a próxima."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Novo compromisso
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          label="Filtrar por situação"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todos", count: commitments.length },
            { value: "overdue", label: "Atrasados", count: counts.overdue },
            { value: "soon", label: "Próximos", count: counts.soon },
            { value: "ok", label: "Em dia", count: counts.ok },
            ...(counts.done > 0
              ? [{ value: "done" as const, label: "Concluídos", count: counts.done }]
              : []),
          ]}
        />
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          <Select
            aria-label="Filtrar por categoria"
            className="sm:w-52"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <div className="relative w-full sm:w-52">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar compromisso"
              placeholder="Buscar compromissos"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {groups.length === 0 ? (
          commitments.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nenhum compromisso ainda"
              description="Comece por algo simples, como o corte de cabelo ou a consulta no dentista."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus />
                  Novo compromisso
                </Button>
              }
            />
          ) : (
            <NoResults
              query={query}
              onClear={
                filtering
                  ? () => {
                      setFilter("all");
                      setCategory("all");
                      setQuery("");
                    }
                  : undefined
              }
            />
          )
        ) : (
          <>
            <div
              aria-hidden
              className={cn(
                "hidden border-b border-border px-3 pb-2 text-sm text-muted-foreground",
                GRID,
              )}
            >
              <span>Compromisso</span>
              <span>Última vez</span>
              <span>Repete</span>
              <span>Próxima</span>
              <span className="w-[9.5rem]" />
            </div>
            <div className="flex flex-col gap-5 pt-4">
              {groups.map(({ status, items }) => {
                const meta = STATUS_META[status];
                const isCollapsed = collapsed.has(status);
                return (
                  <section key={status}>
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggle(status)}
                      className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm font-semibold hover:bg-surface-hover"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 text-subtle-foreground transition-transform duration-(--motion-fast)",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                      <Dot tone={meta.tone} />
                      {meta.group}
                      <span className="font-normal text-subtle-foreground tabular-nums">
                        {items.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <ul className="mt-1.5 overflow-hidden rounded-lg border border-border bg-surface">
                        {items.map((c) => (
                          <Row key={c.id} commitment={c} onOpen={() => open(c.id)} />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <CommitmentForm open={creating} onOpenChange={setCreating} />
      <CommitmentPanel commitment={openCommitment} onClose={() => open(null)} />
    </>
  );
}

function Row({ commitment: c, onOpen }: { commitment: Commitment; onOpen: () => void }) {
  const d = derive(c);
  const pet = usePets().pets.find((p) => p.id === c.petId);
  const dueTone =
    d.status === "overdue"
      ? "text-danger-strong"
      : d.status === "soon"
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
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">
          {c.icon}
        </span>
        <div className="min-w-0">
          {/* O botão cobre a linha inteira; as ações ficam por cima dele. */}
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
          >
            {c.name}
          </button>
          <p className="truncate text-sm text-muted-foreground">
            {c.category}
            {pet && `, ${pet.icon} ${pet.name}`}
          </p>
        </div>
      </div>

      <div className="hidden text-sm md:block">
        <p>{isOneOff(c) && !d.lastDone ? "—" : sinceLabel(d.daysSince)}</p>
        {d.lastDone && <p className="text-muted-foreground">{shortDate(d.lastDone)}</p>}
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">{periodLabel(c)}</p>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className={cn("truncate font-medium", dueTone)}>{dueLabel(d)}</span>
          {d.nextDue && <span className="shrink-0 text-muted-foreground">{shortDate(d.nextDue)}</span>}
        </div>
        <CycleTrack derived={d} className="mt-1.5" />
      </div>

      <div className="relative z-10 flex md:w-[9.5rem] md:justify-end">
        {d.status !== "done" && <MarkDone commitment={c} />}
      </div>
    </li>
  );
}
