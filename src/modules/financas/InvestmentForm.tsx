import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { useFinancas } from "./store";
import { FINANCE_ICONS, INVESTMENT_TYPES, type Investment, type InvestmentDraft, type InvestmentType } from "./types";

export function InvestmentForm({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={investment ? "Editar investimento" : "Novo investimento"}
      description={investment ? undefined : "Onde o dinheiro fica guardado. Você atualiza o saldo quando quiser."}
    >
      <Content key={investment?.id ?? "novo"} investment={investment} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ investment, onClose }: { investment?: Investment; onClose: () => void }) {
  const { createInvestment, updateInvestment, removeInvestment, restoreInvestment } = useFinancas();
  const toast = useToast();
  const [draft, setDraft] = useState<InvestmentDraft>({
    name: investment?.name ?? "",
    icon: investment?.icon ?? "🐷",
    type: investment?.type ?? "reserva",
    institution: investment?.institution ?? "",
    notes: investment?.notes ?? "",
    balance: 0,
  });
  const [date, setDate] = useState(toISO(today()));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof InvestmentDraft>(key: K, value: InvestmentDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao investimento.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = { ...draft, name: draft.name.trim(), institution: draft.institution.trim(), notes: draft.notes.trim() };
    if (investment) {
      const { balance: _ignored, ...patch } = clean;
      updateInvestment(investment.id, patch);
      toast({ message: "Alterações salvas" });
    } else {
      createInvestment({ ...clean, balance: Math.max(0, clean.balance || 0) }, date || toISO(today()));
      toast({ message: `${clean.name} entrou nos investimentos` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={FINANCE_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!investment}
                placeholder="Ex.: Reserva de emergência"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={draft.type} onChange={(e) => set("type", e.target.value as InvestmentType)}>
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Onde está">
            {(id) => (
              <Input
                id={id}
                value={draft.institution}
                placeholder="Ex.: Nubank, XP, Inter"
                onChange={(e) => set("institution", e.target.value)}
              />
            )}
          </Field>
        </div>

        {!investment && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Saldo de hoje (R$)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={draft.balance || ""}
                  onChange={(e) => set("balance", Number(e.target.value))}
                />
              )}
            </Field>
            <Field label="Em que dia">
              {(id) => (
                <Input id={id} type="date" placeholder="Hoje" max={toISO(today())} value={date} onChange={(e) => setDate(e.target.value)} />
              )}
            </Field>
          </div>
        )}

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Para que serve, liquidez, quando resgatar..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {investment && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeInvestment(investment.id);
              onClose();
              toast({
                message: `${investment.name} foi excluído`,
                action: { label: "Desfazer", onClick: () => restoreInvestment(investment) },
              });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{investment ? "Salvar alterações" : "Adicionar investimento"}</Button>
      </DialogFooter>
    </form>
  );
}
