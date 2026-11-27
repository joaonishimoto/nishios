import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Tone } from "@/components/ui/Badge";
import { today } from "@/lib/dates";
import { EMPTY_PROFILE, type Gift, type Loan, type Person, type Profile } from "./types";

/* ---------- Presentes ---------- */

export const giftsOf = (p: Person): Gift[] =>
  [...(p.gifts ?? [])].sort((a, b) => b.date.localeCompare(a.date));

export interface GiftTotals {
  given: number;
  givenValue: number;
  received: number;
  receivedValue: number;
}

export function giftTotals(p: Person): GiftTotals {
  const t: GiftTotals = { given: 0, givenValue: 0, received: 0, receivedValue: 0 };
  for (const g of p.gifts ?? []) {
    if (g.direction === "dei") {
      t.given++;
      t.givenValue += g.value ?? 0;
    } else {
      t.received++;
      t.receivedValue += g.value ?? 0;
    }
  }
  return t;
}

/* ---------- Empréstimos ---------- */

export const paidOf = (l: Loan) => l.payments.reduce((s, x) => s + x.amount, 0);

/** Quanto ainda falta devolver (0 quando quitado ou perdoado). */
export function remainingOf(l: Loan): number {
  if (l.forgiven) return 0;
  return Math.max(0, Math.round((l.amount - paidOf(l)) * 100) / 100);
}

export type LoanStatus = "aberto" | "parcial" | "atrasado" | "quitado" | "perdoado";

export function loanStatus(l: Loan, now: Date = today()): LoanStatus {
  if (l.forgiven) return "perdoado";
  if (remainingOf(l) <= 0) return "quitado";
  if (l.dueDate && differenceInCalendarDays(parseISO(l.dueDate), now) < 0) return "atrasado";
  return paidOf(l) > 0 ? "parcial" : "aberto";
}

export const LOAN_STATUS_META: Record<LoanStatus, { label: string; tone: Tone }> = {
  aberto: { label: "Em aberto", tone: "info" },
  parcial: { label: "Devolvendo", tone: "warning" },
  atrasado: { label: "Atrasado", tone: "danger" },
  quitado: { label: "Quitado", tone: "success" },
  perdoado: { label: "Perdoado", tone: "neutral" },
};

/** Abertos primeiro (atrasados no topo), depois os encerrados; dentro de cada grupo, mais recentes primeiro. */
export function loansOf(p: Person, now: Date = today()): Loan[] {
  const rank = (l: Loan) => ["atrasado", "parcial", "aberto", "quitado", "perdoado"].indexOf(loanStatus(l, now));
  return [...(p.loans ?? [])].sort((a, b) => {
    const open = (l: Loan) => (remainingOf(l) > 0 ? 0 : 1);
    return open(a) - open(b) || (open(a) === 0 ? rank(a) - rank(b) : 0) || b.date.localeCompare(a.date);
  });
}

/**
 * Saldo com a pessoa: positivo = ela te deve; negativo = você deve para ela.
 * `owedToMe` e `iOwe` são os dois lados em separado.
 */
export function loanBalance(p: Person): { owedToMe: number; iOwe: number; balance: number } {
  let owedToMe = 0;
  let iOwe = 0;
  for (const l of p.loans ?? []) {
    if (l.direction === "emprestei") owedToMe += remainingOf(l);
    else iOwe += remainingOf(l);
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { owedToMe: r(owedToMe), iOwe: r(iOwe), balance: r(owedToMe - iOwe) };
}

/* ---------- Perfil ---------- */

export const profileOf = (p: Person): Profile => ({ ...EMPTY_PROFILE, ...p.profile, ideas: p.profile?.ideas ?? [] });

/** Quantos campos de texto do perfil estão preenchidos (para o número na aba). */
export function profileCount(p: Person): number {
  const prof = profileOf(p);
  return (
    (Object.keys(EMPTY_PROFILE) as (keyof Profile)[]).filter(
      (k) => k !== "ideas" && String(prof[k]).trim() !== "",
    ).length + prof.ideas.length
  );
}
