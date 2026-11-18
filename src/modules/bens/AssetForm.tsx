import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { derive, dueLabel } from "@/modules/compromissos/logic";
import { useCommitments } from "@/modules/compromissos/store";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { useBens } from "./store";
import { bought, owned } from "./logic";
import { ASSET_CATEGORIES, ASSET_ICONS, GONE_REASONS, type Asset, type AssetDraft, type GoneReason } from "./types";

export function AssetForm({
  open,
  onOpenChange,
  asset,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset;
  /** Valores iniciais de um bem novo, como quando ele nasce de um móvel da Casa. */
  initial?: Partial<AssetDraft>;
  onCreated?: (asset: Asset) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={asset ? "Editar bem" : "Novo bem"}
      description={asset ? undefined : "Algo que você tem e quer acompanhar: valor, compra e garantia."}
    >
      <Content
        key={asset?.id ?? "novo"}
        asset={asset}
        initial={initial}
        onCreated={onCreated}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function Content({
  asset,
  initial,
  onCreated,
  onClose,
}: {
  asset?: Asset;
  initial?: Partial<AssetDraft>;
  onCreated?: (asset: Asset) => void;
  onClose: () => void;
}) {
  const { assets, createAsset, updateAsset, removeAsset, restoreAsset } = useBens();
  const known = (key: "brand" | "store") =>
    [...new Set(assets.map((a) => a[key]?.trim() ?? "").filter(Boolean))].sort((x, y) => x.localeCompare(y, "pt-BR"));
  const toast = useToast();
  const linked = useCommitments().commitments.filter((c) => asset && c.assetId === asset.id);
  const [draft, setDraft] = useState<AssetDraft>({
    name: asset?.name ?? "",
    icon: asset?.icon ?? "📦",
    category: asset?.category ?? ASSET_CATEGORIES[0],
    value: asset?.value ?? 0,
    purchaseDate: asset?.purchaseDate ?? "",
    warrantyUntil: asset?.warrantyUntil ?? "",
    location: asset?.location ?? "",
    brand: asset?.brand ?? "",
    store: asset?.store ?? "",
    quantity: asset ? bought(asset) : 1,
    owned: asset ? owned(asset) : 1,
    goneReason: asset?.goneReason,
    goneDate: asset?.goneDate ?? "",
    notes: asset?.notes ?? "",
    ...(asset ? {} : initial),
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const categories = ASSET_CATEGORIES.includes(draft.category)
    ? ASSET_CATEGORIES
    : [...ASSET_CATEGORIES, draft.category];

  const quantity = Math.max(1, Math.round(draft.quantity || 1));
  const kept = Math.min(quantity, Math.max(0, draft.owned ?? quantity));
  const someGone = kept < quantity;
  const setQuantity = (n: number) =>
    setDraft((d) => {
      const prev = Math.max(1, Math.round(d.quantity || 1));
      const next = Math.max(1, Math.round(n || 1));
      // Se tinha todas, continua com todas; senão mantém quantas tinha, até o novo total.
      const o = d.owned ?? prev;
      return { ...d, quantity: next, owned: o >= prev ? next : Math.min(o, next) };
    });

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao bem.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      brand: (draft.brand ?? "").trim(),
      store: (draft.store ?? "").trim(),
      notes: draft.notes.trim(),
      value: Math.max(0, draft.value || 0),
      quantity,
      owned: kept,
      goneReason: someGone ? (draft.goneReason ?? "other") : undefined,
      goneDate: someGone ? (draft.goneDate ?? "") : undefined,
    };
    if (asset) {
      updateAsset(asset.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      onCreated?.(createAsset(clean));
      toast({ message: `${clean.name} foi adicionado aos seus bens` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={ASSET_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!asset}
                placeholder="Ex.: Geladeira frost free"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Valor pago (R$)" hint={quantity > 1 ? "O total, somando todas as unidades." : undefined}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={draft.value || ""}
                onChange={(e) => set("value", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Data da compra">
            {(id) => (
              <Input
                placeholder="Quando comprou"
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
              />
            )}
          </Field>
          <Field label="Garantia até" hint="Deixe em branco se não tiver.">
            {(id) => (
              <Input
                placeholder="Sem garantia"
                id={id}
                type="date"
                value={draft.warrantyUntil}
                onChange={(e) => set("warrantyUntil", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantos comprei">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                step={1}
                placeholder="1"
                inputMode="numeric"
                value={draft.quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            )}
          </Field>
          <Field label={quantity > 1 ? "Quantos ainda tenho" : "Ainda tenho?"}>
            {(id) => (
              <Select id={id} value={String(kept)} onChange={(e) => set("owned", Number(e.target.value))}>
                {quantity === 1 ? (
                  <>
                    <option value="1">Sim, ainda tenho</option>
                    <option value="0">Não tenho mais</option>
                  </>
                ) : (
                  Array.from({ length: quantity + 1 }, (_, i) => quantity - i).map((n) => (
                    <option key={n} value={String(n)}>
                      {n === quantity ? `Todos os ${n}` : n === 0 ? "Nenhum, não tenho mais" : String(n)}
                    </option>
                  ))
                )}
              </Select>
            )}
          </Field>
          {someGone && (
            <>
              <Field label={kept === 0 ? "O que aconteceu" : "O que houve com os outros"}>
                {(id) => (
                  <Select
                    id={id}
                    value={draft.goneReason ?? "other"}
                    onChange={(e) => set("goneReason", e.target.value as GoneReason)}
                  >
                    {GONE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Quando">
                {(id) => (
                  <Input
                    placeholder="Quando saiu"
                    id={id}
                    type="date"
                    max={toISO(today())}
                    value={draft.goneDate ?? ""}
                    onChange={(e) => set("goneDate", e.target.value)}
                  />
                )}
              </Field>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca">
            {(id) => (
              <>
                <Input
                  id={id}
                  list="bens-marcas"
                  value={draft.brand ?? ""}
                  placeholder="Ex.: Apple, Stanley"
                  onChange={(e) => set("brand", e.target.value)}
                />
                <datalist id="bens-marcas">
                  {known("brand").map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Onde comprei">
            {(id) => (
              <>
                <Input
                  id={id}
                  list="bens-lojas"
                  value={draft.store ?? ""}
                  placeholder="Ex.: Amazon, Mercado Livre"
                  onChange={(e) => set("store", e.target.value)}
                />
                <datalist id="bens-lojas">
                  {known("store").map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>

        <Field label="Onde fica">
          {(id) => (
            <Input
              id={id}
              value={draft.location}
              placeholder="Ex.: Cozinha, escritório, garagem"
              onChange={(e) => set("location", e.target.value)}
            />
          )}
        </Field>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Número de série, onde está a nota fiscal..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
        {linked.length > 0 && (
          <section>
            <h3 className="text-sm font-medium">Manutenção</h3>
            <ul className="mt-1.5 overflow-hidden rounded-lg border border-border">
              {linked.map((c) => {
                const d = derive(c);
                return (
                  <li key={c.id} className="border-b border-border last:border-b-0">
                    <Link
                      to={`/compromissos?c=${c.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-hover"
                    >
                      <span className="min-w-0 truncate">
                        {c.icon} {c.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm",
                          d.status === "overdue" ? "text-danger-strong" : d.status === "soon" ? "text-warning-strong" : "text-muted-foreground",
                        )}
                      >
                        {dueLabel(d)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </DialogBody>
      <DialogFooter>
        {asset && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeAsset(asset.id);
              onClose();
              toast({
                message: `${asset.name} foi excluído`,
                action: { label: "Desfazer", onClick: () => restoreAsset(asset) },
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
        <Button type="submit">{asset ? "Salvar alterações" : "Adicionar bem"}</Button>
      </DialogFooter>
    </form>
  );
}
