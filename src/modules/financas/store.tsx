import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { withBalance } from "./logic";
import { seedInvestments, seedRecurrences } from "./seed";
import type { Investment, InvestmentDraft, MonthMark, Recurrence, RecurrenceDraft } from "./types";

export const RECURRENCES_KEY = "nishios:financas:recorrencias:v1";
export const INVESTMENTS_KEY = "nishios:financas:investimentos:v1";

interface Store {
  recurrences: Recurrence[];
  investments: Investment[];
  createRecurrence: (draft: RecurrenceDraft) => void;
  updateRecurrence: (id: string, draft: RecurrenceDraft) => void;
  removeRecurrence: (id: string) => void;
  restoreRecurrence: (rec: Recurrence) => void;
  /** Confirma ou ajusta o valor de um mês (yyyy-MM). `undefined` tira a marca. */
  markMonth: (id: string, month: string, mark: MonthMark | undefined) => void;
  createInvestment: (draft: InvestmentDraft, date: string) => Investment;
  updateInvestment: (id: string, patch: Partial<Omit<Investment, "id">>) => void;
  /** Registra o saldo de um dia no histórico. */
  setBalance: (id: string, date: string, balance: number) => void;
  removeInvestment: (id: string) => void;
  restoreInvestment: (inv: Investment) => void;
  resetToExample: () => void;
  /** Apaga recorrências e investimentos, para começar do zero. */
  clearAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function FinancasProvider({ children }: { children: ReactNode }) {
  const [recurrences, setRecurrences] = usePersistentState<Recurrence[]>(RECURRENCES_KEY, seedRecurrences);
  const [investments, setInvestments] = usePersistentState<Investment[]>(INVESTMENTS_KEY, seedInvestments);

  const store = useMemo<Store>(
    () => ({
      recurrences,
      investments,
      createRecurrence(draft) {
        setRecurrences((list) => [...list, { ...draft, id: crypto.randomUUID() }]);
      },
      updateRecurrence(id, draft) {
        setRecurrences((list) => list.map((r) => (r.id === id ? { ...r, ...draft } : r)));
      },
      removeRecurrence(id) {
        setRecurrences((list) => list.filter((r) => r.id !== id));
      },
      restoreRecurrence(rec) {
        setRecurrences((list) => (list.some((r) => r.id === rec.id) ? list : [...list, rec]));
      },
      markMonth(id, month, mark) {
        setRecurrences((list) =>
          list.map((r) => {
            if (r.id !== id) return r;
            const months = { ...r.months };
            const clean = mark && (mark.done || mark.amount !== undefined) ? mark : undefined;
            if (clean) months[month] = clean;
            else delete months[month];
            return { ...r, months };
          }),
        );
      },
      createInvestment({ balance, ...draft }, date) {
        const inv: Investment = { ...draft, id: crypto.randomUUID(), history: [{ date, balance }] };
        setInvestments((list) => [...list, inv]);
        return inv;
      },
      updateInvestment(id, patch) {
        setInvestments((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      },
      setBalance(id, date, balance) {
        setInvestments((list) => list.map((i) => (i.id === id ? { ...i, history: withBalance(i.history, date, balance) } : i)));
      },
      removeInvestment(id) {
        setInvestments((list) => list.filter((i) => i.id !== id));
      },
      restoreInvestment(inv) {
        setInvestments((list) => (list.some((i) => i.id === inv.id) ? list : [...list, inv]));
      },
      resetToExample() {
        setRecurrences(seedRecurrences());
        setInvestments(seedInvestments());
      },
      clearAll() {
        setRecurrences([]);
        setInvestments([]);
      },
    }),
    [recurrences, investments, setRecurrences, setInvestments],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useFinancas(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useFinancas precisa estar dentro de FinancasProvider");
  return store;
}
