import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/dates";
import { PRIORITY_META, PRIORITY_ORDER } from "./logic";
import { useTasks } from "./store";
import { TaskCheck } from "./TaskBits";
import { LISTS, type Priority, type Task, type TaskStatus } from "./types";

const STATUS_OPTIONS: [TaskStatus, string][] = [
  ["todo", "A fazer"],
  ["doing", "Em andamento"],
  ["done", "Concluída"],
];

/** Painel lateral da tarefa. Como no Notion, cada campo salva na hora. */
export function TaskPanel({ task, onClose }: { task: Task | undefined; onClose: () => void }) {
  return (
    <Dialog
      variant="sheet"
      open={!!task}
      onOpenChange={(o) => !o && onClose()}
      title={task?.title || "Tarefa"}
      hideTitle
    >
      {task && <PanelContent task={task} onClose={onClose} />}
    </Dialog>
  );
}

function PanelContent({ task, onClose }: { task: Task; onClose: () => void }) {
  const { update, remove, restore } = useTasks();
  const toast = useToast();
  const lists = LISTS.includes(task.list) ? LISTS : [...LISTS, task.list];

  return (
    <>
      <DialogBody className="flex flex-col gap-6 pt-12">
        <div className="flex items-start gap-3">
          <div className="pt-1.5">
            <TaskCheck task={task} size="lg" />
          </div>
          <textarea
            aria-label="Título da tarefa"
            value={task.title}
            rows={1}
            placeholder="Sem título"
            onChange={(e) => update(task.id, { title: e.target.value.replace(/\n/g, "") })}
            className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent text-xl font-semibold tracking-tight placeholder:text-subtle-foreground focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Situação">
            {(id) => (
              <Select
                id={id}
                value={task.status}
                onChange={(e) => update(task.id, { status: e.target.value as TaskStatus })}
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prioridade">
            {(id) => (
              <Select
                id={id}
                value={task.priority}
                onChange={(e) => update(task.id, { priority: e.target.value as Priority })}
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prazo">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={task.due}
                onChange={(e) => update(task.id, { due: e.target.value })}
              />
            )}
          </Field>
          <Field label="Lista">
            {(id) => (
              <Select id={id} value={task.list} onChange={(e) => update(task.id, { list: e.target.value })}>
                {lists.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={task.notes}
              placeholder="Detalhes, links, próximos passos..."
              className="min-h-32"
              onChange={(e) => update(task.id, { notes: e.target.value })}
            />
          )}
        </Field>

        <p className="text-sm text-muted-foreground">
          Criada em {formatDate(task.createdAt.slice(0, 10))}
          {task.completedAt && `, concluída em ${formatDate(task.completedAt)}`}
          . As alterações são salvas na hora.
        </p>
      </DialogBody>

      <div className="flex items-center border-t border-border px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 hover:bg-danger-soft hover:text-danger-strong"
          onClick={() => {
            remove(task.id);
            onClose();
            toast({
              message: "Tarefa excluída",
              action: { label: "Desfazer", onClick: () => restore(task) },
            });
          }}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>
    </>
  );
}
