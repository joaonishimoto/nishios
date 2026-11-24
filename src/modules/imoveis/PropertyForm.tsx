import { useState, type FormEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { currentValue, emptyCosts, isOwned } from "./logic";
import { MAIN_ID } from "./seed";
import { useImoveis } from "./store";
import {
  PROPERTY_KINDS,
  SITUATIONS,
  type Financing,
  type Lease,
  type Property,
  type PropertyDraft,
  type Situation,
} from "./types";

const ICONS = ["🏢", "🏠", "🏡", "🏘️", "🏬", "🏖️", "🏕️", "🌳", "🏗️", "🔑", "🛖", "🏰"];

const emptyFinancing = (): Financing => ({
  lender: "",
  installment: 0,
  total: 0,
  paid: 0,
  paidAsOf: toISO(today()),
  dueDay: 10,
});

const emptyLease = (): Lease => ({ rent: 0, dueDay: 10, who: "", start: "", end: "", index: "" });

/** Formulário de imóvel: os dados, a situação e o dinheiro (valor, financiamento, aluguel e custos). */
export function PropertyForm({
  open,
  onOpenChange,
  property,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
  onCreated?: (p: Property) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={property ? `Editar ${property.name}` : "Novo imóvel"}
      description={property ? undefined : "Casa, apartamento, terreno ou sala: seu, alugado para alguém ou onde você mora de aluguel."}
    >
      <Content key={property?.id ?? "novo"} property={property} onCreated={onCreated} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Money({
  label,
  value,
  onChange,
  hint,
  placeholder = "0,00",
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <Input
          id={id}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </Field>
  );
}

function Count({
  label,
  value,
  onChange,
  hint,
  placeholder,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  hint?: string;
  placeholder: string;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <Input
          id={id}
          type="number"
          min={0}
          max={max}
          step="1"
          inputMode="numeric"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Math.round(Number(e.target.value)))}
        />
      )}
    </Field>
  );
}

function Content({
  property,
  onCreated,
  onClose,
}: {
  property?: Property;
  onCreated?: (p: Property) => void;
  onClose: () => void;
}) {
  const { create, update, remove, restore } = useImoveis();
  const toast = useToast();
  const [draft, setDraft] = useState<PropertyDraft>(() => {
    if (property) {
      const { id: _id, createdAt: _c, plan: _p, ...rest } = property;
      return rest;
    }
    return {
      name: "",
      icon: "🏢",
      kind: "apartamento",
      situation: "mora",
      address: "",
      area: 0,
      purchaseDate: "",
      purchasePrice: 0,
      values: [],
      costs: emptyCosts(),
      notes: "",
    };
  });
  // Valor patrimonial de hoje: ao salvar, vira uma avaliação nova quando muda.
  const [value, setValue] = useState(() => (property ? currentValue(property) : 0));
  const [hasFinancing, setHasFinancing] = useState(!!property?.financing);
  const [financing, setFinancing] = useState<Financing>(property?.financing ?? emptyFinancing());
  const [lease, setLease] = useState<Lease>(property?.lease ?? emptyLease());
  const [tried, setTried] = useState(false);

  const set = <K extends keyof PropertyDraft>(key: K, v: PropertyDraft[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const setF = <K extends keyof Financing>(key: K, v: Financing[K]) => setFinancing((f) => ({ ...f, [key]: v }));
  const setL = <K extends keyof Lease>(key: K, v: Lease[K]) => setLease((l) => ({ ...l, [key]: v }));
  const setCost = (key: keyof PropertyDraft["costs"], v: number) => setDraft((d) => ({ ...d, costs: { ...d.costs, [key]: v } }));

  const s = draft.situation;
  const owned = isOwned({ ...draft, id: "", createdAt: "" });
  const showLease = s === "renda" || s === "aluguel";
  const nameError = draft.name.trim() ? undefined : "Dê um nome ao imóvel.";
  const financingError =
    hasFinancing && owned && (financing.total <= 0 || financing.paid > financing.total)
      ? "Informe o total de parcelas (e pagas não pode passar dele)."
      : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || financingError) return;
    const day = (n: number) => Math.min(31, Math.max(1, Math.round(n || 1)));
    const values = [...draft.values];
    const before = property ? currentValue(property) : 0;
    if (value > 0 && Math.round(value * 100) !== Math.round(before * 100)) {
      const date = toISO(today());
      const i = values.findIndex((v) => v.date === date);
      if (i >= 0) values[i] = { date, value };
      else values.push({ date, value });
    }
    const clean: PropertyDraft = {
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      notes: draft.notes.trim(),
      area: Math.max(0, draft.area || 0),
      purchasePrice: Math.max(0, draft.purchasePrice || 0),
      values,
      financing:
        hasFinancing && (owned || s === "vendido")
          ? { ...financing, lender: financing.lender.trim(), dueDay: day(financing.dueDay), paid: Math.max(0, financing.paid) }
          : undefined,
      lease: showLease ? { ...lease, who: lease.who.trim(), index: lease.index.trim(), dueDay: day(lease.dueDay), fee: s === "renda" ? lease.fee : undefined } : draft.lease,
      soldDate: s === "vendido" ? draft.soldDate : undefined,
      soldPrice: s === "vendido" ? draft.soldPrice : undefined,
    };
    if (property) {
      update(property.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      const p = create(clean);
      onCreated?.(p);
      toast({ message: `${p.name} entrou nos seus imóveis` });
    }
    onClose();
  }

  function onRemove() {
    if (!property) return;
    remove(property.id);
    toast({ message: `${property.name} foi excluído`, action: { label: "Desfazer", onClick: () => restore(property) } });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <IconPicker icons={ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!property}
                placeholder="Ex.: Apartamento da praia"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            {(id) => (
              <Select
                id={id}
                value={draft.kind}
                onChange={(e) => {
                  const kind = e.target.value as PropertyDraft["kind"];
                  const icon = PROPERTY_KINDS.find((k) => k.value === kind)?.icon;
                  setDraft((d) => ({ ...d, kind, icon: PROPERTY_KINDS.some((k) => k.icon === d.icon) && icon ? icon : d.icon }));
                }}
              >
                {PROPERTY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Situação" hint={SITUATIONS.find((x) => x.value === s)?.hint}>
            {(id) => (
              <Select id={id} value={s} onChange={(e) => set("situation", e.target.value as Situation)}>
                {SITUATIONS.filter((x) => x.value !== "vendido" || property).map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            {(id) => (
              <Input id={id} value={draft.address} placeholder="Ex.: Rua das Flores, 120, ap. 34" onChange={(e) => set("address", e.target.value)} />
            )}
          </Field>
          <Field label="Área privativa (m²)">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Ex.: 52"
                value={draft.area || ""}
                onChange={(e) => set("area", Number(e.target.value))}
              />
            )}
          </Field>
        </div>

        {s !== "aluguel" && (
          <Section title="Valor" hint="O valor patrimonial é quanto ele vale hoje. Cada mudança fica guardada e vira gráfico.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Money label="Preço de compra (R$)" value={draft.purchasePrice} onChange={(v) => set("purchasePrice", v)} />
              <Field label="Data da compra">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    max={toISO(today())}
                    placeholder="Quando comprou"
                    value={draft.purchaseDate}
                    onChange={(e) => set("purchaseDate", e.target.value)}
                  />
                )}
              </Field>
              <Money
                label="Valor patrimonial hoje (R$)"
                value={value}
                onChange={setValue}
                hint="Uma avaliação, o valor venal ou anúncios parecidos."
              />
              {s === "vendido" && (
                <>
                  <Money label="Vendido por (R$)" value={draft.soldPrice} onChange={(v) => set("soldPrice", v)} />
                  <Field label="Data da venda">
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        placeholder="Quando vendeu"
                        value={draft.soldDate ?? ""}
                        onChange={(e) => set("soldDate", e.target.value)}
                      />
                    )}
                  </Field>
                </>
              )}
            </div>
          </Section>
        )}

        {(owned || s === "vendido") && (
          <Section title="Financiamento" hint="As parcelas pagas avançam sozinhas, uma por mês no dia do vencimento.">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={hasFinancing}
                onChange={(e) => setHasFinancing(e.target.checked)}
              />
              Este imóvel tem financiamento
            </label>
            {hasFinancing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Banco ou construtora">
                  {(id) => (
                    <Input id={id} value={financing.lender} placeholder="Ex.: Caixa" onChange={(e) => setF("lender", e.target.value)} />
                  )}
                </Field>
                <Money label="Prestação atual (R$)" value={financing.installment} onChange={(v) => setF("installment", v)} />
                <Count label="Total de parcelas" placeholder="Ex.: 360" value={financing.total || undefined} onChange={(v) => setF("total", v)} />
                <Count
                  label="Parcelas pagas até hoje"
                  placeholder="0"
                  value={financing.paid}
                  max={financing.total || undefined}
                  onChange={(v) => {
                    setF("paid", v);
                    setF("paidAsOf", toISO(today()));
                  }}
                  hint={tried ? financingError : undefined}
                />
                <Count label="Dia do vencimento" placeholder="10" max={31} value={financing.dueDay} onChange={(v) => setF("dueDay", v)} />
                <Field label="Sistema">
                  {(id) => (
                    <Select
                      id={id}
                      value={financing.system ?? ""}
                      onChange={(e) => setF("system", (e.target.value || undefined) as Financing["system"])}
                    >
                      <option value="">Não sei</option>
                      <option value="sac">SAC (parcela cai com o tempo)</option>
                      <option value="price">Price (parcela fixa)</option>
                    </Select>
                  )}
                </Field>
                <Money label="Valor financiado (R$)" value={financing.financed} onChange={(v) => setF("financed", v || undefined)} />
                <Field label="Juros ao ano (%)">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Ex.: 9,5"
                      value={financing.rate ?? ""}
                      onChange={(e) => setF("rate", e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  )}
                </Field>
                <Money
                  label="Saldo devedor do extrato (R$)"
                  value={financing.balance}
                  hint="Opcional. Sem ele, o app estima."
                  placeholder="Estimar"
                  onChange={(v) => {
                    setF("balance", v || undefined);
                    setF("balanceAsOf", v ? toISO(today()) : undefined);
                  }}
                />
              </div>
            )}
          </Section>
        )}

        {showLease && (
          <Section
            title={s === "renda" ? "Aluguel que recebo" : "Aluguel que pago"}
            hint={s === "renda" ? "O que o inquilino paga por mês." : "O que você paga por mês para morar."}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Money label="Aluguel (R$ por mês)" value={lease.rent} onChange={(v) => setL("rent", v)} />
              <Count label="Dia do vencimento" placeholder="10" max={31} value={lease.dueDay} onChange={(v) => setL("dueDay", v)} />
              <Field label={s === "renda" ? "Inquilino" : "Proprietário ou imobiliária"}>
                {(id) => (
                  <Input id={id} value={lease.who} placeholder={s === "renda" ? "Ex.: Ana Souza" : "Ex.: Imobiliária Lar"} onChange={(e) => setL("who", e.target.value)} />
                )}
              </Field>
              <Field label="Reajuste">
                {(id) => <Input id={id} value={lease.index} placeholder="Ex.: IPCA" onChange={(e) => setL("index", e.target.value)} />}
              </Field>
              <Field label="Início do contrato">
                {(id) => <Input id={id} type="date" placeholder="Sem data" value={lease.start} onChange={(e) => setL("start", e.target.value)} />}
              </Field>
              <Field label="Fim do contrato">
                {(id) => <Input id={id} type="date" placeholder="Sem data" value={lease.end} onChange={(e) => setL("end", e.target.value)} />}
              </Field>
              {s === "renda" && (
                <Field label="Taxa da imobiliária (%)" hint="Deixe em branco se você mesmo administra.">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      inputMode="decimal"
                      placeholder="Ex.: 8"
                      value={lease.fee ?? ""}
                      onChange={(e) => setL("fee", e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  )}
                </Field>
              )}
            </div>
          </Section>
        )}

        {s !== "vendido" && (
          <Section title="Custos que eu pago" hint="Deixe 0 no que o inquilino paga.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Money label="Condomínio (R$ por mês)" value={draft.costs.condo} onChange={(v) => setCost("condo", v)} />
              <Money label="IPTU (R$ por ano)" value={draft.costs.iptu} onChange={(v) => setCost("iptu", v)} />
              <Money label="Seguro (R$ por ano)" value={draft.costs.insurance} onChange={(v) => setCost("insurance", v)} />
              <Money label="Outros (R$ por mês)" value={draft.costs.other} onChange={(v) => setCost("other", v)} hint="Manutenção, taxa de lixo." />
            </div>
          </Section>
        )}

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Matrícula, contatos da administradora, o que falta resolver…"
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {property && property.id !== MAIN_ID && (
          <Button variant="ghost" className="mr-auto text-danger-strong hover:text-danger-strong" onClick={onRemove}>
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{property ? "Salvar" : "Adicionar imóvel"}</Button>
      </DialogFooter>
    </form>
  );
}
