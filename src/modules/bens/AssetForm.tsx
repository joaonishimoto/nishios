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
import { ASSET_CATEGORIES, ASSET_ICONS, type Asset, type AssetDraft } from "./types";

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
  const { createAsset, updateAsset, removeAsset, restoreAsset } = useBens();
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
    notes: asset?.notes ?? "",
    ...(asset ? {} : initial),
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const categories = ASSET_CATEGORIES.includes(draft.category)
    ? ASSET_CATEGORIES
    : [...ASSET_CATEGORIES, draft.category];

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao bem.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      value: Math.max(0, draft.value || 0),
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
          <Field label="Valor pago (R$)">
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
