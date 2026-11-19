import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { formatMinutes, parseDuration } from "./logic";
import { useTasks } from "./store";
import type { TimeEntry } from "./types";

/** Registrar (ou editar) horas trabalhadas num projeto. */
export function TimeForm({
  open,
  onOpenChange,
  projectId,
  taskId,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  taskId?: string;
  entry?: TimeEntry;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={entry ? "Editar horas" : "Registrar horas"}>
      <Content
        key={entry?.id ?? `${projectId}-${taskId}-${open}`}
        entry={entry}
        projectId={entry?.projectId ?? projectId ?? ""}
        taskId={entry?.taskId ?? taskId ?? ""}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function Content({
  entry,
  projectId: initialProject,
  taskId: initialTask,
  onClose,
}: {
  entry?: TimeEntry;
  projectId: string;
  taskId: string;
  onClose: () => void;
}) {
  const { projects, tasks, logTime, updateTime, removeTime, restoreTime } = useTasks();
  const toast = useToast();
  const active = projects.filter((p) => !p.archived || p.id === initialProject);
  const [projectId, setProjectId] = useState(initialProject || active[0]?.id || "");
  const [taskId, setTaskId] = useState(initialTask);
  const [date, setDate] = useState(entry?.date ?? toISO(today()));
  const [duration, setDuration] = useState(entry ? formatMinutes(entry.minutes).replace(" min", "min") : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [tried, setTried] = useState(false);

  const minutes = parseDuration(duration);
  const durationError = minutes && minutes > 0 ? undefined : "Use, por exemplo, 1h30, 1:30, 1,5 ou 45min.";
  const projectError = projectId ? undefined : "Crie um projeto antes de registrar horas.";
  const projectTasks = tasks.filter((t) => t.projectId === projectId && (t.status !== "done" || t.id === taskId));

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (durationError || projectError || !minutes) return;
    const fields = { projectId, taskId: projectTasks.some((t) => t.id === taskId) ? taskId : "", date, minutes, note: note.trim() };
    if (entry) {
      updateTime(entry.id, fields);
      toast({ message: "Horas atualizadas" });
    } else {
      logTime(fields);
      toast({ message: `${formatMinutes(minutes)} registradas` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Projeto" error={tried ? projectError : undefined}>
            {(id) => (
              <Select id={id} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dia">
            {(id) => <Input id={id} type="date" value={date} placeholder="Hoje" onChange={(e) => setDate(e.target.value || toISO(today()))} />}
          </Field>
          <Field
            label="Tempo"
            error={tried ? durationError : undefined}
            hint={!tried && minutes ? `= ${formatMinutes(minutes)}` : undefined}
          >
            {(id) => (
              <Input
                id={id}
                value={duration}
                autoFocus
                inputMode="text"
                placeholder="1h30"
                onChange={(e) => setDuration(e.target.value)}
              />
            )}
          </Field>
          <Field label="Tarefa" hint="Opcional.">
            {(id) => (
              <Select id={id} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">O projeto em geral</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || "Sem título"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="O que foi feito">
          {(id) => (
            <Input id={id} value={note} placeholder="Ex.: Reunião de alinhamento" onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {entry && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeTime(entry.id);
              onClose();
              toast({ message: "Horas excluídas", action: { label: "Desfazer", onClick: () => restoreTime(entry) } });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{entry ? "Salvar" : "Registrar"}</Button>
      </DialogFooter>
    </form>
  );
}
