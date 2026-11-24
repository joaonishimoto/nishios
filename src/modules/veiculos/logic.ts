import { add } from "date-fns";
import { toISO } from "@/lib/dates";
import { debtSummary, installmentStatus, type DebtSummary, type InstallmentStatus } from "@/lib/financiamento";
import { between, finished, monthOf, monthlyEquivalent, type Occurrence } from "@/modules/financas/logic";
import type { Recurrence } from "@/modules/financas/types";
import type { CostRole, Vehicle } from "./types";

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
