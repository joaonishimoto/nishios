import { lazy, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Car, Plus } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, today } from "@/lib/dates";
import { modeLabel, monthYear } from "@/lib/financiamento";
import { money, plural } from "@/lib/format";
import { useFinancas } from "@/modules/financas/store";
import { subtitle, totals, view, type VehicleView } from "./logic";
import { useVeiculos } from "./store";
import { VehicleForm } from "./VehicleForm";
import { isMobi } from "./mobi3d/match";

const Mobi3D = lazy(() => import("./mobi3d/Mobi3D"));

/** Lista dos veículos: quanto valem, quanto falta pagar e o que vence nos próximos meses. */
export function VeiculosPage() {
  const { vehicles } = useVeiculos();
  const { recurrences } = useFinancas();
  const [params, setParams] = useSearchParams();
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
  const editing = vehicles.find((v) => v.id === params.get("v"));
  const open = (id: string) => setParams({ v: id }, { replace: true });
  const close = () => setParams({}, { replace: true });
  const in3d = vehicles.find((v) => v.id === params.get("3d") && isMobi(v));

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

          <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((v) => (
              <li key={v.vehicle.id} className="relative min-w-0">
                <VehicleCard view={v} onOpen={() => open(v.vehicle.id)} />
                {isMobi(v.vehicle) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-4 right-4"
                    onClick={() => setParams({ "3d": v.vehicle.id }, { replace: true })}
                  >
                    <Box />
                    Ver em 3D
                  </Button>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong p-4 text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover hover:text-foreground"
              >
                <Plus className="size-5" />
                <span className="font-medium">Adicionar veículo</span>
                <span className="text-sm">Carro, moto, caminhonete...</span>
              </button>
            </li>
          </ul>

          {sold.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">Vendidos</h2>
              <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
                {sold.map(({ vehicle: s }) => (
                  <li key={s.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => open(s.id)}
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

      <VehicleForm open={creating} onOpenChange={setCreating} />
      <VehicleForm open={!!editing} onOpenChange={(o) => !o && close()} vehicle={editing} />
      <Dialog
        open={!!in3d}
        onOpenChange={(o) => !o && close()}
        title={in3d?.name ?? "Veículo em 3D"}
        description={in3d ? subtitle(in3d) : undefined}
        className="max-w-4xl"
      >
        <DialogBody>
          {in3d && (
            <Suspense fallback={<p className="grid h-[min(52dvh,420px)] sm:h-[min(72dvh,600px)] place-items-center text-sm text-muted-foreground">Montando o carro...</p>}>
              <Mobi3D color={in3d.color} plate={in3d.plate} className="h-[min(52dvh,420px)] sm:h-[min(72dvh,600px)]" />
            </Suspense>
          )}
        </DialogBody>
      </Dialog>
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

const ROLE_LABEL: Record<string, string> = {
  parcela: "Parcela",
  ipva: "IPVA",
  seguro: "Seguro",
  licenciamento: "Licenciamento",
};

function VehicleCard({ view: w, onOpen }: { view: VehicleView; onOpen: () => void }) {
  const { vehicle: v, installments: inst, debt } = w;
  const acq = v.acquisition;
  const financed = acq.mode !== "cash";
  const paidOff = financed && inst && inst.left === 0 && !acq.payoff;
  const tone: Tone = !financed || paidOff ? "success" : "info";
  const now = today();
  const soon = w.upcoming.filter((o) => o.rec.link?.role !== "parcela").slice(0, 3);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover"
    >
      <div className="flex w-full items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-muted text-xl">{v.icon}</span>
        <div className={cn("min-w-0 flex-1", isMobi(v) && "pr-28")}>
          <p className="truncate font-semibold">{v.name}</p>
          <p className="truncate text-sm text-muted-foreground">{subtitle(v) || "Sem modelo nem placa"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone={tone}>
          {!financed ? "Quitado" : paidOff ? `${modeLabel(acq.mode)} quitado` : modeLabel(acq.mode)}
        </Badge>
        {acq.mode === "consortium" && <Badge tone={acq.contemplated ? "success" : "warning"}>{acq.contemplated ? "Contemplado" : "Não contemplado"}</Badge>}
        {v.km ? <Badge>{v.km.toLocaleString("pt-BR")} km</Badge> : null}
      </div>

      {financed && inst && inst.left > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          <Progress value={inst.progress} label={`Parcelas pagas de ${v.name}`} className="h-1.5" />
          <p className="text-sm text-muted-foreground">
            {inst.paid} de {inst.total} parcelas de {money(w.parcela!.amount)} · termina em {monthYear(inst.last)}
          </p>
        </div>
      )}

      <dl className="grid w-full grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Vale hoje</dt>
          <dd className="font-medium tabular-nums">{v.marketValue ? money(Math.round(v.marketValue)) : "Sem valor"}</dd>
        </div>
        {debt.owed > 0 ? (
          <div>
            <dt className="text-muted-foreground">{debt.informed ? "Saldo para quitar" : "Falta pagar"}</dt>
            <dd className="font-medium tabular-nums text-warning-strong">{money(Math.round(debt.owed))}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-muted-foreground">Custo por mês</dt>
            <dd className="font-medium tabular-nums">{w.monthlyCost ? money(Math.round(w.monthlyCost)) : "Sem custos"}</dd>
          </div>
        )}
      </dl>

      {soon.length > 0 && (
        <ul className="mt-auto flex w-full flex-col gap-1 border-t border-border pt-3 text-sm">
          {soon.map((o) => {
            const days = Math.round((new Date(`${o.date}T00:00`).getTime() - now.getTime()) / 86_400_000);
            return (
              <li key={o.rec.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {o.rec.icon} {ROLE_LABEL[o.rec.link?.role ?? ""] ?? o.rec.name.replace(/ \([^)]*\)$/, "")}{" "}
                  <span className="text-muted-foreground">{money(o.amount)}</span>
                </span>
                <span className={cn("shrink-0", days <= 15 ? "font-medium text-warning-strong" : "text-muted-foreground")}>
                  {days === 0 ? "vence hoje" : shortDate(o.date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </button>
  );
}
