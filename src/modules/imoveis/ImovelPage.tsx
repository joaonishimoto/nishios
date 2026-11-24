import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Banknote, Check, KeyRound, Landmark, LineChart as ChartIcon, Pencil, Plus, RefreshCw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { LineChart } from "@/components/ui/LineChart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { money, shortMoney } from "@/lib/format";
import { PlanView } from "@/modules/casa/CasaPage";
import { useFinancas } from "@/modules/financas/store";
import { flowPlans } from "./finance";
import { SITUATION_TONE } from "./ImoveisPage";
import {
  appreciation,
  currentValue,
  debt,
  isOwned,
  lastDue,
  lastValueDate,
  month,
  nextDue,
  paidUntil,
  paysRent,
  receivesRent,
  remaining,
  rentYield,
  situationLabel,
  wealth,
} from "./logic";
import { PropertyForm } from "./PropertyForm";
import { useImoveis } from "./store";
import { PROPERTY_KINDS, type Property } from "./types";

type Tab = "planta" | "resumo";

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const area = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function ImovelPage() {
  const { id = "" } = useParams();
  const { get } = useImoveis();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const property = get(id);
  if (!property) return <Navigate to="/imoveis" replace />;

  const tab: Tab = property.plan && params.get("aba") !== "resumo" ? "planta" : "resumo";
  const pickTab = (t: Tab) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("aba", t);
        return next;
      },
      { replace: true },
    );
  const kind = PROPERTY_KINDS.find((k) => k.value === property.kind)?.label ?? "Imóvel";

  return (
    <>
      {params.get("tela") !== "cheia" && (
        <>
          <Link
            to="/imoveis"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Imóveis
          </Link>
          <header className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-muted text-2xl">{property.icon}</span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{property.name}</h1>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <Badge tone={SITUATION_TONE[property.situation]}>{situationLabel(property.situation)}</Badge>
                  <span>
                    {kind}
                    {property.area > 0 && `, ${area.format(property.area)} m²`}
                    {property.address && `, ${property.address}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {property.plan && (
                <Segmented<Tab>
                  label="O que ver"
                  value={tab}
                  onChange={pickTab}
                  options={[
                    { value: "planta", label: "Planta em 3D" },
                    { value: "resumo", label: "Finanças do imóvel" },
                  ]}
                />
              )}
              <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
                <Pencil />
                Editar
              </Button>
            </div>
          </header>
        </>
      )}

      <div className="mt-6">{tab === "planta" ? <PlanView name={property.name} /> : <Summary property={property} onEdit={() => setEditing(true)} />}</div>

      <PropertyForm open={editing} onOpenChange={setEditing} property={property} />
    </>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "up" && "text-success-strong", tone === "down" && "text-danger-strong")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Card({ icon: Icon, title, action, children }: { icon: typeof Wallet; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right tabular-nums", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}

function Summary({ property: p, onEdit }: { property: Property; onEdit: () => void }) {
  const owned = isOwned(p);
  const w = wealth(p);
  const m = month(p);
  const gain = appreciation(p);
  const y = rentYield(p);
  const blank = !owned ? !p.lease?.rent && p.situation !== "vendido" : w.value === 0 && !p.financing && m.outs.length === 0;

  if (blank) {
    return (
      <EmptyState
        icon={Wallet}
        title="Ainda sem números deste imóvel"
        description={
          owned
            ? "Coloque quanto ele vale, o financiamento (se tiver) e os custos. Se alugar para alguém, mude a situação e coloque o aluguel."
            : "Coloque o valor do aluguel e os custos que você paga."
        }
        action={
          <Button onClick={onEdit}>
            <Pencil />
            Colocar os números
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {p.situation === "vendido" ? (
          <>
            <Kpi label="Vendido por" value={p.soldPrice ? money(p.soldPrice) : "Sem valor"} hint={p.soldDate ? formatDate(p.soldDate) : undefined} />
            <Kpi
              label="Ganho na venda"
              value={p.soldPrice && p.purchasePrice ? money(p.soldPrice - p.purchasePrice) : "Sem dados"}
              hint="Venda menos o preço de compra"
            />
          </>
        ) : owned ? (
          <>
            <Kpi
              label="Valor patrimonial"
              value={w.value ? money(Math.round(w.value)) : "Sem valor"}
              hint={gain ? `${gain.amount >= 0 ? "+" : ""}${pct.format(gain.pct)}% desde a compra` : lastValueDate(p) ? `Em ${shortDate(lastValueDate(p))}` : undefined}
            />
            <Kpi label="Ainda devo" value={money(Math.round(w.debt))} hint={p.financing ? (w.debt === 0 ? "Quitado" : "Saldo devedor") : "Sem financiamento"} />
            <Kpi label="Já é meu" value={money(Math.round(w.equity))} hint={w.value > 0 ? `${pct.format(Math.max(0, (w.equity / w.value) * 100))}% do imóvel` : undefined} />
          </>
        ) : (
          <Kpi label="Aluguel" value={p.lease?.rent ? money(p.lease.rent) : "Sem valor"} hint={p.lease?.who || undefined} />
        )}
        {p.situation !== "vendido" && (
          <Kpi
            label="Por mês"
            value={money(Math.round(m.net))}
            hint={y !== null ? `Rende ${pct.format(y)}% ao ano sobre o valor` : m.net < 0 ? "Sai do bolso" : "Entra no bolso"}
            tone={m.net > 0 ? "up" : m.net < 0 ? "down" : undefined}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {p.financing && owned && <FinancingCard property={p} />}
        {p.lease && (receivesRent(p) || paysRent(p)) && <LeaseCard property={p} />}
        {p.situation !== "vendido" && <MonthCard property={p} />}
        {p.situation !== "aluguel" && <ValueCard property={p} />}
        <FinanceLinkCard property={p} />
      </div>

      {p.notes && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-semibold">Anotações</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{p.notes}</p>
        </section>
      )}
    </div>
  );
}

function FinancingCard({ property: p }: { property: Property }) {
  const { update } = useImoveis();
  const toast = useToast();
  const f = p.financing!;
  const paid = paidUntil(f);
  const left = remaining(f);
  const next = nextDue(f);
  const last = lastDue(f);
  const d = debt(f);
  const [balance, setBalance] = useState("");

  function saveBalance(e: FormEvent) {
    e.preventDefault();
    const v = Number(balance);
    if (!(v > 0)) return;
    update(p.id, { financing: { ...f, balance: v, balanceAsOf: toISO(today()) } });
    setBalance("");
    toast({ message: "Saldo devedor atualizado" });
  }

  return (
    <Card
      icon={Landmark}
      title={f.lender ? `Financiamento, ${f.lender}` : "Financiamento"}
      action={
        left > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost">
                <RefreshCw />
                Saldo do extrato
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <form onSubmit={saveBalance} className="flex flex-col gap-3">
                <Field label="Saldo devedor hoje (R$)" hint="Está no extrato ou no app do banco.">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      autoFocus
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                    />
                  )}
                </Field>
                <Button type="submit" size="sm">
                  Salvar
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        )
      }
    >
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{left === 0 ? "Quitado" : `${paid} de ${f.total} parcelas pagas`}</span>
        <span className="tabular-nums text-muted-foreground">{f.total ? `${Math.round((paid / f.total) * 100)}%` : ""}</span>
      </div>
      <Progress value={f.total ? paid / f.total : 0} done={left === 0} label="Parcelas pagas" className="mt-2 h-2" />
      <dl className="mt-3">
        <Row label="Prestação" value={money(f.installment)} />
        {left > 0 && <Row label="Faltam" value={`${left} ${left === 1 ? "parcela" : "parcelas"}${last ? `, até ${formatDate(last, "MMM 'de' yyyy")}` : ""}`} />}
        {next && <Row label="Próxima" value={shortDate(next)} />}
        {left > 0 && <Row label="Ainda falta pagar, somando parcelas" value={money(Math.round(f.installment * left))} />}
        <Row label="Saldo devedor" value={money(Math.round(d.value))} strong />
        {f.rate !== undefined && <Row label="Juros" value={`${pct.format(f.rate)}% ao ano${f.system ? `, ${f.system === "sac" ? "SAC" : "Price"}` : ""}`} />}
      </dl>
      <p className="mt-2 text-sm text-muted-foreground">{d.source}</p>
    </Card>
  );
}

function LeaseCard({ property: p }: { property: Property }) {
  const l = p.lease!;
  const gets = receivesRent(p);
  const y = rentYield(p);
  const ends = l.end ? l.end : "";
  const endingSoon = ends && ends >= toISO(today()) && (new Date(ends).getTime() - today().getTime()) / 86_400_000 <= 90;
  return (
    <Card icon={KeyRound} title={gets ? "Aluguel que recebo" : "Aluguel que pago"}>
      <dl>
        <Row label="Valor" value={money(l.rent)} strong />
        <Row label="Vence" value={`Todo dia ${l.dueDay}`} />
        {l.who && <Row label={gets ? "Inquilino" : "Proprietário"} value={l.who} />}
        {l.fee ? <Row label="Imobiliária" value={`${pct.format(l.fee)}%, ${money(Math.round((l.rent * l.fee) / 100))} por mês`} /> : null}
        {(l.start || l.end) && (
          <Row
            label="Contrato"
            value={`${l.start ? shortDate(l.start) : "?"} a ${l.end ? shortDate(l.end) : "sem fim"}`}
          />
        )}
        {l.index && <Row label="Reajuste" value={l.index} />}
        {gets && <Row label="No ano" value={money(l.rent * 12)} />}
        {y !== null && <Row label="Rende sobre o valor" value={`${pct.format(y)}% ao ano`} />}
      </dl>
      {endingSoon && (
        <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
          O contrato acaba em {shortDate(ends)}. Vale conversar sobre a renovação e o reajuste.
        </p>
      )}
    </Card>
  );
}

function MonthCard({ property: p }: { property: Property }) {
  const m = month(p);
  if (m.ins.length + m.outs.length === 0) {
    return (
      <Card icon={Banknote} title="Mês a mês">
        <EmptyState size="sm" title="Sem entradas nem custos" description="Coloque aluguel, prestação ou custos em Editar." />
      </Card>
    );
  }
  return (
    <Card icon={Banknote} title="Mês a mês">
      <dl>
        {m.ins.map((l) => (
          <Row key={l.label} label={l.label} value={<span className="text-success-strong">+ {money(Math.round(l.amount))}</span>} />
        ))}
        {m.outs.map((l) => (
          <Row key={l.label} label={l.label} value={`− ${money(Math.round(l.amount))}`} />
        ))}
        <div className="mt-2 border-t border-border pt-2">
          <Row
            label={m.net >= 0 ? "Sobra por mês" : "Sai do bolso por mês"}
            value={<span className={cn(m.net > 0 && "text-success-strong")}>{money(Math.round(Math.abs(m.net)))}</span>}
            strong
          />
        </div>
      </dl>
    </Card>
  );
}

function ValueCard({ property: p }: { property: Property }) {
  const { update } = useImoveis();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(toISO(today()));
  const points = [
    ...(p.purchasePrice && p.purchaseDate ? [{ date: p.purchaseDate, value: p.purchasePrice }] : []),
    ...p.values,
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((pt, i, all) => all.findIndex((x) => x.date === pt.date) === i);

  function save(e: FormEvent) {
    e.preventDefault();
    const v = Number(value);
    if (!(v > 0) || !date) return;
    update(p.id, { values: [...p.values.filter((x) => x.date !== date), { date, value: v }] });
    setValue("");
    toast({ message: `Valor de ${money(v)} registrado` });
  }

  return (
    <Card
      icon={ChartIcon}
      title="Valor ao longo do tempo"
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost">
              <Plus />
              Nova avaliação
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <form onSubmit={save} className="flex flex-col gap-3">
              <Field label="Quanto vale (R$)">
                {(id) => (
                  <Input id={id} type="number" min={0} step="1" inputMode="decimal" placeholder="Ex.: 420000" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
                )}
              </Field>
              <Field label="Em">
                {(id) => <Input id={id} type="date" placeholder="Hoje" max={toISO(today())} value={date} onChange={(e) => setDate(e.target.value)} />}
              </Field>
              <Button type="submit" size="sm">
                Registrar
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      }
    >
      {points.length < 2 ? (
        <EmptyState
          size="sm"
          title={currentValue(p) ? `Vale ${money(currentValue(p))} hoje` : "Ainda sem valor"}
          description="Registre uma avaliação de vez em quando (uma por ano já basta) e a linha aparece aqui."
        />
      ) : (
        <LineChart points={points} label="Valor do imóvel" format={money} axisFormat={shortMoney} />
      )}
    </Card>
  );
}

function FinanceLinkCard({ property: p }: { property: Property }) {
  const { recurrences, createRecurrence, updateRecurrence } = useFinancas();
  const toast = useToast();
  const plans = flowPlans(p, recurrences);
  if (plans.length === 0) return null;
  const missing = plans.filter((x) => !x.existing);

  const launch = (list = missing) => {
    list.forEach((x) => createRecurrence(x.draft));
    toast({ message: list.length === 1 ? `${list[0].draft.name} entrou em Finanças` : `${list.length} lançamentos entraram em Finanças` });
  };

  return (
    <Card
      icon={Wallet}
      title="Em Finanças"
      action={
        missing.length > 1 && (
          <Button size="sm" variant="ghost" onClick={() => launch()}>
            <Plus />
            Lançar tudo
          </Button>
        )
      }
    >
      <p className="mb-2 text-sm text-muted-foreground">
        Lançados em Finanças, entram na previsão do mês e você confirma quando pagar ou receber.
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {plans.map((x) => (
          <li key={x.flow} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{x.label}</span>
              <span className="block text-muted-foreground tabular-nums">
                {x.draft.kind === "in" ? "Entra" : "Sai"} {money(x.draft.amount)} por mês
                {x.draft.times ? `, ${x.draft.times}x` : ""}
              </span>
            </span>
            {!x.existing ? (
              <Button size="sm" variant="outline" onClick={() => launch([x])}>
                <Plus />
                Lançar
              </Button>
            ) : x.outdated ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const { propertyId: _a, propertyFlow: _b, ...rest } = x.draft;
                  updateRecurrence(x.existing!.id, { ...rest, name: x.existing!.name, icon: x.existing!.icon, category: x.existing!.category, notes: x.existing!.notes, first: x.existing!.first, businessDay: x.existing!.businessDay, times: x.draft.times, kind: x.draft.kind });
                  toast({ message: `Valor de ${x.existing!.name} atualizado em Finanças` });
                }}
              >
                <RefreshCw />
                Atualizar de {money(x.existing.amount)}
              </Button>
            ) : (
              <Link to={`/financas?r=${x.existing.id}`} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                <Check className="size-4" />
                Em Finanças
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
