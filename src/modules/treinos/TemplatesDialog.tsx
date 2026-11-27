import { useState } from "react";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { plural } from "@/lib/format";
import { LIBRARY_BY_ID } from "./library";
import { useTreinos } from "./store";
import { formatRest, repsLabel } from "./strength";
import { LEVEL_LABELS, TEMPLATES, type TemplatePlace, type TrainingTemplate } from "./templates";
import { EQUIPMENT_LABELS } from "./types";

type Filter = "todos" | TemplatePlace;

/** Programas prontos: escolhe um, vê as fichas e copia todas ou só algumas. */
export function TemplatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [picked, setPicked] = useState<TrainingTemplate | null>(null);
  const change = (next: boolean) => {
    onOpenChange(next);
    if (!next) setPicked(null);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={change}
      title={picked ? picked.name : "Modelos de treino"}
      description={picked ? `${LEVEL_LABELS[picked.level]} · ${picked.frequency} · ${picked.goal}` : "Programas prontos para copiar. As fichas entram sem carga: ajuste os exercícios e anote os pesos."}
      className="max-w-3xl"
    >
      {picked ? <Detail template={picked} onBack={() => setPicked(null)} onDone={() => change(false)} /> : <List onPick={setPicked} />}
    </Dialog>
  );
}

function List({ onPick }: { onPick: (t: TrainingTemplate) => void }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const shown = TEMPLATES.filter((t) => filter === "todos" || t.place === filter);
  const count = (f: Filter) => TEMPLATES.filter((t) => f === "todos" || t.place === f).length;
  return (
    <DialogBody className="flex flex-col gap-4">
      <Segmented
        label="Onde treinar"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "todos", label: "Todos", count: count("todos") },
          { value: "academia", label: "Academia", count: count("academia") },
          { value: "casa", label: "Em casa", count: count("casa") },
        ]}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="flex h-full w-full flex-col rounded-lg border border-border p-4 text-left transition-colors duration-(--motion-fast) hover:border-border-strong hover:bg-surface-hover"
            >
              <span className="flex w-full items-start gap-2">
                <span className="min-w-0 flex-1 font-semibold">{t.name}</span>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
              </span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={t.level === "iniciante" ? "success" : t.level === "avancado" ? "warning" : "info"}>{LEVEL_LABELS[t.level]}</Badge>
                <Badge>{t.frequency}</Badge>
                <Badge>{plural(t.plans.length, "ficha", "fichas")}</Badge>
              </span>
              <span className="mt-2 text-sm text-muted-foreground">{t.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </DialogBody>
  );
}

function Detail({ template, onBack, onDone }: { template: TrainingTemplate; onBack: () => void; onDone: () => void }) {
  const { applyTemplate, removePlan, plans, exercises } = useTreinos();
  const toast = useToast();
  const byId = new Map(exercises.map((d) => [d.id, d]));
  const nameOf = (id: string) => byId.get(id)?.name ?? LIBRARY_BY_ID.get(id)?.name ?? "Exercício";

  const apply = (only?: number[]) => {
    const created = applyTemplate(template, only);
    toast({
      message: `${plural(created.length, "ficha adicionada", "fichas adicionadas")} de ${template.name}`,
      action: { label: "Desfazer", onClick: () => created.forEach((p) => removePlan(p.id)) },
    });
    onDone();
  };

  return (
    <>
      <DialogBody className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {template.description}
          {plans.length > 0 && ` As fichas entram depois das ${plural(plans.length, "ficha", "fichas")} que você já tem.`}
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {template.plans.map((p, index) => (
            <li key={p.name} className="flex flex-col rounded-lg border border-border p-4">
              <h3 className="font-semibold">{p.name}</h3>
              <ol className="mt-2 flex flex-1 flex-col gap-1.5 text-sm">
                {p.items.map((item, i) => {
                  const def = byId.get(item.exerciseId) ?? LIBRARY_BY_ID.get(item.exerciseId);
                  return (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="w-4 shrink-0 text-subtle-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{nameOf(item.exerciseId)}</span>
                        {def && <span className="text-muted-foreground"> · {EQUIPMENT_LABELS[def.equipment]}</span>}
                        {item.notes && <span className="block text-xs text-muted-foreground">{item.notes}</span>}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {item.sets} × {repsLabel(item)}
                        {item.rest > 0 && <span className="block text-xs text-subtle-foreground">descanso {formatRest(item.rest)}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {p.notes && <p className="mt-3 text-sm text-muted-foreground">{p.notes}</p>}
              {template.plans.length > 1 && (
                <Button variant="outline" size="sm" className="mt-3 h-8 self-start" onClick={() => apply([index])}>
                  <Plus />
                  Só esta ficha
                </Button>
              )}
            </li>
          ))}
        </ul>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" className="mr-auto" onClick={onBack}>
          <ArrowLeft />
          Outros modelos
        </Button>
        <Button onClick={() => apply()}>
          <Plus />
          {template.plans.length > 1 ? `Adicionar as ${template.plans.length} fichas` : "Adicionar a ficha"}
        </Button>
      </DialogFooter>
    </>
  );
}
