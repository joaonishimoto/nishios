import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, today } from "@/lib/dates";
import { modeLabel, monthYear } from "@/lib/financiamento";
import { money, plural } from "@/lib/format";
import { useFinancas } from "@/modules/financas/store";
import { EventForm } from "./EventForm";
import { daysSince, lastOf, logTotals, oilStatus, sortedLog, subtitle, view } from "./logic";
import { isMobi } from "./mobi3d/match";
import { useVeiculos } from "./store";
import { EVENT_KINDS, type EventKind, type VehicleEvent } from "./types";
import { VehicleForm } from "./VehicleForm";
import { VehicleMini } from "./VehicleMini";

const Mobi3D = lazy(() => import("./mobi3d/Mobi3D"));

const ROLE_LABEL: Record<string, string> = { parcela: "Parcela", ipva: "IPVA", seguro: "Seguro", licenciamento: "Licenciamento" };
const km = (n: number) => `${n.toLocaleString("pt-BR")} km`;

/** Tudo de um veículo: o carro em destaque, quanto vale e quanto falta, vencimentos e o diário. */
export function VeiculoPage() {
  const { id = "" } = useParams();
  const { vehicles } = useVeiculos();
  const { recurrences } = useFinancas();
  const [editing, setEditing] = useState(false);
  const [logForm, setLogForm] = useState<{ open: boolean; event?: VehicleEvent; kind?: EventKind }>({ open: false });
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const vehicle = vehicles.find((v) => v.id === id);
  const now = today();
  const w = useMemo(() => (vehicle ? view(vehicle, recurrences, now) : null), [vehicle, recurrences]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!vehicle || !w) return <Navigate to="/veiculos" replace />;

  const acq = vehicle.acquisition;
  const financed = acq.mode !== "cash";
  const inst = w.installments;
  const paidOff = financed && inst && inst.left === 0 && !acq.payoff;
  const tone: Tone = vehicle.sold ? "neutral" : !financed || paidOff ? "success" : "info";
  const log = sortedLog(vehicle);
  const kindsInLog = EVENT_KINDS.filter((k) => log.some((e) => e.kind === k.value));
  const shown = filter === "all" ? log : log.filter((e) => e.kind === filter);
  const totals = logTotals(vehicle, now);
  const oil = oilStatus(vehicle, now);
  const tyres = lastOf(vehicle, "pneus");
  const wash = lastOf(vehicle, "lavagem");
  const add = (kind?: EventKind) => setLogForm({ open: true, kind });

  return (
    <>
      <Link to="/veiculos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Veículos
      </Link>

      <section className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-[radial-gradient(120%_90%_at_50%_70%,var(--color-surface),var(--color-surface-muted))]">
          {isMobi(vehicle) ? (
            <Suspense fallback={<VehicleMini kind={vehicle.kind} color={vehicle.color} className="mx-auto my-10 h-48 w-full max-w-md" />}>
              <Mobi3D color={vehicle.color} plate={vehicle.plate} className="h-[min(48dvh,380px)] p-3" />
            </Suspense>
          ) : (
            <VehicleMini kind={vehicle.kind} color={vehicle.color} className="mx-auto my-10 h-48 w-full max-w-md px-6" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{vehicle.name}</h1>
              <p className="mt-0.5 text-muted-foreground">{subtitle(vehicle) || "Sem modelo nem placa"}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              Editar
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone={tone}>
              {vehicle.sold ? "Vendido" : !financed ? "Quitado" : paidOff ? `${modeLabel(acq.mode)} quitado` : modeLabel(acq.mode)}
            </Badge>
            {acq.mode === "consortium" && !vehicle.sold && (
              <Badge tone={acq.contemplated ? "success" : "warning"}>{acq.contemplated ? "Contemplado" : "Não contemplado"}</Badge>
            )}
            {vehicle.km ? <Badge>{km(vehicle.km)}</Badge> : null}
            {vehicle.color ? <Badge>{vehicle.color}</Badge> : null}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="Vale hoje" value={vehicle.marketValue ? money(Math.round(vehicle.marketValue)) : "Sem valor"} hint={vehicle.marketValueDate ? `Em ${shortDate(vehicle.marketValueDate)}` : undefined} />
            {vehicle.sold ? (
              <Stat label="Vendido por" value={money(vehicle.sold.price)} hint={formatDate(vehicle.sold.date)} />
            ) : (
              <Stat
                label={w.debt.informed ? "Saldo para quitar" : "Falta pagar"}
                value={money(Math.round(w.debt.owed))}
                tone={w.debt.owed > 0 ? "warn" : undefined}
              />
            )}
            {!vehicle.sold && <Stat label="Já é meu" value={money(Math.round(w.equity))} />}
            {!vehicle.sold && <Stat label="Custo por mês" value={money(Math.round(w.monthlyCost))} hint="Parcela e custos fixos" />}
          </dl>
          {financed && inst && inst.left > 0 && !vehicle.sold && (
            <div className="mt-4 flex flex-col gap-1.5">
              <Progress value={inst.progress} label="Parcelas pagas" />
              <p className="text-sm text-muted-foreground">
                {inst.paid} de {inst.total} parcelas de {money(w.parcela!.amount)}
                {acq.lender ? ` (${acq.lender})` : ""} · termina em {monthYear(inst.last)}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Cuidados</h2>
          <Button onClick={() => add()}>
            <Plus />
            Registrar
          </Button>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Care
            kind="oleo"
            onAdd={add}
            value={oil.last ? shortDate(oil.last.date) : "Sem registro"}
            hint={
              oil.last
                ? oil.overdue
                  ? "Passou da hora de trocar"
                  : oil.kmLeft !== undefined
                    ? `Próxima em ${km(Math.max(0, oil.kmLeft))} ou ${shortDate(oil.dueDate!)}`
                    : `Próxima até ${shortDate(oil.dueDate!)}`
                : "A cada 10 mil km ou 1 ano"
            }
            warn={oil.overdue}
          />
          <Care kind="pneus" onAdd={add} value={tyres ? shortDate(tyres.date) : "Sem registro"} hint={tyres ? tyres.title || "Último serviço" : "Troca, rodízio, alinhamento"} />
          <Care
            kind="lavagem"
            onAdd={add}
            value={wash ? (daysSince(wash.date, now) === 0 ? "Hoje" : `Há ${plural(daysSince(wash.date, now), "dia", "dias")}`) : "Sem registro"}
            hint={wash ? shortDate(wash.date) : "Última lavagem"}
          />
          <Care
            kind="modificacao"
            onAdd={add}
            value={totals.modCount ? money(totals.mods) : "Original"}
            hint={totals.modCount ? `${plural(totals.modCount, "modificação", "modificações")}` : "Som, rodas, película..."}
          />
          <Care
            kind="batida"
            onAdd={add}
            value={totals.crashCount ? money(totals.crashes) : "Nenhuma"}
            hint={totals.crashCount ? `${plural(totals.crashCount, "batida", "batidas")} registradas` : "Que continue assim"}
          />
          <Care
            kind="multa"
            onAdd={add}
            value={totals.fineCount ? money(totals.fines) : "Nenhuma"}
            hint={
              totals.fineCount
                ? [`${totals.points12m} pontos em 12 meses`, totals.finesOpen ? `${totals.finesOpen} a pagar` : ""].filter(Boolean).join(" · ")
                : "Sem multas"
            }
            warn={totals.finesOpen > 0}
          />
        </ul>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Diário</h2>
              {totals.spent12m > 0 && <p className="text-sm text-muted-foreground">{money(totals.spent12m)} gastos nos últimos 12 meses</p>}
            </div>
            {kindsInLog.length > 1 && (
              <Segmented<EventKind | "all">
                label="Filtrar o diário"
                value={filter}
                onChange={setFilter}
                options={[{ value: "all", label: "Tudo" }, ...kindsInLog.map((k) => ({ value: k.value, label: k.label }))]}
              />
            )}
          </div>
          {log.length === 0 ? (
            <EmptyState
              className="mt-3"
              title="Nada registrado ainda"
              description="Troca de óleo, pneus, lavagens, batidas e multas ficam aqui, com data, km e quanto custou."
              action={
                <Button onClick={() => add()}>
                  <Plus />
                  Registrar o primeiro
                </Button>
              }
            />
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {shown.map((e) => {
                const k = EVENT_KINDS.find((x) => x.value === e.kind)!;
                return (
                  <li key={e.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setLogForm({ open: true, event: e })}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-hover"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted text-lg">{k.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{e.title || k.label}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {[
                            formatDate(e.date),
                            e.km ? km(e.km) : "",
                            e.kind === "multa" && e.points ? `${e.points} pontos` : "",
                            e.kind === "multa" ? (e.covered ? "paga" : "a pagar") : "",
                            e.kind === "batida" && e.covered ? "pelo seguro" : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className={cn("shrink-0 tabular-nums", e.kind === "multa" && !e.covered && "text-warning-strong")}>
                        {e.cost ? money(e.cost) : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Próximos vencimentos</h2>
          {w.upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {vehicle.sold ? "Vendido, sem custos daqui para a frente." : "Nenhum custo cadastrado. Em Editar, coloque parcela, IPVA, seguro e licenciamento."}
            </p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {w.upcoming.map((o) => {
                const days = daysSince(o.date, now) * -1;
                return (
                  <li key={o.rec.id} className="border-b border-border last:border-b-0">
                    <Link to={`/financas?r=${o.rec.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover">
                      <span className="text-lg">{o.rec.icon}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {ROLE_LABEL[o.rec.link?.role ?? ""] ?? o.rec.name.replace(/ \([^)]*\)$/, "")}{" "}
                        <span className="text-muted-foreground">{money(o.amount)}</span>
                      </span>
                      <span className={cn("shrink-0 text-sm", days <= 15 ? "font-medium text-warning-strong" : "text-muted-foreground")}>
                        {days === 0 ? "vence hoje" : shortDate(o.date)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {(vehicle.insurer || vehicle.notes) && (
            <div className="mt-6 flex flex-col gap-3 text-sm">
              {vehicle.insurer && (
                <p>
                  <span className="text-muted-foreground">Seguradora: </span>
                  {vehicle.insurer}
                </p>
              )}
              {vehicle.notes && <p className="whitespace-pre-line text-muted-foreground">{vehicle.notes}</p>}
            </div>
          )}
        </section>
      </div>

      <VehicleForm open={editing} onOpenChange={setEditing} vehicle={vehicle} />
      <EventForm vehicle={vehicle} event={logForm.event} kind={logForm.kind} open={logForm.open} onOpenChange={(o) => setLogForm((s) => ({ ...s, open: o }))} />
    </>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", tone === "warn" && "text-warning-strong")}>{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function Care({ kind, value, hint, warn, onAdd }: { kind: EventKind; value: ReactNode; hint: string; warn?: boolean; onAdd: (k: EventKind) => void }) {
  const k = EVENT_KINDS.find((x) => x.value === kind)!;
  return (
    <li className={cn("relative rounded-lg border bg-surface p-3", warn ? "border-warning" : "border-border")}>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden>{k.icon}</span>
        {k.label}
      </p>
      <p className={cn("mt-1 font-semibold tabular-nums", warn && "text-warning-strong")}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <button
        type="button"
        onClick={() => onAdd(kind)}
        aria-label={`Registrar ${k.label.toLowerCase()}`}
        className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </li>
  );
}
