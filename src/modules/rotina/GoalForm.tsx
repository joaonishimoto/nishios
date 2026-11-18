import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { startOfYear } from "date-fns";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { latest } from "@/modules/corpo/logic";
import { useCorpo } from "@/modules/corpo/store";
import { MEASURES, type MeasureId } from "@/modules/corpo/types";
import { useSkills } from "@/modules/skills/store";
import { LISTS } from "@/modules/tarefas/types";
import { useTreinos } from "@/modules/treinos/store";
import { TRAINING_METRICS } from "./linked";
import { useRoutine } from "./store";
import { ROUTINE_ICONS, type Goal, type GoalDraft, type GoalLink, type SkillMetric, type TrainingMetric } from "./types";

type SourceKind = "manual" | GoalLink["kind"];

const SOURCES: [SourceKind, string][] = [
  ["manual", "Eu atualizo"],
  ["treinos", "Treinos"],
  ["peso", "Peso (Corpo)"],
  ["gordura", "Gordura corporal (Corpo)"],
  ["medida", "Medida do corpo"],
  ["habito", "Hábito cumprido"],
  ["tarefas", "Tarefas concluídas"],
  ["skill", "Uma skill"],
  ["skills", "Skills aprendidas"],
];

export function GoalForm({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Editar meta" : "Nova meta"}
      description={goal ? undefined : "Um número aonde você quer chegar, com ou sem prazo."}
    >
      <Content key={goal?.id ?? "nova"} goal={goal} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { habits, createGoal, updateGoal, removeGoal, restoreGoal } = useRoutine();
  const { modalities } = useTreinos();
  const { entries } = useCorpo();
  const { skills } = useSkills();
  const toast = useToast();
  const yearStart = toISO(startOfYear(today()));
  const [draft, setDraft] = useState<GoalDraft>({
    name: goal?.name ?? "",
    icon: goal?.icon ?? "🎯",
    unit: goal?.unit ?? "",
    target: goal?.target ?? 0,
    current: goal?.current ?? 0,
    deadline: goal?.deadline ?? "",
    notes: goal?.notes ?? "",
    start: goal?.start,
    link: goal?.link,
  });
  const kind: SourceKind = draft.link?.kind ?? "manual";
  const body = kind === "peso" || kind === "gordura" || kind === "medida";
  const counting = kind === "treinos" || kind === "habito" || kind === "tarefas";

  /** Trocar a origem já ajusta a unidade, que quase sempre decorre dela. */
  function setSource(next: SourceKind) {
    const since = draft.link && "since" in draft.link ? draft.link.since : yearStart;
    setDraft((d) => {
      switch (next) {
        case "manual":
          return { ...d, link: undefined };
        case "treinos":
          return { ...d, link: { kind: "treinos", modalityId: "", metric: "sessions", since }, unit: "treinos", start: undefined };
        case "habito":
          return { ...d, link: { kind: "habito", habitId: habits[0]?.id ?? "", since }, unit: "dias", start: undefined };
        case "tarefas":
          return { ...d, link: { kind: "tarefas", list: "", since }, unit: "tarefas", start: undefined };
        case "peso":
          return { ...d, link: { kind: "peso" }, unit: "kg" };
        case "gordura":
          return { ...d, link: { kind: "gordura" }, unit: "%" };
        case "medida":
          return { ...d, link: { kind: "medida", measure: "cintura" }, unit: "cm" };
        case "skill": {
          const skill = skills.find((s) => s.status === "learning") ?? skills[0];
          return {
            ...d,
            link: { kind: "skill", skillId: skill?.id ?? "", metric: "materiais" },
            unit: "materiais",
            target: d.target || skill?.resources.length || 0,
            start: undefined,
          };
        }
        case "skills":
          return { ...d, link: { kind: "skills" }, unit: "skills", start: undefined };
      }
    });
  }
  // Valor medido hoje: é o ponto de partida quando a pessoa não informa outro.
  const measuredNow =
    draft.link && body
      ? (latest(entries, draft.link.kind === "medida" ? draft.link.measure : (draft.link.kind as "peso" | "gordura"))?.value ?? 0)
      : 0;
  const setLink = (link: GoalLink) => setDraft((d) => ({ ...d, link }));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameError = draft.name.trim() ? undefined : "Dê um nome à meta.";
  const targetError = draft.target > 0 ? undefined : "O alvo precisa ser maior que zero.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || targetError) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      unit: draft.unit.trim(),
      notes: draft.notes.trim(),
      current: Math.max(0, draft.current),
      // Sem ponto de partida informado, uma meta de corpo parte do valor atual.
      start: body ? (draft.start ?? (measuredNow || undefined)) : undefined,
    };
    if (goal) {
      updateGoal(goal.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createGoal(clean);
      toast({ message: `${clean.name} foi criada` });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <IconPicker icons={ROUTINE_ICONS} value={draft.icon} onChange={(i) => set("icon", i)} />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!goal}
                placeholder="Ex.: Ler 24 livros no ano"
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field
          label="De onde vem o número"
          hint={
            kind === "manual"
              ? "Você mesmo atualiza o progresso."
              : "A meta se atualiza sozinha conforme você registra nesse módulo."
          }
        >
          {(id) => (
            <Select id={id} value={kind} onChange={(e) => setSource(e.target.value as SourceKind)}>
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {draft.link?.kind === "treinos" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modalidade">
              {(id) => (
                <Select
                  id={id}
                  value={draft.link?.kind === "treinos" ? draft.link.modalityId : ""}
                  onChange={(e) => draft.link?.kind === "treinos" && setLink({ ...draft.link, modalityId: e.target.value })}
                >
                  <option value="">Todas</option>
                  {modalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="O que contar">
              {(id) => (
                <Select
                  id={id}
                  value={draft.link?.kind === "treinos" ? draft.link.metric : "sessions"}
                  onChange={(e) => {
                    if (draft.link?.kind !== "treinos") return;
                    const metric = e.target.value as TrainingMetric;
                    setDraft((d) => ({ ...d, link: { ...draft.link, metric } as GoalLink, unit: TRAINING_METRICS[metric].unit }));
                  }}
                >
                  {(Object.keys(TRAINING_METRICS) as TrainingMetric[]).map((m) => (
                    <option key={m} value={m}>
                      {TRAINING_METRICS[m].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        {draft.link?.kind === "habito" && (
          <Field label="Hábito" hint="Conta os dias em que o hábito foi cumprido.">
            {(id) => (
              <Select
                id={id}
                value={draft.link?.kind === "habito" ? draft.link.habitId : ""}
                onChange={(e) => draft.link?.kind === "habito" && setLink({ ...draft.link, habitId: e.target.value })}
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {draft.link?.kind === "tarefas" && (
          <Field label="Lista">
            {(id) => (
              <Select
                id={id}
                value={draft.link?.kind === "tarefas" ? draft.link.list : ""}
                onChange={(e) => draft.link?.kind === "tarefas" && setLink({ ...draft.link, list: e.target.value })}
              >
                <option value="">Todas</option>
                {LISTS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {draft.link?.kind === "skill" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Skill" hint={skills.length === 0 ? "Cadastre uma skill primeiro." : undefined}>
              {(id) => (
                <Select
                  id={id}
                  value={draft.link?.kind === "skill" ? draft.link.skillId : ""}
                  onChange={(e) => draft.link?.kind === "skill" && setLink({ ...draft.link, skillId: e.target.value })}
                >
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="O que contar">
              {(id) => (
                <Select
                  id={id}
                  value={draft.link?.kind === "skill" ? draft.link.metric : "materiais"}
                  onChange={(e) => {
                    if (draft.link?.kind !== "skill") return;
                    const metric = e.target.value as SkillMetric;
                    setDraft((d) => ({ ...d, link: { ...draft.link, metric } as GoalLink, unit: metric === "nivel" ? "de nível" : "materiais" }));
                  }}
                >
                  <option value="materiais">Materiais concluídos</option>
                  <option value="nivel">Nível (0 a 5)</option>
                </Select>
              )}
            </Field>
          </div>
        )}

        {draft.link?.kind === "medida" && (
          <Field label="Medida">
            {(id) => (
              <Select
                id={id}
                value={draft.link?.kind === "medida" ? draft.link.measure : "cintura"}
                onChange={(e) => setLink({ kind: "medida", measure: e.target.value as MeasureId })}
              >
                {MEASURES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {counting && draft.link && "since" in draft.link ? (
            <Field label="Contar a partir de">
              {(id) => (
                <Input
                  placeholder="Desde o início"
                  id={id}
                  type="date"
                  value={draft.link && "since" in draft.link ? draft.link.since : ""}
                  onChange={(e) => draft.link && "since" in draft.link && setLink({ ...draft.link, since: e.target.value })}
                />
              )}
            </Field>
          ) : body ? (
            <Field label="Ponto de partida" hint={measuredNow ? "Em branco, parte da medida de hoje." : "De quanto você saiu."}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.start || ""}
                  placeholder={measuredNow ? String(measuredNow).replace(".", ",") : "0"}
                  onChange={(e) => set("start", e.target.value === "" ? undefined : Number(e.target.value))}
                />
              )}
            </Field>
          ) : kind === "skill" || kind === "skills" ? null : (
          <Field label="Onde está hoje">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={draft.current || ""}
                placeholder="0"
                onChange={(e) => set("current", Number(e.target.value))}
              />
            )}
          </Field>
          )}
          <Field label="Alvo" error={tried ? targetError : undefined}>
            {(id) => (
              <Input
                placeholder="Ex.: 24"
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={draft.target || ""}
                onChange={(e) => set("target", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Unidade">
            {(id) => (
              <Input
                id={id}
                value={draft.unit}
                placeholder="livros, km, reais"
                onChange={(e) => set("unit", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Prazo" hint="Deixe em branco se não tiver.">
          {(id) => (
            <Input
              placeholder="Sem prazo"
              id={id}
              type="date"
              className="sm:w-1/2"
              value={draft.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          )}
        </Field>

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Por que essa meta importa, como vai chegar lá..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {goal && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeGoal(goal.id);
              onClose();
              toast({
                message: `${goal.name} foi excluída`,
                action: { label: "Desfazer", onClick: () => restoreGoal(goal) },
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
        <Button type="submit">{goal ? "Salvar alterações" : "Criar meta"}</Button>
      </DialogFooter>
    </form>
  );
}
