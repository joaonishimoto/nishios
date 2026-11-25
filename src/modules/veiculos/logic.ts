import { add, differenceInCalendarDays, parseISO } from "date-fns";
import { toISO } from "@/lib/dates";
import { debtSummary, installmentStatus, type DebtSummary, type InstallmentStatus } from "@/lib/financiamento";
import { between, finished, monthOf, monthlyEquivalent, type Occurrence } from "@/modules/financas/logic";
import type { Recurrence } from "@/modules/financas/types";
import type { CostRole, EventKind, Vehicle, VehicleEvent } from "./types";

export const MODULE = "veiculos" as const;

/** As recorrências de Finanças que pertencem a um veículo. */
export const linkedTo = (recs: Recurrence[], id: string) =>
  recs.filter((r) => r.link?.module === MODULE && r.link.id === id);

export const withRole = (recs: Recurrence[], role: CostRole) => recs.filter((r) => r.link?.role === role);

/** Próximo vencimento de uma recorrência a partir de hoje (até dois anos). */
export function nextDue(r: Recurrence, now: Date): Occurrence | null {
  return between([r], toISO(now), toISO(add(now, { years: 2 }))).find((o) => !o.done) ?? null;
}

export interface VehicleView {
  vehicle: Vehicle;
  recs: Recurrence[];
  parcela?: Recurrence;
  installments: InstallmentStatus | null;
  debt: DebtSummary;
  /** Valor de mercado menos o que falta pagar. */
  equity: number;
  /** Quanto o veículo custa por mês, em média: parcela + custos fixos divididos pelos meses. */
  monthlyCost: number;
  /** Os próximos vencimentos de cada custo, do mais perto ao mais longe. */
  upcoming: Occurrence[];
}

export function view(vehicle: Vehicle, all: Recurrence[], now: Date): VehicleView {
  const recs = linkedTo(all, vehicle.id);
  const parcela = withRole(recs, "parcela")[0];
  const installments = parcela ? installmentStatus(parcela, now) : null;
  const debt = vehicle.sold ? { owed: 0, informed: false, invested: 0 } : debtSummary(vehicle.acquisition, installments);
  const month = monthOf(now);
  const running = vehicle.sold ? [] : recs.filter((r) => !finished(r, month));
  return {
    vehicle,
    recs,
    parcela,
    installments,
    debt,
    equity: vehicle.sold ? 0 : vehicle.marketValue - debt.owed,
    monthlyCost: running.reduce((n, r) => n + monthlyEquivalent(r), 0),
    upcoming: running
      .map((r) => nextDue(r, now))
      .filter((o): o is Occurrence => !!o)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export interface Totals {
  value: number;
  owed: number;
  equity: number;
  monthlyCost: number;
}

export function totals(views: VehicleView[]): Totals {
  const active = views.filter((v) => !v.vehicle.sold);
  return {
    value: active.reduce((n, v) => n + v.vehicle.marketValue, 0),
    owed: active.reduce((n, v) => n + v.debt.owed, 0),
    equity: active.reduce((n, v) => n + v.equity, 0),
    monthlyCost: active.reduce((n, v) => n + v.monthlyCost, 0),
  };
}

/** "Honda Civic 2020 · ABC-1D23" */
export function subtitle(v: Vehicle): string {
  const model = [v.brand, v.model, v.year].filter(Boolean).join(" ");
  return [model, v.plate.toUpperCase()].filter(Boolean).join(" · ");
}

/** Quantas vezes a recorrência venceu até a data (inclusive): usado para encerrar custos na venda. */
export const timesUntil = (r: Recurrence, date: string) => (r.first > date ? 0 : between([r], r.first, date).length);

/* ---------------- Diário do carro ---------------- */

/** Do mais recente ao mais antigo. */
export const sortedLog = (v: Vehicle): VehicleEvent[] =>
  [...(v.log ?? [])].sort((a, b) => b.date.localeCompare(a.date) || (b.km ?? 0) - (a.km ?? 0));

export const lastOf = (v: Vehicle, kind: EventKind): VehicleEvent | undefined => sortedLog(v).find((e) => e.kind === kind);

/** Troca de óleo: a cada 10 mil km ou 12 meses, o que vier primeiro (o padrão da maioria dos manuais). */
export const OIL_KM = 10_000;
export const OIL_MONTHS = 12;

export interface OilStatus {
  last?: VehicleEvent;
  /** Data limite pela regra do tempo. */
  dueDate?: string;
  /** Km limite pela regra da quilometragem. */
  dueKm?: number;
  /** Quantos km faltam, se a km atual é conhecida. */
  kmLeft?: number;
  overdue: boolean;
}

export function oilStatus(v: Vehicle, now: Date): OilStatus {
  const last = lastOf(v, "oleo");
  if (!last) return { overdue: false };
  const dueDate = toISO(add(parseISO(last.date), { months: OIL_MONTHS }));
  const dueKm = last.km ? last.km + OIL_KM : undefined;
  const kmLeft = dueKm && v.km ? dueKm - v.km : undefined;
  return { last, dueDate, dueKm, kmLeft, overdue: dueDate < toISO(now) || (kmLeft !== undefined && kmLeft <= 0) };
}

export const daysSince = (iso: string, now: Date) => differenceInCalendarDays(now, parseISO(iso));

export interface LogTotals {
  /** Gasto com batidas (o que saiu do bolso). */
  crashes: number;
  crashCount: number;
  fines: number;
  fineCount: number;
  /** Multas ainda não pagas. */
  finesOpen: number;
  /** Pontos na carteira nos últimos 12 meses. */
  points12m: number;
  /** Investido em modificações (som, rodas, película...). */
  mods: number;
  modCount: number;
  /** Tudo o que foi gasto com o carro no diário nos últimos 12 meses. */
  spent12m: number;
}

export function logTotals(v: Vehicle, now: Date): LogTotals {
  const log = v.log ?? [];
  const yearAgo = toISO(add(now, { years: -1 }));
  const crashes = log.filter((e) => e.kind === "batida");
  const fines = log.filter((e) => e.kind === "multa");
  const mods = log.filter((e) => e.kind === "modificacao");
  return {
    mods: mods.reduce((n, e) => n + e.cost, 0),
    modCount: mods.length,
    crashes: crashes.reduce((n, e) => n + e.cost, 0),
    crashCount: crashes.length,
    fines: fines.reduce((n, e) => n + e.cost, 0),
    fineCount: fines.length,
    finesOpen: fines.filter((e) => !e.covered).length,
    points12m: fines.filter((e) => e.date >= yearAgo).reduce((n, e) => n + (e.points ?? 0), 0),
    spent12m: log.filter((e) => e.date >= yearAgo).reduce((n, e) => n + e.cost, 0),
  };
}
