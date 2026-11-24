import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Plus } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/shell/PageHeader";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isOwned, month, paidUntil, situationLabel, totals, wealth } from "./logic";
import { PropertyForm } from "./PropertyForm";
import { useImoveis } from "./store";
import type { Property, Situation } from "./types";

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
  const t = totals(properties);
  const anyNumbers = t.value > 0 || t.net !== 0;

  return (
    <>
      <PageHeader
        title="Imóveis"
        description="Casas e apartamentos: os seus, os que você aluga para alguém e onde você mora de aluguel."
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

      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong p-4 text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="size-5" />
            <span className="font-medium">Adicionar imóvel</span>
            <span className="text-sm">Apartamento, casa, terreno ou sala</span>
          </button>
        </li>
      </ul>

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

function PropertyCard({ property: p }: { property: Property }) {
  const w = wealth(p);
  const m = month(p);
  const f = p.financing;
  const paid = f ? paidUntil(f) : 0;
  return (
    <Link
      to={`/imoveis/${p.id}`}
      className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:bg-surface-hover"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-muted text-xl">{p.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="truncate text-sm text-muted-foreground">{p.address || (p.plan ? "Com planta em 3D" : "Sem endereço")}</p>
        </div>
        {p.plan && (
          <span title="Tem planta em 3D" className="text-muted-foreground">
            <Box className="size-4" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={SITUATION_TONE[p.situation]}>{situationLabel(p.situation)}</Badge>
        {f && isOwned(p) && <Badge>{paid >= f.total ? "Quitado" : `Financiado, ${paid} de ${f.total}`}</Badge>}
      </div>
      {f && isOwned(p) && f.total > 0 && paid < f.total && (
        <Progress value={paid / f.total} label={`Parcelas pagas de ${p.name}`} className="h-1.5" />
      )}
      <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
        {isOwned(p) ? (
          <div>
            <dt className="text-muted-foreground">{w.debt > 0 ? "Já é meu" : "Valor"}</dt>
            <dd className="font-medium tabular-nums">{w.value ? money(Math.round(w.debt > 0 ? w.equity : w.value)) : "Sem valor"}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-muted-foreground">{p.situation === "vendido" ? "Vendido por" : "Aluguel"}</dt>
            <dd className="font-medium tabular-nums">
              {p.situation === "vendido" ? (p.soldPrice ? money(p.soldPrice) : "Sem valor") : p.lease?.rent ? money(p.lease.rent) : "Sem valor"}
            </dd>
          </div>
        )}
        {p.situation !== "vendido" && (
          <div>
            <dt className="text-muted-foreground">Por mês</dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                m.net > 0 && "text-success-strong",
              )}
            >
              {m.ins.length + m.outs.length === 0 ? "Sem custos" : money(Math.round(m.net))}
            </dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
