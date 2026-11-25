import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentCollection } from "@/lib/collection";
import { useFinancas } from "@/modules/financas/store";
import type { RecurrenceDraft } from "@/modules/financas/types";
import { linkedTo, MODULE, timesUntil } from "./logic";
import { FIXED_COSTS, type CostRole, type Vehicle, type VehicleEvent } from "./types";

/** Cada veículo fica numa chave própria: nishios:veiculos:item:<id>. */
const PREFIX = "nishios:veiculos:item";

/** Um custo como aparece no formulário. Sem valor, o custo não existe. */
export interface CostInput {
  /** Recorrência que já existe, para editar em vez de criar. */
  recId?: string;
  name: string;
  amount: number;
  /** Primeiro vencimento (ou o próximo), yyyy-MM-dd. */
  first: string;
  every: number;
  /** Só na parcela: quantas ao todo. */
  times?: number;
}

export interface CostPlan {
  parcela: CostInput | null;
  fixed: Partial<Record<(typeof FIXED_COSTS)[number]["role"], CostInput | null>>;
  others: CostInput[];
}

interface Store {
  vehicles: Vehicle[];
  /**
   * Grava o veículo e cria, altera ou apaga as recorrências dos custos.
   * Vendido, os custos param na data da venda; desfeita a venda, voltam.
   */
  save: (vehicle: Vehicle, plan: CostPlan) => void;
  /** Grava (cria ou substitui) um registro do diário do veículo. */
  saveEvent: (vehicleId: string, event: VehicleEvent) => void;
  removeEvent: (vehicleId: string, eventId: string) => void;
  /** Apaga o veículo e os custos dele. Devolve uma função que desfaz. */
  remove: (id: string) => () => void;
}

const Ctx = createContext<Store | null>(null);

export function VeiculosProvider({ children }: { children: ReactNode }) {
  const { items, put, patch, remove } = usePersistentCollection<Vehicle>(PREFIX);
  const { recurrences, createRecurrence, updateRecurrence, removeRecurrence, restoreRecurrence } = useFinancas();

  const store = useMemo<Store>(() => {
    const draftFor = (v: Vehicle, role: CostRole, c: CostInput, meta: { icon: string; category: string }): RecurrenceDraft => ({
      kind: "out",
      name: role === "custo" ? `${c.name.trim() || "Custo"} (${v.name})` : `${c.name} (${v.name})`,
      icon: meta.icon,
      category: meta.category,
      amount: c.amount,
      every: c.every,
      first: c.first,
      times: c.times,
      link: { module: MODULE, id: v.id, role },
      notes: "",
    });

    return {
      vehicles: items,
      save(vehicle, plan) {
        put(vehicle);
        const current = linkedTo(recurrences, vehicle.id);
        const keep = new Set<string>();
        const upsert = (role: CostRole, c: CostInput | null | undefined, meta: { icon: string; category: string }) => {
          if (!c || !(c.amount > 0) || !c.first) return;
          const existing = c.recId ? current.find((r) => r.id === c.recId) : undefined;
          const draft = draftFor(vehicle, role, c, meta);
          if (vehicle.sold) {
            const n = timesUntil({ ...draft, id: "" }, vehicle.sold.date);
            if (n === 0) return;
            if (!draft.times || draft.times > n) draft.times = n;
          }
          if (existing) {
            updateRecurrence(existing.id, draft);
            keep.add(existing.id);
          } else keep.add(createRecurrence(draft).id);
        };
        upsert("parcela", plan.parcela, {
          icon: vehicle.acquisition.mode === "consortium" ? "🤝" : "🏦",
          category: "Parcelamentos",
        });
        for (const f of FIXED_COSTS) upsert(f.role, plan.fixed[f.role], f);
        for (const o of plan.others) upsert("custo", o, { icon: "🔧", category: "Transporte" });
        for (const r of current) if (!keep.has(r.id)) removeRecurrence(r.id);
      },
      saveEvent(vehicleId, event) {
        patch(vehicleId, (v) => {
          const log = v.log ?? [];
          const next = log.some((e) => e.id === event.id) ? log.map((e) => (e.id === event.id ? event : e)) : [...log, event];
          // Quilometragem nova no diário atualiza a do veículo.
          const km = event.km && event.km > (v.km ?? 0) ? event.km : v.km;
          return { ...v, km, log: next };
        });
      },
      removeEvent(vehicleId, eventId) {
        patch(vehicleId, (v) => ({ ...v, log: (v.log ?? []).filter((e) => e.id !== eventId) }));
      },
      remove(id) {
        const vehicle = items.find((v) => v.id === id);
        const recs = linkedTo(recurrences, id);
        remove(id);
        for (const r of recs) removeRecurrence(r.id);
        return () => {
          if (vehicle) put(vehicle);
          for (const r of recs) restoreRecurrence(r);
        };
      },
    };
  }, [items, put, patch, remove, recurrences, createRecurrence, updateRecurrence, removeRecurrence, restoreRecurrence]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useVeiculos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVeiculos precisa estar dentro de VeiculosProvider");
  return ctx;
}
