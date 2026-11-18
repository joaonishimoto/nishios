import { useMemo, useState } from "react";
import { ChevronDown, Plus, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { today } from "@/lib/dates";
import { money } from "@/lib/format";
import { useBens } from "@/modules/bens/store";
import { everyLabel, finished, installmentLabel, monthlyEquivalent, monthOf, yearlyCost } from "./logic";
import { useFinancas } from "./store";
import { IN_CATEGORIES, OUT_CATEGORIES, type Flow, type Recurrence } from "./types";

function groupByCategory(list: Recurrence[], order: string[]) {
  const cats = [...new Set(list.map((r) => r.category))].sort(
    (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b, "pt-BR"),
  );
  return cats.map((c) => ({
    category: c,
    items: list.filter((r) => r.category === c).sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a)),
  }));
}

export function RecurrencesTab({ onNew, onOpen }: { onNew: (kind: Flow) => void; onOpen: (id: string) => void }) {
  const { recurrences } = useFinancas();
  const month = monthOf(today());
  const [showEnded, setShowEnded] = useState(false);
  const live = useMemo(() => recurrences.filter((r) => !finished(r, month)), [recurrences, month]);
  const ended = recurrences.filter((r) => finished(r, month));
  const ins = live.filter((r) => r.kind === "in");
  const outs = live.filter((r) => r.kind === "out");
  const fixed = outs.filter((r) => !r.investmentId);
  const invest = outs.filter((r) => r.investmentId);
  const subs = fixed.filter((r) => r.category === "Assinaturas");
  const sum = (list: Recurrence[], f: (r: Recurrence) => number) => list.reduce((n, r) => n + f(r), 0);

  if (recurrences.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhuma recorrência ainda"
        description="Cadastre uma vez o que entra e sai com certeza. Depois é só conferir quando quiser."
        action={
          <Button onClick={() => onNew("out")}>
            <Plus />
            Nova recorrência
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Entradas por mês" value={sum(ins, monthlyEquivalent)} />
        <Total label="Fixos por mês" value={sum(fixed, monthlyEquivalent)} hint={`${money(Math.round(sum(fixed, yearlyCost)))} no ano`} />
        <Total label="Aportes por mês" value={sum(invest, monthlyEquivalent)} />
        <Total label="Assinaturas no ano" value={sum(subs, yearlyCost)} hint={`${subs.length} ${subs.length === 1 ? "assinatura" : "assinaturas"}`} />
      </dl>

      <FlowSection title="Entradas" kind="in" list={ins} order={IN_CATEGORIES} onNew={onNew} onOpen={onOpen} />
      <FlowSection title="Saídas" kind="out" list={outs} order={OUT_CATEGORIES} onNew={onNew} onOpen={onOpen} />

      {ended.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowEnded((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showEnded}
          >
            <ChevronDown className={cn("size-4 transition-transform", !showEnded && "-rotate-90")} />
            Encerradas
            <span className="font-normal text-subtle-foreground tabular-nums">{ended.length}</span>
          </button>
          {showEnded && (
            <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
              {ended.map((r) => (
                <RecurrenceRow key={r.id} rec={r} month={month} onOpen={() => onOpen(r.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Total({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-xl font-semibold tabular-nums">{money(Math.round(value))}</dd>
      {hint && <p className="mt-0.5 truncate text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FlowSection({
  title,
  kind,
  list,
  order,
  onNew,
  onOpen,
}: {
  title: string;
  kind: Flow;
  list: Recurrence[];
  order: string[];
  onNew: (kind: Flow) => void;
  onOpen: (id: string) => void;
}) {
  const month = monthOf(today());
  const groups = groupByCategory(list, order);
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Button variant="ghost" size="sm" onClick={() => onNew(kind)}>
          <Plus />
          {kind === "in" ? "Nova entrada" : "Nova saída"}
        </Button>
      </div>
      {groups.length === 0 ? (
        <EmptyState
          size="sm"
          frame="solid"
          className="mt-3"
          title={kind === "in" ? "Nenhuma entrada" : "Nenhuma saída"}
          description={kind === "in" ? "Salário, freela fixo, aluguel que você recebe." : "Aluguel, contas, assinaturas, parcelas."}
        />
      ) : (
        <div className="mt-3 flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.category}>
              <h3 className="flex items-baseline gap-2 px-1 text-sm font-semibold">
                {g.category}
                <span className="font-normal text-subtle-foreground tabular-nums">{g.items.length}</span>
                <span className="ml-auto pr-2 font-medium tabular-nums">
                  {money(Math.round(g.items.reduce((n, r) => n + monthlyEquivalent(r), 0)))}/mês
                </span>
              </h3>
              <ul className="mt-1.5 overflow-hidden rounded-lg border border-border bg-surface">
                {g.items.map((r) => (
                  <RecurrenceRow key={r.id} rec={r} month={month} onOpen={() => onOpen(r.id)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecurrenceRow({ rec: r, month, onOpen }: { rec: Recurrence; month: string; onOpen: () => void }) {
  const { investments } = useFinancas();
  const { assets } = useBens();
  const inv = r.investmentId ? investments.find((i) => i.id === r.investmentId) : undefined;
  const asset = r.assetId ? assets.find((a) => a.id === r.assetId) : undefined;
  const detail = [everyLabel(r), installmentLabel(r, month), inv && `Aporte em ${inv.name}`, asset && asset.name].filter(Boolean).join(" · ");
  return (
    <li className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">{r.icon}</span>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0">
          {r.name}
        </button>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      {r.approx && (
        <Badge className="hidden sm:inline-flex">Aproximado</Badge>
      )}
      <div className="shrink-0 text-right">
        <p className={cn("font-medium tabular-nums", r.kind === "in" && "text-success-strong")}>
          {money(r.amount)}
        </p>
        {r.every > 1 && <p className="text-sm text-muted-foreground tabular-nums">{money(Math.round(monthlyEquivalent(r)))}/mês</p>}
      </div>
    </li>
  );
}
