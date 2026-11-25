import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Car, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/shell/PageHeader";
import { formatDate, shortDate, today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { useFinancas } from "@/modules/financas/store";
import { subtitle, totals, view, type VehicleView } from "./logic";
import { useVeiculos } from "./store";
import { VehicleForm } from "./VehicleForm";
import { VehiclePicture } from "./VehiclePicture";

/** Lista dos veículos: quanto valem, quanto falta pagar e o que vence nos próximos meses. */
export function VeiculosPage() {
  const { vehicles } = useVeiculos();
  const { recurrences } = useFinancas();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const now = today();

  const views = useMemo(
    () =>
      vehicles
        .map((v) => view(v, recurrences, now))
        .sort(
          (a, b) =>
            Number(!!a.vehicle.sold) - Number(!!b.vehicle.sold) ||
            b.vehicle.marketValue - a.vehicle.marketValue ||
            a.vehicle.name.localeCompare(b.vehicle.name, "pt-BR"),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, recurrences],
  );
  const t = totals(views);
  const active = views.filter((v) => !v.vehicle.sold);
  const sold = views.filter((v) => v.vehicle.sold);
  const navigate = useNavigate();
  const openDetail = (id: string) => navigate(`/veiculos/${id}`);
  // Links antigos (?v=<id>) abrem a página do veículo.
  const legacy = params.get("v") ?? params.get("3d");
  if (legacy && vehicles.some((v) => v.id === legacy)) return <Navigate to={`/veiculos/${legacy}`} replace />;

  return (
    <>
      <PageHeader
        title="Veículos"
        description={
          active.length === 0
            ? "Carros, motos e o que mais tiver: quanto vale, financiamento ou consórcio, IPVA e seguro."
            : `${plural(active.length, "veículo", "veículos")} valendo ${money(Math.round(t.value))}` +
              (t.owed > 0 ? `, com ${money(Math.round(t.owed))} ainda a pagar.` : ", todos quitados.")
        }
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Novo veículo
          </Button>
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Car}
          title="Nenhum veículo ainda"
          description="Cadastre o carro ou a moto com o valor de hoje e a forma de pagamento. Parcela, IPVA, seguro e licenciamento entram sozinhos em Finanças, com aviso antes de vencer."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Adicionar veículo
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Valor dos veículos" value={money(Math.round(t.value))} hint="Tabela FIPE ou avaliação" />
            <Kpi label="Ainda devo" value={money(Math.round(t.owed))} hint="Financiamentos e consórcios" />
            <Kpi label="Já é meu" value={money(Math.round(t.equity))} hint="Valor menos o que devo" />
            <Kpi label="Custo por mês" value={money(Math.round(t.monthlyCost))} hint="Parcelas e custos fixos, em média" />
          </div>

          <Garage views={active} onOpen={openDetail} onAdd={() => setCreating(true)} />

          {sold.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">Vendidos</h2>
              <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
                {sold.map(({ vehicle: s }) => (
                  <li key={s.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openDetail(s.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover"
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {s.name} <span className="text-muted-foreground">· {subtitle(s)}</span>
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {s.sold!.price ? `${money(s.sold!.price)} em ` : "Em "}
                        {formatDate(s.sold!.date, "MMM 'de' yyyy")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <VehicleForm open={creating} onOpenChange={setCreating} onCreated={(v) => openDetail(v.id)} />
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/** A garagem: cada veículo em miniatura numa vaga. Passar o mouse liga o carro; clicar abre os detalhes. */
function Garage({ views, onOpen, onAdd }: { views: VehicleView[]; onOpen: (id: string) => void; onAdd: () => void }) {
  const now = today();
  return (
    <section aria-label="Garagem" className="mt-6 overflow-hidden rounded-xl border border-border bg-[linear-gradient(to_bottom,var(--color-surface)_0%,var(--color-surface-muted)_100%)]">
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {views.map((w) => {
          const v = w.vehicle;
          const inst = w.installments;
          const next = w.upcoming.find((o) => o.rec.link?.role !== "parcela");
          const soon = next && daysUntil(next.date, now) <= 15;
          return (
            <li key={v.id} className="border-b border-dashed border-border-strong sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0">
              <button
                type="button"
                onClick={() => onOpen(v.id)}
                className="group flex w-full flex-col items-center gap-2 px-5 pt-6 pb-5 text-center transition-colors duration-(--motion-fast) hover:bg-surface-hover/60 focus-visible:bg-surface-hover/60"
              >
                <VehiclePicture vehicle={v} className="h-28 w-full max-w-64" />
                <span className="mt-1 flex items-center gap-2">
                  <span className="font-semibold">{v.name}</span>
                  {v.plate && <Plate text={v.plate} />}
                </span>
                <span className="text-sm text-muted-foreground">{[v.brand, v.model, v.year].filter(Boolean).join(" ") || "Toque para completar"}</span>
                <span className="flex flex-wrap justify-center gap-1.5">
                  {w.debt.owed > 0 ? (
                    <Badge tone="info">
                      {inst && inst.left > 0 ? `${inst.paid}/${inst.total} · ` : ""}falta {money(Math.round(w.debt.owed))}
                    </Badge>
                  ) : (
                    <Badge tone="success">Quitado</Badge>
                  )}
                  {next && (
                    <Badge tone={soon ? "warning" : "neutral"}>
                      {ROLE_LABEL[next.rec.link?.role ?? ""] ?? "Custo"} {shortDate(next.date)}
                    </Badge>
                  )}
                </span>
                {inst && inst.left > 0 && <Progress value={inst.progress} label={`Parcelas pagas de ${v.name}`} className="mt-1 h-1 w-40" />}
              </button>
            </li>
          );
        })}
        <li className="border-b border-dashed border-border-strong">
          <button
            type="button"
            onClick={onAdd}
            className="group flex h-full min-h-56 w-full flex-col items-center justify-center gap-1 px-5 py-6 text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover/60 hover:text-foreground"
          >
            <span className="grid size-12 place-items-center rounded-full border border-dashed border-border-strong transition-transform duration-300 group-hover:scale-110">
              <Plus className="size-5" />
            </span>
            <span className="mt-2 font-medium">Vaga livre</span>
            <span className="text-sm">Adicionar carro, moto, caminhonete...</span>
          </button>
        </li>
      </ul>
    </section>
  );
}

const ROLE_LABEL: Record<string, string> = { ipva: "IPVA", seguro: "Seguro", licenciamento: "Licenciamento" };
const daysUntil = (iso: string, now: Date) => Math.round((new Date(`${iso}T00:00`).getTime() - now.getTime()) / 86_400_000);

/** Placa Mercosul pequena. */
function Plate({ text }: { text: string }) {
  return (
    <span className="inline-flex flex-col overflow-hidden rounded-[3px] border border-neutral-700 bg-white text-neutral-900 shadow-xs">
      <span className="h-1 bg-[#1d3f9b]" />
      <span className="px-1 font-mono text-[0.625rem] leading-3.5 font-bold tracking-wider">{text.toUpperCase()}</span>
    </span>
  );
}
