import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { plural } from "@/lib/format";
import { useTasks } from "./store";
import { PROJECT_ICONS, type Project, type ProjectDraft } from "./types";

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSaved,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSaved?: (project: Project) => void;
  onRemoved?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Editar projeto" : "Novo projeto"}
      description={project ? undefined : "Junta as tarefas de um trabalho. Dá para registrar as horas dele também, se quiser."}
    >
      <Content
        key={project?.id ?? "novo"}
        project={project}
        onClose={() => onOpenChange(false)}
        onSaved={onSaved}
        onRemoved={onRemoved}
      />
    </Dialog>
  );
}

function Content({
  project,
  onClose,
  onSaved,
  onRemoved,
}: {
  project?: Project;
  onClose: () => void;
  onSaved?: (project: Project) => void;
  onRemoved?: () => void;
}) {
  const { tasks, createProject, updateProject, removeProject, restoreProject } = useTasks();
  const toast = useToast();
  const [draft, setDraft] = useState<ProjectDraft>({
    name: project?.name ?? "",
    icon: project?.icon ?? PROJECT_ICONS[0],
    client: project?.client ?? "",
    notes: project?.notes ?? "",
    hourlyRate: project?.hourlyRate ?? 0,
    archived: project?.archived ?? false,
  });
  const [rate, setRate] = useState(project?.hourlyRate ? String(project.hourlyRate).replace(".", ",") : "");
  const [tried, setTried] = useState(false);
  const nameError = draft.name.trim() ? undefined : "Dê um nome ao projeto.";
  const taskCount = project ? tasks.filter((t) => t.projectId === project.id).length : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError) return;
    const hourlyRate = Math.max(0, Number(rate.replace(/\./g, "").replace(",", ".")) || 0);
    const clean = { ...draft, name: draft.name.trim(), client: draft.client.trim(), hourlyRate };
    if (project) {
      updateProject(project.id, clean);
      toast({ message: "Alterações salvas" });
      onSaved?.({ ...project, ...clean });
    } else {
      const created = createProject(clean);
      toast({ message: `${clean.name} foi criado` });
      onSaved?.(created);
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={PROJECT_ICONS} value={draft.icon} onChange={(icon) => setDraft((d) => ({ ...d, icon }))} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!project}
                placeholder="Ex.: Site da confeitaria"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente" hint="Opcional.">
            {(id) => (
              <Input
                id={id}
                value={draft.client}
                placeholder="Ex.: Doce Ateliê"
                onChange={(e) => setDraft((d) => ({ ...d, client: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Valor da hora (R$)" hint="Opcional. Mostra quanto as horas registradas valem.">
            {(id) => (
              <Input id={id} inputMode="decimal" value={rate} placeholder="0,00" onChange={(e) => setRate(e.target.value)} />
            )}
          </Field>
        </div>
        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Escopo, contatos, links do projeto..."
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          )}
        </Field>
        {project && (
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={draft.archived}
              onChange={(c) => setDraft((d) => ({ ...d, archived: c }))}
              label="Arquivar projeto"
            />
            Arquivado: sai da barra de projetos, mas as tarefas e horas continuam.
          </label>
        )}
      </DialogBody>
      <DialogFooter>
        {project && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              const snapshot = removeProject(project.id);
              onClose();
              onRemoved?.();
              if (!snapshot) return;
              toast({
                message:
                  taskCount > 0
                    ? `${project.name} foi excluído; ${plural(taskCount, "tarefa ficou", "tarefas ficaram")} sem projeto`
                    : `${project.name} foi excluído`,
                action: { label: "Desfazer", onClick: () => restoreProject(snapshot) },
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
        <Button type="submit">{project ? "Salvar" : "Criar projeto"}</Button>
      </DialogFooter>
    </form>
  );
}
