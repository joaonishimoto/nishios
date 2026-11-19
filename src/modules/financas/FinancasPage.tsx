import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { useBens } from "@/modules/bens/store";
import { ForecastTab } from "./ForecastTab";
import { InvestmentForm } from "./InvestmentForm";
import { InvestmentsTab } from "./InvestmentsTab";
import { active, leftLabel, monthOf, summarize, totalInvested } from "./logic";
import { RecurrenceForm } from "./RecurrenceForm";
import { RecurrencesTab } from "./RecurrencesTab";
import { useFinancas } from "./store";
import type { Flow } from "./types";

type Tab = "previsao" | "recorrencias" | "investimentos";

/**
 * Finanças, versão 1: só o que é certo. Recorrências (o que entra e sai com
 * certeza) dão a previsão do mês; investimentos são atualizados à mão.
 */
export function FinancasPage() {
  const { recurrences, investments, clearAll, restoreRecurrence, restoreInvestment } = useFinancas();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const { wishes } = useBens();
  const [params, setParams] = useSearchParams();
  const raw = params.get("aba");
  const tab: Tab = raw === "recorrencias" || raw === "investimentos" ? raw : "previsao";
  const month = monthOf(today());
  const summary = useMemo(() => summarize(recurrences, month, wishes), [recurrences, month, wishes]);
  const current = active(recurrences, month);

  // Formulários abertos pela URL: ?r=<id> (recorrência), ?i=<id> (investimento), ?nova=in|out, ?novo=1.
  const editRec = recurrences.find((r) => r.id === params.get("r"));
  const editInv = investments.find((i) => i.id === params.get("i"));
  const newKind = params.get("nova") as Flow | null;
  const newInv = params.has("novo");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const closeForms = () => update({ r: null, i: null, nova: null, novo: null });

  const description =
    tab === "investimentos"
      ? investments.length === 0
        ? "Reserva de emergência e outros investimentos, com o saldo que você atualiza."
        : `${plural(investments.length, "investimento", "investimentos")} somando ${money(totalInvested(investments))}.`
      : tab === "recorrencias"
        ? current.length === 0
          ? "O que você tem certeza que entra e sai. O resto dos gastos fica de fora."
          : `${plural(current.filter((r) => r.kind === "in").length, "entrada", "entradas")} e ${plural(current.filter((r) => r.kind === "out").length, "saída", "saídas")} que se repetem.`
        : summary.items.length === 0
          ? "Quanto deve sobrar no mês, a partir do que é certo."
          : `${leftLabel(summary.leftAfter)} neste mês, depois dos aportes.`;

  return (
    <>
      <PageHeader
        title="Finanças"
        description={description}
        action={
          tab === "investimentos" ? (
            <Button onClick={() => update({ novo: "1" })}>
              <Plus />
              Novo investimento
            </Button>
          ) : (
            <Button onClick={() => update({ nova: "out" })}>
              <Plus />
              Nova recorrência
            </Button>
          )
        }
      />

      <div className="mt-6">
        <Segmented<Tab>
          label="Seções de finanças"
          value={tab}
          onChange={(t) => setParams(t === "previsao" ? {} : { aba: t }, { replace: true })}
          options={[
            { value: "previsao", label: "Previsão" },
            { value: "recorrencias", label: "Recorrências", count: current.length },
            { value: "investimentos", label: "Investimentos", count: investments.length },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "previsao" && (
          <ForecastTab onNew={(kind) => update({ nova: kind })} onOpen={(id) => update({ r: id })} />
        )}
        {tab === "recorrencias" && (
          <RecurrencesTab onNew={(kind) => update({ nova: kind })} onOpen={(id) => update({ r: id })} />
        )}
        {tab === "investimentos" && (
          <InvestmentsTab onNew={() => update({ novo: "1" })} onOpen={(id) => update({ i: id })} />
        )}
      </div>

      {(recurrences.length > 0 || investments.length > 0) && (
        <div className="mt-10 border-t border-border pt-4">
          <Button variant="ghost" size="sm" className="hover:bg-danger-soft hover:text-danger-strong" onClick={() => setConfirmClear(true)}>
            <Trash2 />
            Apagar todos os dados de Finanças
          </Button>
        </div>
      )}

      <Dialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Apagar todos os dados de Finanças?"
        description="Saem todas as recorrências e todos os investimentos, com o histórico de saldos. Os outros módulos não mudam."
      >
        <DialogBody>
          <p className="text-muted-foreground">
            {recurrences.length} {recurrences.length === 1 ? "recorrência" : "recorrências"} e {investments.length}{" "}
            {investments.length === 1 ? "investimento" : "investimentos"}. Metas ligadas a um investimento ficam em zero até você ligar outro.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const recs = recurrences;
              const invs = investments;
              clearAll();
              setConfirmClear(false);
              toast({
                message: "Finanças está vazio",
                action: {
                  label: "Desfazer",
                  onClick: () => {
                    invs.forEach(restoreInvestment);
                    recs.forEach(restoreRecurrence);
                  },
                },
              });
            }}
          >
            Apagar tudo
          </Button>
        </DialogFooter>
      </Dialog>

      <RecurrenceForm
        open={!!editRec || newKind === "in" || newKind === "out"}
        recurrence={editRec}
        kind={newKind === "in" ? "in" : "out"}
        onOpenChange={(o) => !o && closeForms()}
      />
      <InvestmentForm open={!!editInv || newInv} investment={editInv} onOpenChange={(o) => !o && closeForms()} />
    </>
  );
}
