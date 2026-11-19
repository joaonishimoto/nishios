import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PiggyBank, Plus, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { LineChart, type ChartPoint } from "@/components/ui/LineChart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { money, shortMoney } from "@/lib/format";
import { goalProgress } from "@/modules/rotina/logic";
import { useRoutine } from "@/modules/rotina/store";
import type { Goal } from "@/modules/rotina/types";
import { balance, lastChange, lastUpdate, monthlyContribution, monthOf, reachDate, totalInvested, typeLabel } from "./logic";
import { useFinancas } from "./store";
import type { Investment } from "./types";

/** Soma dos saldos em cada data em que algum investimento foi atualizado. */
export function totalHistory(list: Investment[]): ChartPoint[] {
  const dates = [...new Set(list.flatMap((i) => i.history.map((p) => p.date)))].sort();
  return dates.map((date) => ({
    date,
    value: list.reduce((n, i) => n + ([...i.history].reverse().find((p) => p.date <= date)?.balance ?? 0), 0),
  }));
}

export function InvestmentsTab({ onNew, onOpen }: { onNew: () => void; onOpen: (id: string) => void }) {
  const { investments, recurrences } = useFinancas();
  const { goals } = useRoutine();
  const [chart, setChart] = useState<string>("total");
  const month = monthOf(today());
  const total = totalInvested(investments);
  const totalPerMonth = investments.reduce((n, i) => n + monthlyContribution(recurrences, i.id, month), 0);
  const totalGoal = goals.find((g) => g.link?.kind === "investimentos");

  const points = useMemo(() => {
    if (chart === "total") return totalHistory(investments);
    const inv = investments.find((i) => i.id === chart);
    return inv ? inv.history.map((p) => ({ date: p.date, value: p.balance })) : [];
  }, [chart, investments]);
  const chartGoal =
    chart === "total" ? totalGoal : goals.find((g) => g.link?.kind === "investimento" && g.link.investmentId === chart);

  if (investments.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Nenhum investimento ainda"
        description="Comece pela reserva de emergência. Você informa o saldo de hoje e atualiza quando quiser."
        action={
          <Button onClick={onNew}>
            <Plus />
            Novo investimento
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">Total investido</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{money(total)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {totalPerMonth > 0 ? `${money(Math.round(totalPerMonth))} de aportes recorrentes por mês` : "Sem aportes recorrentes cadastrados"}
        </p>
        {totalGoal && <GoalLine goal={totalGoal} current={total} perMonth={totalPerMonth} />}
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {investments.map((inv) => (
          <InvestmentCard
            key={inv.id}
            inv={inv}
            perMonth={monthlyContribution(recurrences, inv.id, month)}
            goal={goals.find((g) => g.link?.kind === "investimento" && g.link.investmentId === inv.id)}
            onOpen={() => onOpen(inv.id)}
          />
        ))}
      </ul>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Evolução</h2>
          <Segmented<string>
            label="Qual evolução mostrar"
            value={chart}
            onChange={setChart}
            options={[{ value: "total", label: "Total" }, ...investments.map((i) => ({ value: i.id, label: i.name }))]}
          />
        </div>
        <div className="mt-3 rounded-lg border border-border bg-surface p-4">
          {points.length < 2 ? (
            <EmptyState
              size="sm"
              title="Ainda sem evolução"
              description="Atualize o saldo de vez em quando, uma vez por mês já basta, e a linha aparece aqui."
            />
          ) : (
            <LineChart
              points={points}
              label="Saldo ao longo do tempo"
              format={money}
              axisFormat={shortMoney}
              target={chartGoal ? { value: chartGoal.target, label: `Meta: ${money(chartGoal.target)}` } : undefined}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function GoalLine({ goal, current, perMonth }: { goal: Goal; current: number; perMonth: number }) {
  const reach = reachDate(current, goal.target, perMonth, today());
  const progress = goalProgress({ ...goal, current });
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2 text-sm">
        <Target className="size-4 shrink-0 text-muted-foreground" />
        <Link to={`/rotina?meta=${goal.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
          {goal.name}
        </Link>
        <span className="font-semibold tabular-nums">{Math.round(progress * 100)}%</span>
      </div>
      <Progress value={progress} done={progress >= 1} label={`Progresso de ${goal.name}`} className="mt-2 h-1.5" />
      <p className="mt-1.5 text-sm text-muted-foreground">
        {progress >= 1
          ? "Meta alcançada."
          : `Faltam ${money(Math.max(0, goal.target - current))}.` +
            (reach
              ? ` No ritmo dos aportes, chega lá em ${formatDate(reach.date, "MMMM 'de' yyyy")}.`
              : " Cadastre um aporte recorrente para ver quando chega.")}
      </p>
    </div>
  );
}

function InvestmentCard({ inv, perMonth, goal, onOpen }: { inv: Investment; perMonth: number; goal?: Goal; onOpen: () => void }) {
  const change = lastChange(inv);
  const updated = lastUpdate(inv);
  const detail = [typeLabel(inv), inv.institution].filter(Boolean).join(" · ");
  return (
    <li className="relative min-w-0 rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xl">{inv.icon}</span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0">
            {inv.name}
          </button>
          <p className="truncate text-sm text-muted-foreground">{detail}</p>
        </div>
        <UpdateBalance inv={inv} />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{money(balance(inv))}</p>
      <p className="text-sm text-muted-foreground">
        {change !== null && change !== 0 && (
          <span className={cn("font-medium", change > 0 ? "text-success-strong" : "text-danger-strong")}>
            {change > 0 ? "+" : "−"}
            {money(Math.abs(change))}{" "}
          </span>
        )}
        {updated ? `Atualizado em ${shortDate(updated)}` : "Sem saldo informado"}
        {perMonth > 0 && ` · aporte de ${money(Math.round(perMonth))}/mês`}
      </p>
      {goal && <GoalLine goal={goal} current={balance(inv)} perMonth={perMonth} />}
    </li>
  );
}

/** Pede só o número de hoje e guarda no histórico. */
function UpdateBalance({ inv }: { inv: Investment }) {
  const { setBalance, updateInvestment } = useFinancas();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const max = toISO(today());
  const [date, setDate] = useState(max);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n < 0 || !date) return;
    const before = inv.history;
    setBalance(inv.id, date, n);
    setOpen(false);
    toast({
      message: `Saldo de ${inv.name} atualizado`,
      action: { label: "Desfazer", onClick: () => updateInvestment(inv.id, { history: before }) },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setValue(String(balance(inv) || ""));
          setDate(max);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative z-10">
          <RefreshCw />
          Atualizar saldo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Saldo (R$)">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={value}
                autoFocus
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </Field>
          <Field label="Em que dia">
            {(id) => <Input id={id} type="date" placeholder="Hoje" max={max} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Salvar saldo
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
