import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { PRIORITY_META, PRIORITY_ORDER } from "./logic";
import { useBens } from "./store";
import { ASSET_ICONS, type Wish, type WishDraft, type WishPriority } from "./types";

export function WishForm({
  open,
  onOpenChange,
  wish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wish?: Wish;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={wish ? "Editar desejo" : "Novo desejo"}
      description={wish ? undefined : "Algo que você quer comprar, com preço e prioridade."}
    >
      <Content key={wish?.id ?? "novo"} wish={wish} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ wish, onClose }: { wish?: Wish; onClose: () => void }) {
  const { createWish, updateWish, removeWish, restoreWish } = useBens();
  const toast = useToast();
  const [draft, setDraft] = useState<WishDraft>({
    name: wish?.name ?? "",
    icon: wish?.icon ?? "📦",
    price: wish?.price ?? 0,
    priority: wish?.priority ?? "medium",
    targetDate: wish?.targetDate ?? "",
    link: wish?.link ?? "",
    notes: wish?.notes ?? "",
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof WishDraft>(key: K, value: WishDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao desejo.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      link: draft.link.trim(),
      notes: draft.notes.trim(),
      price: Math.max(0, draft.price || 0),
    };
    if (wish) {
      updateWish(wish.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createWish(clean);
      toast({ message: `${clean.name} entrou na lista de desejos` });
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
                autoFocus={!wish}
                placeholder="Ex.: Cadeira ergonômica"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Preço (R$)">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={draft.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Prioridade">
            {(id) => (
              <Select
                id={id}
                value={draft.priority}
                onChange={(e) => set("priority", e.target.value as WishPriority)}
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Comprar até">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={draft.targetDate}
                onChange={(e) => set("targetDate", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Link">
          {(id) => (
            <Input
              id={id}
              type="url"
              inputMode="url"
              value={draft.link}
              placeholder="https://"
              onChange={(e) => set("link", e.target.value)}
            />
          )}
        </Field>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Modelo, cor, onde está mais barato..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {wish && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeWish(wish.id);
              onClose();
              toast({
                message: `${wish.name} saiu da lista de desejos`,
                action: { label: "Desfazer", onClick: () => restoreWish(wish) },
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
        <Button type="submit">{wish ? "Salvar alterações" : "Adicionar desejo"}</Button>
      </DialogFooter>
    </form>
  );
}
