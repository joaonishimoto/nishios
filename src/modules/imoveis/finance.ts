import { addMonths, getDaysInMonth, setDate } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Recurrence, RecurrenceDraft } from "@/modules/financas/types";
import { isOwned, nextDue, paysRent, receivesRent, remaining } from "./logic";
import type { Property, PropertyFlow } from "./types";

export interface FlowPlan {
  flow: PropertyFlow;
  label: string;
  /** Como a recorrência deve ficar em Finanças, com os números do imóvel. */
  draft: RecurrenceDraft;
  /** A que já está em Finanças, quando existe. */
  existing?: Recurrence;
  /** Já existe, mas com outro valor. */
  outdated: boolean;
}

function nextOn(day: number): string {
  const now = today();
  const at = (m: Date) => setDate(m, Math.min(Math.max(1, day), getDaysInMonth(m)));
  const here = at(now);
  return toISO(here >= now ? here : at(addMonths(now, 1)));
}

/**
 * O que o imóvel pode lançar em Finanças, para aparecer na previsão do mês: a prestação
 * (com as parcelas que faltam), o aluguel (que entra ou sai) e o condomínio.
 */
export function flowPlans(p: Property, recurrences: Recurrence[]): FlowPlan[] {
  const out: Omit<FlowPlan, "existing" | "outdated">[] = [];
  const base = { notes: "", every: 1 } as const;
  const link = (role: PropertyFlow) => ({ link: { module: "imoveis" as const, id: p.id, role } });
  if (p.situation === "vendido") return [];
  const f = p.financing;
  const due = f ? nextDue(f) : null;
  if (f && isOwned(p) && f.installment > 0 && due) {
    out.push({
      flow: "parcela",
      label: "Prestação",
      draft: {
        ...base,
        ...link("parcela"),
        kind: "out",
        name: `Prestação ${p.name}`,
        icon: "🏦",
        category: "Moradia",
        amount: f.installment,
        first: toISO(due),
        times: remaining(f),
        approx: f.system === "sac" ? true : undefined,
      },
    });
  }
  const lease = p.lease;
  if (lease && lease.rent > 0 && (receivesRent(p) || paysRent(p))) {
    const gets = receivesRent(p);
    const amount = gets ? Math.round(lease.rent * (1 - (lease.fee ?? 0) / 100) * 100) / 100 : lease.rent;
    out.push({
      flow: "aluguel",
      label: gets ? (lease.fee ? "Aluguel recebido, sem a taxa" : "Aluguel recebido") : "Aluguel",
      draft: {
        ...base,
        ...link("aluguel"),
        kind: gets ? "in" : "out",
        name: `Aluguel ${p.name}`,
        icon: "🏠",
        category: gets ? "Aluguel recebido" : "Moradia",
        amount,
        first: nextOn(lease.dueDay),
      },
    });
  }
  if (p.costs.condo > 0) {
    out.push({
      flow: "condominio",
      label: "Condomínio",
      draft: {
        ...base,
        ...link("condominio"),
        kind: "out",
        name: `Condomínio ${p.name}`,
        icon: "🏢",
        category: "Moradia",
        amount: p.costs.condo,
        first: nextOn(10),
      },
    });
  }
  return out.map((plan) => {
    const existing = recurrences.find((r) => r.link?.module === "imoveis" && r.link.id === p.id && r.link.role === plan.flow);
    return { ...plan, existing, outdated: !!existing && Math.abs(existing.amount - plan.draft.amount) >= 0.01 };
  });
}
