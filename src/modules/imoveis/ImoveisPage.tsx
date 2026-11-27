import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, differenceInCalendarDays, getDaysInMonth, setDate } from "date-fns";
import { Box, CalendarCheck, CalendarClock, Pencil, Plus } from "lucide-react";
import { AssetAddCard, AssetCard, AssetGrid, type AssetFooter, type AssetStat } from "@/components/assets/AssetCard";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shell/PageHeader";
import { formatDate, shortDate, today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isOwned, lastDue, month, nextDue, paidUntil, paysRent, situationLabel, totals, wealth } from "./logic";
import { PropertyForm } from "./PropertyForm";
import { PropertyMini } from "./PropertyMini";
import { useImoveis } from "./store";
import { PROPERTY_KINDS, type Property, type Situation } from "./types";

export const SITUATION_TONE: Record<Situation, Tone> = {
  mora: "info",
  renda: "success",
  vazio: "warning",
  obra: "neutral",
  aluguel: "neutral",
  vendido: "neutral",
};

/** Lista dos imóveis, com o patrimônio somado e o que eles põem ou tiram por mês. */
export function ImoveisPage() {
  const { properties } = useImoveis();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const t = totals(properties);
  const anyNumbers = t.value > 0 || t.net !== 0;

  return (
    <>
      <PageHeader
        title="Imóveis"
        description="Os seus, os que você aluga e onde mora de aluguel."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Novo imóvel
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Valor dos imóveis" value={money(Math.round(t.value))} hint={`${t.owned} ${t.owned === 1 ? "imóvel seu" : "imóveis seus"}`} />
        <Kpi label="Ainda devo" value={money(Math.round(t.debt))} hint="Saldo dos financiamentos" />
        <Kpi label="Patrimônio líquido" value={money(Math.round(t.equity))} hint="Valor menos o que devo" />
        <Kpi
          label="Resultado por mês"
          value={money(Math.round(t.net))}
          hint={t.rentIn > 0 ? `${money(Math.round(t.rentIn))} de aluguel entrando` : "Aluguel, prestação e custos"}
          tone={t.net > 0 ? "up" : t.net < 0 ? "down" : undefined}
        />
      </div>
      {!anyNumbers && (
        <p className="mt-3 text-sm text-muted-foreground">
          Abra um imóvel e toque em Editar para colocar valor, financiamento e aluguel. Os totais aparecem aqui.
        </p>
      )}

      <AssetGrid label="Seus imóveis">
        {properties.map((p) => (
          <PropertyLot key={p.id} property={p} onEdit={() => setEditing(p.id)} />
        ))}
        <AssetAddCard title="Lote vago" hint="Adicionar apartamento, casa, terreno ou sala" onClick={() => setCreating(true)} />
      </AssetGrid>

      {editing && (
        <PropertyForm
          open
          onOpenChange={(o) => !o && setEditing(null)}
          property={properties.find((p) => p.id === editing)}
        />
      )}
      <PropertyForm open={creating} onOpenChange={setCreating} onCreated={(p) => navigate(`/imoveis/${p.id}`)} />
    </>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "up" && "text-success-strong",
          tone === "down" && "text-danger-strong",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Um imóvel no mesmo card dos veículos; tocar abre os detalhes. */
function PropertyLot({ property: p, onEdit }: { property: Property; onEdit: () => void }) {
  const now = today();
  const w = wealth(p);
  const m = month(p);
  const f = p.financing;
  const owned = isOwned(p);
  const paid = f ? paidUntil(f) : 0;
  const financing = !!f && owned && f.total > 0 && paid < f.total;
  const quitado = !!f && owned && f.total > 0 && paid >= f.total;
  const kind = PROPERTY_KINDS.find((k) => k.value === p.kind)?.label ?? "Imóvel";
  const subtitle =
    [p.name !== kind ? kind : "", p.area ? `${p.area.toLocaleString("pt-BR")} m²` : "", p.address].filter(Boolean).join(" · ") ||
    "Sem endereço nem área ainda";
  const hasMonth = p.situation !== "vendido" && m.ins.length + m.outs.length + m.bills.length > 0;
  const perMonth: AssetStat = !hasMonth
    ? { label: "Por mês", value: "Sem custos", tone: "muted" }
    : m.net > 0
      ? { label: "Rende por mês", value: `+${money(Math.round(m.net))}`, tone: "up" }
      : { label: "Custa por mês", value: money(Math.round(-m.net)) };
  const muted = (label: string, value = "Não informado"): AssetStat => ({ label, value, tone: "muted" });

  const stats: AssetStat[] =
    p.situation === "vendido"
      ? [
          p.soldPrice ? { label: "Vendido por", value: money(p.soldPrice) } : muted("Vendido por"),
          p.soldDate ? { label: "Em", value: formatDate(p.soldDate, "MMM 'de' yyyy") } : muted("Em", "—"),
          p.purchasePrice ? { label: "Comprado por", value: money(p.purchasePrice) } : muted("Comprado por"),
        ]
      : !owned
        ? [
            p.lease?.rent ? { label: "Aluguel", value: money(p.lease.rent) } : muted("Aluguel"),
            p.lease?.end ? { label: "Contrato até", value: formatDate(p.lease.end, "MM/yyyy") } : muted("Contrato até", "—"),
            perMonth,
          ]
        : [
            w.value ? { label: "Vale hoje", value: money(Math.round(w.value)) } : muted("Vale hoje", "Sem valor"),
            w.debt > 0 ? { label: "Falta pagar", value: money(Math.round(w.debt)) } : muted("Falta pagar", "Nada"),
            perMonth,
          ];

  const left = f ? f.total - paid : 0;
  const due = financing ? nextDue(f!) : null;
  const end = financing ? lastDue(f!) : null;
  const rentDay = p.lease?.rent && p.lease.dueDay && p.situation !== "vendido" ? nextDay(p.lease.dueDay, now) : null;
  const footerDate = due ?? rentDay;
  const days = footerDate ? differenceInCalendarDays(footerDate, now) : 0;
  const footer: AssetFooter = due
    ? {
        icon: CalendarClock,
        tone: days <= 5 ? "warning" : "muted",
        text: (
          <>
            <span className="font-medium">Parcela</span> {money(f!.installment)} · {shortDate(due)} ({inDays(days)})
          </>
        ),
      }
    : rentDay
      ? {
          icon: CalendarClock,
          tone: days <= 5 && paysRent(p) ? "warning" : "muted",
          text: (
            <>
              <span className="font-medium">{paysRent(p) ? "Aluguel a pagar" : "Aluguel a receber"}</span> {money(p.lease!.rent)} ·{" "}
              {shortDate(rentDay)} ({inDays(days)})
            </>
          ),
        }
      : quitado
        ? { icon: CalendarCheck, text: "Financiamento quitado" }
        : p.situation === "vendido"
          ? { icon: CalendarCheck, text: "Fica no histórico do patrimônio" }
          : { icon: CalendarCheck, text: "Nenhuma parcela ou aluguel a vencer" };

  return (
    <AssetCard
      to={`/imoveis/${p.id}`}
      actions={[
        ...(p.plan ? [{ label: "Ver 3D", icon: Box, to: `/imoveis/${p.id}?aba=planta` }] : []),
        { label: "Editar", icon: Pencil, onClick: onEdit },
      ]}
      picture={<PropertyMini kind={p.kind} situation={p.situation} className="h-full w-full max-w-64" />}
      title={p.name}
      subtitle={subtitle}
      chips={
        <>
          <Badge tone={SITUATION_TONE[p.situation]}>{situationLabel(p.situation)}</Badge>
          {quitado && <Badge tone="success">Quitado</Badge>}
          {financing && <Badge>{f!.lender ? `Financiado · ${f!.lender}` : "Financiado"}</Badge>}
        </>
      }
      stats={stats}
      progress={
        financing
          ? {
              value: paid / f!.total,
              title: "Parcelas",
              left: `${paid} de ${f!.total} pagas`,
              right: `${plural(left, "falta", "faltam")}${end ? ` · até ${formatDate(end, "MM/yyyy")}` : ""}`,
              ariaLabel: `Parcelas pagas de ${p.name}`,
            }
          : null
      }
      footer={footer}
    />
  );
}

/** Próxima vez que cai o dia do mês, a partir de amanhã (dia 31 vira o último dia do mês). */
function nextDay(day: number, now: Date): Date {
  const at = (d: Date) => setDate(d, Math.min(day, getDaysInMonth(d)));
  const here = at(now);
  return here > now ? here : at(addMonths(now, 1));
}

const inDays = (d: number) => (d <= 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`);
