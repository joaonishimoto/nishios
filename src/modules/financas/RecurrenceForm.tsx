import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { IconPicker } from "@/components/ui/IconPicker";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { stillHas } from "@/modules/bens/logic";
import { useBens } from "@/modules/bens/store";
import { useFinancas } from "./store";
import {
  EVERY_OPTIONS,
  FINANCE_ICONS,
  IN_CATEGORIES,
  OUT_CATEGORIES,
  type Flow,
  type Recurrence,
  type RecurrenceDraft,
} from "./types";

export function RecurrenceForm({
  open,
  onOpenChange,
  recurrence,
  kind = "out",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurrence?: Recurrence;
  /** Tipo já escolhido ao criar uma nova. */
  kind?: Flow;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={recurrence ? "Editar recorrência" : "Nova recorrência"}
      description={recurrence ? undefined : "Algo que você tem certeza que entra ou sai, todo mês ou de tempos em tempos."}
    >
      <Content
        key={recurrence?.id ?? `nova-${kind}`}
        recurrence={recurrence}
        kind={kind}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function Content({ recurrence, kind, onClose }: { recurrence?: Recurrence; kind: Flow; onClose: () => void }) {
  const { investments, createRecurrence, updateRecurrence, removeRecurrence, restoreRecurrence } = useFinancas();
  const { assets } = useBens();
  const toast = useToast();
  const [draft, setDraft] = useState<RecurrenceDraft>(() => ({
    kind: recurrence?.kind ?? kind,
    name: recurrence?.name ?? "",
    icon: recurrence?.icon ?? (kind === "in" ? "💼" : "🧾"),
    category: recurrence?.category ?? (kind === "in" ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]),
    amount: recurrence?.amount ?? 0,
    approx: recurrence?.approx,
    every: recurrence?.every ?? 1,
    first: recurrence?.first ?? toISO(today()),
    times: recurrence?.times,
    businessDay: recurrence?.businessDay,
    investmentId: recurrence?.investmentId,
    assetId: recurrence?.assetId,
    notes: recurrence?.notes ?? "",
  }));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof RecurrenceDraft>(key: K, value: RecurrenceDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const categories = draft.kind === "in" ? IN_CATEGORIES : OUT_CATEGORIES;
  const categoryOptions = categories.includes(draft.category) ? categories : [...categories, draft.category];
  const assetOptions = assets.filter((a) => stillHas(a) || a.id === draft.assetId);

  const nameError = draft.name.trim() ? undefined : "Dê um nome à recorrência.";
  const amountError = draft.amount > 0 ? undefined : "O valor precisa ser maior que zero.";
  const firstError = draft.first ? undefined : "Escolha a data da primeira vez.";
  const dayError =
    draft.businessDay === undefined || (draft.businessDay >= 1 && draft.businessDay <= 22) ? undefined : "Use um número de 1 a 22.";

  function setKind(next: Flow) {
    setDraft((d) => ({
      ...d,
      kind: next,
      category: (next === "in" ? IN_CATEGORIES : OUT_CATEGORIES)[0],
      investmentId: next === "in" ? undefined : d.investmentId,
      assetId: next === "in" ? undefined : d.assetId,
    }));
  }

  function setInvestment(id: string) {
    setDraft((d) => ({
      ...d,
      investmentId: id || undefined,
      category: id ? "Investimentos" : d.category === "Investimentos" ? OUT_CATEGORIES[0] : d.category,
    }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || amountError || firstError || dayError) return;
    const clean: RecurrenceDraft = {
      ...draft,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
      approx: draft.approx || undefined,
      times: draft.times && draft.times > 0 ? Math.round(draft.times) : undefined,
      businessDay: draft.businessDay ? Math.min(22, Math.max(1, Math.round(draft.businessDay))) : undefined,
    };
    if (recurrence) {
      updateRecurrence(recurrence.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createRecurrence(clean);
      toast({ message: `${clean.name} entrou nas ${clean.kind === "in" ? "entradas" : "saídas"}` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div>
          <Segmented<Flow>
            label="Entrada ou saída"
            value={draft.kind}
            onChange={setKind}
            options={[
              { value: "out", label: "Saída" },
              { value: "in", label: "Entrada" },
            ]}
          />
        </div>

        <div className="flex items-start gap-3">
          <IconPicker icons={FINANCE_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!recurrence}
                placeholder={draft.kind === "in" ? "Ex.: Salário" : "Ex.: Aluguel"}
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Field label="Valor (R$)" error={tried ? amountError : undefined}>
              {(id) => (
                <MoneyInput
                  id={id}
                  value={draft.amount || undefined}
                  onValueChange={(v) => set("amount", v ?? 0)}
                />
              )}
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={!!draft.approx}
                onChange={(v) => set("approx", v)}
                label="Valor aproximado"
              />
              Valor aproximado, varia todo mês
            </label>
          </div>
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {categoryOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Cai em</span>
          <div>
            <Segmented<"corrido" | "util">
              label="Dia corrido ou dia útil"
              value={draft.businessDay ? "util" : "corrido"}
              onChange={(m) => set("businessDay", m === "util" ? (draft.businessDay ?? 5) : undefined)}
              options={[
                { value: "corrido", label: "Dia corrido" },
                { value: "util", label: "Dia útil" },
              ]}
            />
          </div>
          {draft.businessDay !== undefined && (
            <Field
              label="Qual dia útil"
              error={tried ? dayError : undefined}
              hint="Conta de segunda a sexta, sem feriados nacionais e Carnaval."
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={22}
                  step={1}
                  inputMode="numeric"
                  placeholder="5"
                  className="sm:w-40"
                  value={draft.businessDay || ""}
                  onChange={(e) => set("businessDay", e.target.value === "" ? 0 : Number(e.target.value))}
                />
              )}
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Repete">
            {(id) => (
              <Select id={id} value={String(draft.every)} onChange={(e) => set("every", Number(e.target.value))}>
                {EVERY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={draft.businessDay !== undefined ? "A partir do mês de" : "Primeira vez"}
            hint={draft.businessDay !== undefined ? "Só o mês conta." : "O dia do mês sai daqui."}
            error={tried ? firstError : undefined}
          >
            {(id) => (
              <Input
                id={id}
                type="date"
                placeholder="Escolha a data"
                value={draft.first}
                onChange={(e) => set("first", e.target.value)}
              />
            )}
          </Field>
          <Field label="Quantas vezes" hint="Para parcelamentos e contratos.">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Sem fim"
                value={draft.times ?? ""}
                onChange={(e) => set("times", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            )}
          </Field>
        </div>

        {draft.kind === "out" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="É um aporte em" hint="Soma no investimento e aparece separado na sobra.">
              {(id) => (
                <Select id={id} value={draft.investmentId ?? ""} onChange={(e) => setInvestment(e.target.value)}>
                  <option value="">Não é aporte</option>
                  {investments.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Custo de um bem" hint="Seguro, plano, parcelas de algo que você tem.">
              {(id) => (
                <Select id={id} value={draft.assetId ?? ""} onChange={(e) => set("assetId", e.target.value || undefined)}>
                  <option value="">Nenhum</option>
                  {assetOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Como paga, débito automático, quando reajusta..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {recurrence && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeRecurrence(recurrence.id);
              onClose();
              toast({
                message: `${recurrence.name} foi excluída`,
                action: { label: "Desfazer", onClick: () => restoreRecurrence(recurrence) },
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
        <Button type="submit">{recurrence ? "Salvar alterações" : "Adicionar"}</Button>
      </DialogFooter>
    </form>
  );
}
