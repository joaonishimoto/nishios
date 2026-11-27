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
import { PropertyMini } from "./PropertyMini";
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

      <section
        aria-label="Seus imóveis"
        className="mt-6 overflow-hidden rounded-xl border border-border bg-[linear-gradient(to_bottom,var(--color-surface)_0%,var(--color-surface-muted)_100%)]"
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <li key={p.id} className={LOT}>
              <PropertyLot property={p} />
            </li>
          ))}
          <li className={LOT}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="group flex h-full min-h-60 w-full flex-col items-center justify-center gap-1 px-5 py-6 text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover/60 hover:text-foreground"
            >
              <span className="grid size-12 place-items-center rounded-full border border-dashed border-border-strong transition-transform duration-300 group-hover:scale-110">
                <Plus className="size-5" />
              </span>
              <span className="mt-2 font-medium">Lote vago</span>
              <span className="text-sm">Adicionar apartamento, casa, terreno ou sala</span>
            </button>
          </li>
        </ul>
      </section>

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

/** Divisória tracejada entre os lotes, como as vagas da garagem. */
const LOT =
  "border-b border-dashed border-border-strong sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0";

/** Um imóvel em miniatura; tocar abre os detalhes. */
function PropertyLot({ property: p }: { property: Property }) {
  const w = wealth(p);
  const m = month(p);
  const f = p.financing;
  const paid = f ? paidUntil(f) : 0;
  const financing = f && isOwned(p) && f.total > 0 && paid < f.total;
  const main = isOwned(p)
    ? w.value
      ? `${w.debt > 0 ? "Já é meu" : "Vale"} ${money(Math.round(w.debt > 0 ? w.equity : w.value))}`
      : null
    : p.situation === "vendido"
      ? p.soldPrice
        ? `Vendido por ${money(p.soldPrice)}`
        : null
      : p.lease?.rent
        ? `Aluguel ${money(p.lease.rent)}`
        : null;
  const hasMonth = p.situation !== "vendido" && m.ins.length + m.outs.length + m.bills.length > 0;
  return (
    <Link
      to={`/imoveis/${p.id}`}
      className="group flex h-full w-full flex-col items-center gap-2 px-5 pt-6 pb-5 text-center transition-colors duration-(--motion-fast) hover:bg-surface-hover/60 focus-visible:bg-surface-hover/60"
    >
      <PropertyMini kind={p.kind} situation={p.situation} className="h-32 w-full max-w-64" />
      <span className="mt-1 flex items-center gap-1.5">
        <span className="font-semibold">{p.name}</span>
        {p.plan && (
          <span title="Tem planta em 3D" className="text-muted-foreground">
            <Box className="size-4" />
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-sm text-muted-foreground">{p.address || "Toque para ver os detalhes"}</span>
      <span className="flex flex-wrap justify-center gap-1.5">
        <Badge tone={SITUATION_TONE[p.situation]}>{situationLabel(p.situation)}</Badge>
        {f && isOwned(p) && paid >= f.total && <Badge tone="success">Quitado</Badge>}
        {financing && <Badge>{`${paid}/${f.total} parcelas`}</Badge>}
      </span>
      {(main || hasMonth) && (
        <span className="text-sm tabular-nums text-muted-foreground">
          {main}
          {main && hasMonth ? " · " : ""}
          {hasMonth && (
            <span className={cn(m.net > 0 && "text-success-strong")}>
              {m.net > 0 ? "+" : ""}
              {money(Math.round(m.net))}/mês
            </span>
          )}
        </span>
      )}
      {financing && <Progress value={paid / f.total} label={`Parcelas pagas de ${p.name}`} className="mt-1 h-1 w-40" />}
    </Link>
  );
}
