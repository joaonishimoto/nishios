import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, ShoppingBag } from "lucide-react";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { shortDate, today } from "@/lib/dates";
import { money } from "@/lib/format";
import { useBens } from "@/modules/bens/store";
import { forecast, installmentLabel, leftLabel, monthLabel, monthOf, shiftMonth, shortMonth, summarize, type Occurrence } from "./logic";
import { useFinancas } from "./store";
import type { Flow } from "./types";

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function ForecastTab({ onNew, onOpen }: { onNew: (kind: Flow) => void; onOpen: (id: string) => void }) {
  const { recurrences } = useFinancas();
  const { wishes } = useBens();
  const now = today();
  const thisMonth = monthOf(now);
  const [month, setMonth] = useState(thisMonth);
  const s = useMemo(() => summarize(recurrences, month, wishes), [recurrences, month, wishes]);
  const year = useMemo(() => forecast(recurrences, thisMonth, 12, wishes), [recurrences, thisMonth, wishes]);
  const avg = year.reduce((n, m) => n + m.leftAfter, 0) / year.length;
  const tightest = [...year].sort((a, b) => a.leftAfter - b.leftAfter)[0];

  if (recurrences.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhuma recorrência ainda"
        description="Comece pelo salário e pelos fixos que você tem certeza: aluguel, contas, assinaturas. A previsão do mês sai disso."
        action={
          <Button onClick={() => onNew("in")}>
            <Plus />
            Adicionar o salário
          </Button>
        }
        secondaryAction={
          <Button variant="outline" onClick={() => onNew("out")}>
            Adicionar uma saída
          </Button>
        }
      />
    );
  }

  const past = month < thisMonth;
  const label = monthLabel(month, now.getFullYear());

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft />
          </Button>
          <h2 className="min-w-0 text-xl font-semibold tracking-tight first-letter:uppercase">{label}</h2>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight />
          </Button>
          {month !== thisMonth && (
            <Button variant="outline" size="sm" className="ml-1" onClick={() => setMonth(thisMonth)}>
              Este mês
            </Button>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Entra" value={money(s.income)} tone="in" />
          <Stat label="Sai (fixos)" value={money(s.expenses)} />
          <Stat label="Vai para investimentos" value={money(s.invested)} />
          <Stat
            label={past ? "Sobrou" : "Sobra prevista"}
            value={money(s.leftAfter)}
            tone={s.leftAfter >= 0 ? "in" : "out"}
            hint={s.invested > 0 ? `${money(s.leftBefore)} antes de investir` : undefined}
          />
        </dl>
        {s.plannedTotal > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <ShoppingBag className="mt-0.5 size-4 shrink-0" />
            <span>
              Compras planejadas na <Link to="/bens?aba=desejos" className="font-medium text-primary hover:underline">lista de desejos</Link> para
              este mês: {money(s.plannedTotal)}. Se comprar, {lowerFirst(leftLabel(s.leftAfter - s.plannedTotal))}.
            </span>
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-base font-semibold">Sobra nos próximos 12 meses</h2>
          <p className="text-sm text-muted-foreground">
            Média de {money(Math.round(avg))} por mês
            {tightest && tightest.leftAfter < avg * 0.6 && (
              <>
                . Mais apertado: {monthLabel(tightest.month, now.getFullYear())}, {lowerFirst(leftLabel(tightest.leftAfter))}
              </>
            )}
          </p>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-surface p-4">
          <BarChart
            label="Sobra prevista depois dos aportes, mês a mês"
            bars={year.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.leftAfter, title: monthLabel(m.month) }))}
            selected={month}
            onSelect={setMonth}
            format={money}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold first-letter:uppercase">O que entra e sai em {label}</h2>
        {s.items.length === 0 && s.planned.length === 0 ? (
          <EmptyState size="sm" title="Nada previsto neste mês" description="Nenhuma recorrência cai aqui." className="mt-3" />
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
            {s.items.map((o) => (
              <OccurrenceRow key={o.rec.id} occurrence={o} month={month} onOpen={() => onOpen(o.rec.id)} />
            ))}
            {s.planned.map((p) => (
              <li key={p.wish.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                <span className="flex size-[1.125rem] shrink-0" />
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">{p.wish.icon}</span>
                <div className="min-w-0 flex-1">
                  <Link to="/bens?aba=desejos" className="block truncate font-medium hover:underline">
                    {p.wish.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">Compra planejada, {shortDate(p.date)}. Não entra na sobra.</p>
                </div>
                <span className="shrink-0 font-medium text-muted-foreground tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "in" | "out"; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-xl font-semibold tabular-nums",
          tone === "in" && "text-success-strong",
          tone === "out" && "text-danger-strong",
        )}
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OccurrenceRow({ occurrence: o, month, onOpen }: { occurrence: Occurrence; month: string; onOpen: () => void }) {
  const { markMonth, recurrences } = useFinancas();
  const r = o.rec;
  const mark = recurrences.find((x) => x.id === r.id)?.months?.[month];
  const parts = [
    shortDate(o.date),
    r.category,
    installmentLabel(r, month),
    o.adjusted ? `previsto ${money(r.amount)}` : r.approx ? "valor aproximado" : null,
  ].filter(Boolean);
  const verb = r.kind === "in" ? "Entrou" : "Saiu";

  return (
    <li className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover">
      <Checkbox
        checked={o.done}
        label={`${verb}: ${r.name}`}
        onChange={(done) => markMonth(r.id, month, { ...mark, done: done || undefined })}
      />
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">{r.icon}</span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className={cn("block max-w-full truncate text-left font-medium after:absolute after:inset-0", o.done && "text-muted-foreground")}
        >
          {r.name}
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {o.done ? `${verb}. ` : ""}
          {parts.join(" · ")}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-right font-medium tabular-nums",
          r.kind === "in" && "text-success-strong",
        )}
      >
        {r.kind === "in" ? "+" : "−"}
        {money(o.amount)}
      </span>
      <AdjustAmount occurrence={o} month={month} />
    </li>
  );
}

/** Ajusta o valor só deste mês (a conta de luz que veio maior). */
function AdjustAmount({ occurrence: o, month }: { occurrence: Occurrence; month: string }) {
  const { markMonth, recurrences } = useFinancas();
  const mark = recurrences.find((x) => x.id === o.rec.id)?.months?.[month];
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(undefined);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = value ?? 0;
    markMonth(o.rec.id, month, { ...mark, amount: n === o.rec.amount ? undefined : n });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setValue(o.amount);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative z-10 size-7" aria-label={`Ajustar o valor de ${o.rec.name} neste mês`}>
          <Pencil />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Valor deste mês (R$)" hint={`Previsto: ${money(o.rec.amount)}. Os outros meses não mudam.`}>
            {(id) => (
              <MoneyInput id={id} value={value} autoFocus onValueChange={setValue} />
            )}
          </Field>
          <div className="flex gap-2">
            {o.adjusted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  markMonth(o.rec.id, month, { ...mark, amount: undefined });
                  setOpen(false);
                }}
              >
                Voltar ao previsto
              </Button>
            )}
            <Button type="submit" size="sm" className="ml-auto h-8">
              Salvar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
