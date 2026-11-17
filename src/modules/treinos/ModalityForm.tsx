import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { useTreinos } from "./store";
import {
  KIND_LABELS,
  TRAINING_ICONS,
  type DistanceUnit,
  type Modality,
  type ModalityDraft,
  type ModalityKind,
} from "./types";

export function ModalityForm({
  open,
  onOpenChange,
  modality,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modality?: Modality;
  onRemoved?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={modality ? "Editar modalidade" : "Nova modalidade"}
      description={
        modality
          ? undefined
          : "Um tipo de atividade física. O tipo escolhido define o que você registra em cada treino."
      }
    >
      <Content
        key={modality?.id ?? "nova"}
        modality={modality}
        onClose={() => onOpenChange(false)}
        onRemoved={onRemoved}
      />
    </Dialog>
  );
}

function Content({
  modality,
  onClose,
  onRemoved,
}: {
  modality?: Modality;
  onClose: () => void;
  onRemoved?: () => void;
}) {
  const { sessions, createModality, updateModality, removeModality, restoreModality } = useTreinos();
  const toast = useToast();
  const [draft, setDraft] = useState<ModalityDraft>({
    name: modality?.name ?? "",
    icon: modality?.icon ?? "🏃",
    kind: modality?.kind ?? "distance",
    unit: modality?.unit ?? "km",
  });
  const [tried, setTried] = useState(false);
  const nameError = draft.name.trim() ? undefined : "Dê um nome à modalidade.";
  const count = modality ? sessions.filter((s) => s.modalityId === modality.id).length : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const clean = { ...draft, name: draft.name.trim() };
    if (modality) {
      updateModality(modality.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createModality(clean);
      toast({ message: `${clean.name} foi criada` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker
            icons={TRAINING_ICONS}
            value={draft.icon}
            onChange={(icon) => setDraft((d) => ({ ...d, icon }))}
          />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!modality}
                placeholder="Ex.: Ciclismo"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            )}
          </Field>
        </div>
        <Field
          label="O que registrar em cada treino"
          hint={
            modality && count > 0
              ? "Mudar o tipo não apaga o que já foi registrado; só muda os campos mostrados."
              : undefined
          }
        >
          {(id) => (
            <Select
              id={id}
              value={draft.kind}
              onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as ModalityKind }))}
            >
              {(Object.keys(KIND_LABELS) as ModalityKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {draft.kind === "distance" && (
          <Field label="Unidade da distância">
            {(id) => (
              <Select
                id={id}
                className="sm:w-1/2"
                value={draft.unit}
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value as DistanceUnit }))}
              >
                <option value="km">Quilômetros (km)</option>
                <option value="m">Metros (m)</option>
              </Select>
            )}
          </Field>
        )}
      </DialogBody>
      <DialogFooter>
        {modality && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              const removed = sessions.filter((s) => s.modalityId === modality.id);
              removeModality(modality.id);
              onClose();
              onRemoved?.();
              toast({
                message:
                  removed.length > 0
                    ? `${modality.name} e ${removed.length} ${removed.length === 1 ? "treino foram excluídos" : "treinos foram excluídos"}`
                    : `${modality.name} foi excluída`,
                action: { label: "Desfazer", onClick: () => restoreModality(modality, removed) },
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
        <Button type="submit">{modality ? "Salvar alterações" : "Criar modalidade"}</Button>
      </DialogFooter>
    </form>
  );
}
