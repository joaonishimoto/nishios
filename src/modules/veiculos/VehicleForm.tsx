import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { ACQUISITION_MODES, installmentStatus, monthYear, type AcquisitionMode } from "@/lib/financiamento";
import { money } from "@/lib/format";
import { useFinancas } from "@/modules/financas/store";
import { EVERY_OPTIONS, type Recurrence } from "@/modules/financas/types";
import { linkedTo, withRole } from "./logic";
import { COLOR_NAMES } from "./paint";
import { useVeiculos, type CostInput, type CostPlan } from "./store";
import { FIXED_COSTS, VEHICLE_ICONS, VEHICLE_KINDS, type Vehicle, type VehicleKind } from "./types";

export function VehicleForm({
  open,
  onOpenChange,
  vehicle,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onCreated?: (vehicle: Vehicle) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={vehicle ? `Editar ${vehicle.name}` : "Novo veículo"}
      description={vehicle ? undefined : "Carro, moto ou outro: quanto vale, como foi pago e o que custa todo ano."}
      className="max-w-2xl"
    >
      <Content key={vehicle?.id ?? "novo"} vehicle={vehicle} onCreated={onCreated} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

type FixedRole = (typeof FIXED_COSTS)[number]["role"];

const toInput = (r: Recurrence | undefined, name: string): CostInput =>
  r
    ? { recId: r.id, name, amount: r.amount, first: r.first, every: r.every, times: r.times }
    : { name, amount: 0, first: "", every: 12 };

/** Nome sem o " (Apelido)" que a recorrência ganha em Finanças. */
const bareName = (r: Recurrence) => r.name.replace(/ \([^)]*\)$/, "");

function Content({ vehicle, onCreated, onClose }: { vehicle?: Vehicle; onCreated?: (v: Vehicle) => void; onClose: () => void }) {
  const { save, remove } = useVeiculos();
  const { recurrences } = useFinancas();
  const toast = useToast();
  const now = today();
  const recs = useMemo(() => (vehicle ? linkedTo(recurrences, vehicle.id) : []), [recurrences, vehicle]);

  const [v, setV] = useState<Vehicle>(
    () =>
      vehicle ?? {
        id: crypto.randomUUID(),
        name: "",
        icon: "🚗",
        kind: "carro",
        brand: "",
        model: "",
        plate: "",
        marketValue: 0,
        marketValueDate: toISO(now),
        acquisition: { mode: "cash", date: "", price: 0 },
        notes: "",
        createdAt: new Date().toISOString(),
      },
  );
  const [parcela, setParcela] = useState<CostInput>(() => {
    const p = withRole(recs, "parcela")[0];
    return p ? toInput(p, "Parcela") : { name: "Parcela", amount: 0, first: "", every: 1, times: 0 };
  });
  const [fixed, setFixed] = useState<Record<FixedRole, CostInput>>(() => {
    const out = {} as Record<FixedRole, CostInput>;
    for (const f of FIXED_COSTS) out[f.role] = toInput(withRole(recs, f.role)[0], f.label);
    return out;
  });
  const [others, setOthers] = useState<CostInput[]>(() =>
    withRole(recs, "custo").map((r) => ({ ...toInput(r, bareName(r)) })),
  );
  const [selling, setSelling] = useState(!!vehicle?.sold);
  const [tried, setTried] = useState(false);

  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => setV((d) => ({ ...d, [key]: value }));
  const acq = v.acquisition;
  const setAcq = <K extends keyof Vehicle["acquisition"]>(key: K, value: Vehicle["acquisition"][K]) =>
    setV((d) => ({ ...d, acquisition: { ...d.acquisition, [key]: value } }));
  const financed = acq.mode !== "cash";

  const preview =
    financed && parcela.amount > 0 && parcela.first && parcela.times
      ? installmentStatus({ ...parcela, times: parcela.times }, now)
      : null;

  const nameError = v.name.trim() ? undefined : "Dê um nome ao veículo, como \"Civic\" ou \"Moto\".";
  const parcelaError =
    financed && parcela.amount > 0 && (!parcela.first || !(parcela.times && parcela.times > 0))
      ? "Informe quantas parcelas são e quando venceu (ou vence) a primeira."
      : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || parcelaError) return;
    const clean: Vehicle = {
      ...v,
      name: v.name.trim(),
      brand: v.brand.trim(),
      model: v.model.trim(),
      plate: v.plate.trim().toUpperCase(),
      notes: v.notes.trim(),
      marketValue: Math.max(0, v.marketValue || 0),
      acquisition: {
        ...acq,
        price: Math.max(0, acq.price || 0),
        downPayment: financed ? acq.downPayment || undefined : undefined,
        lender: financed ? acq.lender?.trim() || undefined : undefined,
        payoff: financed && acq.payoff?.amount ? acq.payoff : undefined,
        pix: acq.mode === "family" ? acq.pix?.trim() || undefined : undefined,
        contemplated: acq.mode === "consortium" ? acq.contemplated : undefined,
        contemplatedOn: acq.mode === "consortium" && acq.contemplated ? acq.contemplatedOn : undefined,
      },
      sold: selling ? { date: v.sold?.date || toISO(now), price: v.sold?.price ?? 0 } : undefined,
    };
    const plan: CostPlan = {
      parcela: financed
        ? { ...parcela, every: 1, name: acq.mode === "family" && acq.lender?.trim() ? `Parcela para ${acq.lender.trim()}` : "Parcela" }
        : null,
      fixed,
      others: others.filter((o) => o.amount > 0),
    };
    save(clean, plan);
    if (!vehicle) onCreated?.(clean);
    toast({ message: vehicle ? "Alterações salvas" : `${clean.name} entrou nos seus veículos` });
    onClose();
  }

  const money$ = (value: number | undefined, onChange: (n: number) => void, placeholder = "0,00") => (id: string) => (
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
  );

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <IconPicker icons={VEHICLE_ICONS} value={v.icon} onChange={(i) => set("icon", i)} />
            <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
              {(id) => (
                <Input
                  id={id}
                  value={v.name}
                  autoFocus={!vehicle}
                  placeholder="Ex.: Civic, Moto da semana"
                  onChange={(e) => set("name", e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tipo">
              {(id) => (
                <Select
                  id={id}
                  value={v.kind}
                  onChange={(e) => {
                    const kind = e.target.value as VehicleKind;
                    const prev = VEHICLE_KINDS.find((k) => k.value === v.kind)?.icon;
                    setV((d) => ({
                      ...d,
                      kind,
                      // Troca o ícone junto, a não ser que ele já tenha sido escolhido à mão.
                      icon: d.icon === prev ? (VEHICLE_KINDS.find((k) => k.value === kind)?.icon ?? d.icon) : d.icon,
                    }));
                  }}
                >
                  {VEHICLE_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Marca">
              {(id) => <Input id={id} value={v.brand} placeholder="Ex.: Honda" onChange={(e) => set("brand", e.target.value)} />}
            </Field>
            <Field label="Modelo">
              {(id) => <Input id={id} value={v.model} placeholder="Ex.: Civic EXL" onChange={(e) => set("model", e.target.value)} />}
            </Field>
            <Field label="Ano">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={now.getFullYear() + 2}
                  placeholder={String(now.getFullYear())}
                  value={v.year ?? ""}
                  onChange={(e) => set("year", e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            </Field>
            <Field label="Placa">
              {(id) => (
                <Input
                  id={id}
                  value={v.plate}
                  placeholder="ABC1D23"
                  className="uppercase"
                  onChange={(e) => set("plate", e.target.value)}
                />
              )}
            </Field>
            <Field label="Cor">
              {(id) => (
                <>
                  <Input id={id} list="veiculo-cores" value={v.color ?? ""} placeholder="Ex.: Azul" onChange={(e) => set("color", e.target.value)} />
                  <datalist id="veiculo-cores">
                    {COLOR_NAMES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field label="Quilometragem">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="km"
                  value={v.km ?? ""}
                  onChange={(e) => set("km", e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            </Field>
          </div>
        </div>

        <Section title="Quanto vale" hint="O valor de hoje (tabela FIPE ou avaliação). É o que conta no seu patrimônio.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor hoje (R$)">{money$(v.marketValue, (n) => set("marketValue", n))}</Field>
            <Field label="Atualizado em">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  placeholder="Quando consultou"
                  max={toISO(now)}
                  value={v.marketValueDate}
                  onChange={(e) => set("marketValueDate", e.target.value)}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section title="Como comprei">
          <Segmented<AcquisitionMode>
            label="Forma de aquisição"
            value={acq.mode}
            onChange={(mode) => setAcq("mode", mode)}
            options={ACQUISITION_MODES.map((m) => ({ value: m.value, label: m.label }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={acq.mode === "consortium" ? "Data da adesão" : "Data da compra"}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  placeholder="Quando"
                  max={toISO(now)}
                  value={acq.date}
                  onChange={(e) => setAcq("date", e.target.value)}
                />
              )}
            </Field>
            <Field
              label={acq.mode === "cash" ? "Valor pago (R$)" : acq.mode === "financing" || acq.mode === "family" ? "Valor do veículo (R$)" : "Carta de crédito (R$)"}
            >
              {money$(acq.price, (n) => setAcq("price", n))}
            </Field>
            {financed && (
              <>
                <Field label={acq.mode === "consortium" ? "Lance (R$)" : "Entrada (R$)"}>
                  {money$(acq.downPayment, (n) => setAcq("downPayment", n))}
                </Field>
                <Field label={acq.mode === "financing" ? "Banco" : acq.mode === "family" ? "Para quem eu mando" : "Administradora"}>
                  {(id) => (
                    <Input
                      id={id}
                      value={acq.lender ?? ""}
                      placeholder={acq.mode === "financing" ? "Ex.: Itaú" : acq.mode === "family" ? "Ex.: Meu pai" : "Ex.: Porto Seguro Consórcio"}
                      onChange={(e) => setAcq("lender", e.target.value)}
                    />
                  )}
                </Field>
                {acq.mode === "family" && (
                  <Field label="Chave Pix ou conta" hint="Opcional. Para lembrar para onde mandar todo mês.">
                    {(id) => (
                      <Input
                        id={id}
                        value={acq.pix ?? ""}
                        placeholder="Ex.: CPF, e-mail ou celular"
                        onChange={(e) => setAcq("pix", e.target.value)}
                      />
                    )}
                  </Field>
                )}
              </>
            )}
          </div>
          {financed && (
            <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Parcela (R$)">
                  {money$(parcela.amount, (n) => setParcela((p) => ({ ...p, amount: n })))}
                </Field>
                <Field label="Nº de parcelas">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="Ex.: 60"
                      value={parcela.times || ""}
                      onChange={(e) => setParcela((p) => ({ ...p, times: Number(e.target.value) || 0 }))}
                    />
                  )}
                </Field>
                <Field label="1ª parcela">
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      placeholder="Vencimento"
                      value={parcela.first}
                      onChange={(e) => setParcela((p) => ({ ...p, first: e.target.value }))}
                    />
                  )}
                </Field>
              </div>
              {tried && parcelaError && <p className="text-sm text-danger-strong">{parcelaError}</p>}
              {preview && (
                <div className="flex flex-col gap-2">
                  <Progress value={preview.progress} label="Parcelas pagas" done={preview.left === 0} />
                  <p className="text-sm text-muted-foreground">
                    {preview.paid} de {preview.total} pagas pela data · faltam {preview.left} ({money(preview.leftAmount)})
                    {preview.left > 0 ? ` · última em ${monthYear(preview.last)}` : " · quitado"}
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Saldo para quitar (R$)" hint={acq.mode === "family" ? "Opcional. Se combinaram um valor para quitar de uma vez." : "Opcional. O valor do extrato do banco, já sem os juros futuros."}>
                  {money$(acq.payoff?.amount, (n) =>
                    setAcq("payoff", n ? { amount: n, date: acq.payoff?.date || toISO(now) } : undefined),
                  )}
                </Field>
                {acq.payoff?.amount ? (
                  <Field label="Saldo consultado em">
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        placeholder="Data do extrato"
                        max={toISO(now)}
                        value={acq.payoff?.date ?? ""}
                        onChange={(e) => setAcq("payoff", { amount: acq.payoff!.amount, date: e.target.value })}
                      />
                    )}
                  </Field>
                ) : null}
              </div>
              {acq.mode === "consortium" && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!acq.contemplated}
                      onChange={(c) => setAcq("contemplated", c)}
                      label="Já fui contemplado"
                    />
                    Já fui contemplado
                  </label>
                  {acq.contemplated && (
                    <Input
                      type="date"
                      aria-label="Data da contemplação"
                      placeholder="Quando"
                      className="w-44"
                      value={acq.contemplatedOn ?? ""}
                      onChange={(e) => setAcq("contemplatedOn", e.target.value)}
                    />
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                A parcela vira uma conta em Finanças: entra na previsão do mês, no calendário e nos avisos.
              </p>
            </div>
          )}
        </Section>

        <Section
          title="Custos do ano"
          hint="Valor e próximo vencimento. Deixe em branco o que não tiver. Cada um vira uma conta em Finanças, com aviso perto do vencimento."
        >
          <div className="flex flex-col gap-3">
            {FIXED_COSTS.map((f) => {
              const c = fixed[f.role];
              const setC = (patch: Partial<CostInput>) => setFixed((all) => ({ ...all, [f.role]: { ...all[f.role], ...patch } }));
              return (
                <CostRow
                  key={f.role}
                  icon={f.icon}
                  label={f.label}
                  cost={c}
                  onChange={setC}
                  everyOptions={f.role === "seguro" ? [1, 12] : [12]}
                />
              );
            })}
          </div>
          <Field label="Seguradora ou corretor">
            {(id) => (
              <Input
                id={id}
                value={v.insurer ?? ""}
                placeholder="Ex.: Porto Seguro, apólice 123..."
                onChange={(e) => set("insurer", e.target.value)}
              />
            )}
          </Field>
        </Section>

        <Section title="Outros custos fixos" hint="Rastreador, estacionamento, garagem, lavagem mensal...">
          {others.length > 0 && (
            <div className="flex flex-col gap-3">
              {others.map((o, i) => (
                <CostRow
                  key={o.recId ?? i}
                  cost={o}
                  editableName
                  everyOptions={EVERY_OPTIONS.map((e) => e.value)}
                  onChange={(patch) => setOthers((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                  onRemove={() => setOthers((list) => list.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setOthers((list) => [...list, { name: "", amount: 0, first: toISO(now), every: 1 }])}
          >
            <Plus />
            Adicionar custo
          </Button>
        </Section>

        <Section title="Venda">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={selling} onChange={setSelling} label="Já vendi este veículo" />
            Já vendi este veículo
          </label>
          {selling && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data da venda">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    placeholder="Quando"
                    value={v.sold?.date ?? toISO(now)}
                    onChange={(e) => set("sold", { price: v.sold?.price ?? 0, date: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Vendi por (R$)">
                {money$(v.sold?.price, (n) => set("sold", { date: v.sold?.date ?? toISO(now), price: n }))}
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Os custos e as parcelas param na data da venda, e ele sai da conta do patrimônio.
              </p>
            </div>
          )}
        </Section>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={v.notes}
              placeholder="Chassi, Renavam, onde está o documento..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {vehicle && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              const undo = remove(vehicle.id);
              onClose();
              toast({ message: `${vehicle.name} foi excluído, com os custos dele`, action: { label: "Desfazer", onClick: undo } });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{vehicle ? "Salvar alterações" : "Adicionar veículo"}</Button>
      </DialogFooter>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function CostRow({
  icon,
  label,
  cost,
  onChange,
  everyOptions,
  editableName,
  onRemove,
}: {
  icon?: string;
  label?: string;
  cost: CostInput;
  onChange: (patch: Partial<CostInput>) => void;
  everyOptions: number[];
  editableName?: boolean;
  onRemove?: () => void;
}) {
  const name = label ?? (cost.name || "custo");
  return (
    <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_11.5rem_2rem]">
      {editableName ? (
        <Input
          aria-label="Nome do custo"
          placeholder="Ex.: Rastreador"
          className="col-span-2 sm:col-span-1"
          value={cost.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      ) : (
        <span className="col-span-2 text-sm font-medium sm:col-span-1">
          {icon} {label}
        </span>
      )}
      <Input
        aria-label={`Valor do ${name}`}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        placeholder="R$ 0,00"
        value={cost.amount || ""}
        onChange={(e) => onChange({ amount: Number(e.target.value) })}
      />
      {everyOptions.length > 1 ? (
        <Select aria-label={`Frequência do ${name}`} value={String(cost.every)} onChange={(e) => onChange({ every: Number(e.target.value) })}>
          {everyOptions.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "Por mês" : n === 12 ? "Por ano" : `A cada ${n} meses`}
            </option>
          ))}
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">Por ano</span>
      )}
      <Input
        aria-label={`Vencimento do ${name}`}
        type="date"
        placeholder="Vencimento"
        className="col-span-2 sm:col-span-1"
        value={cost.first}
        onChange={(e) => onChange({ first: e.target.value })}
      />
      {onRemove ? (
        <Button variant="ghost" size="icon" aria-label={`Tirar ${name}`} onClick={onRemove} className="justify-self-end">
          <X />
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}
