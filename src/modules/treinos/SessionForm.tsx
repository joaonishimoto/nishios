import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { INTENSITY_META, newestFirst, pace } from "./logic";
import { finalize, fromPlan, StrengthEditor, toDraft, type DraftExercise } from "./StrengthEditor";
import { useTreinos } from "./store";
import { FIGHT_STYLES, type Intensity, type Session, type SessionDraft } from "./types";

const newExercise = (): DraftExercise => ({ key: crypto.randomUUID(), name: "", sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }] });

export function SessionForm({
  open,
  onOpenChange,
  session,
  defaultModalityId,
  defaultPlanId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: Session;
  /** Modalidade já escolhida ao registrar um treino novo. */
  defaultModalityId?: string;
  /** Ficha para começar o treino, já com os exercícios dela. */
  defaultPlanId?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={session?.planned ? "Treino planejado" : session ? "Editar treino" : "Registrar treino"}
      className="max-w-2xl"
    >
      <Content
        key={session?.id ?? `novo-${defaultModalityId}-${defaultPlanId}`}
        session={session}
        defaultModalityId={defaultModalityId}
        defaultPlanId={defaultPlanId}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function Content({
  session,
  defaultModalityId,
  defaultPlanId,
  onClose,
}: {
  session?: Session;
  defaultModalityId?: string;
  defaultPlanId?: string;
  onClose: () => void;
}) {
  const { modalities, sessions, createSession, updateSession, removeSession, restoreSession, exercises: catalog, addExercises, plans } =
    useTreinos();
  const startPlan = session ? undefined : plans.find((p) => p.id === defaultPlanId);
  const [planId, setPlanId] = useState<string>(session?.planId ?? startPlan?.id ?? "");
  const [strength, setStrength] = useState<DraftExercise[]>(() =>
    session ? session.exercises.map(toDraft) : startPlan ? fromPlan(startPlan, catalog, sessions) : [],
  );
  const toast = useToast();
  const [draft, setDraft] = useState<SessionDraft>(() => ({
    modalityId:
      session?.modalityId ??
      (startPlan ? (modalities.find((m) => m.id === defaultModalityId && m.kind === "strength") ?? modalities.find((m) => m.kind === "strength"))?.id : undefined) ??
      defaultModalityId ??
      modalities[0]?.id ??
      "",
    date: session?.date ?? toISO(today()),
    duration: session?.duration ?? 60,
    intensity: session?.intensity ?? "moderado",
    notes: session?.notes ?? "",
    distance: session?.distance ?? 0,
    rounds: session?.rounds ?? 0,
    style: session?.style ?? "",
    exercises: session?.exercises ?? [],
    planned: session?.planned,
  }));
  /** Data para a frente = treino planejado. Chegou o dia e você salvou = feito. */
  const future = draft.date > toISO(today());
  const set = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const modality = modalities.find((m) => m.id === draft.modalityId);
  const kind = modality?.kind ?? "other";
  const lastOfModality = sessions
    .filter((s) => s.modalityId === draft.modalityId && s.id !== session?.id)
    .sort(newestFirst)[0];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!modality || !draft.date) return;
    const strong = kind === "strength" ? finalize(strength, catalog) : { exercises: [], created: [] };
    addExercises(strong.created);
    // Guarda só os campos do tipo da modalidade, para não sobrar dado escondido.
    const clean: SessionDraft = {
      ...draft,
      notes: draft.notes.trim(),
      duration: Math.max(0, draft.duration || 0),
      distance: kind === "distance" ? Math.max(0, draft.distance || 0) : 0,
      rounds: kind === "fight" ? Math.max(0, Math.floor(draft.rounds || 0)) : 0,
      style: kind === "fight" ? draft.style.trim() : "",
      exercises: strong.exercises,
      planned: future,
      planId: kind === "strength" && planId ? planId : undefined,
    };
    if (session) {
      updateSession(session.id, clean);
      toast({ message: session.planned && !future ? "Treino marcado como feito" : "Alterações salvas" });
    } else {
      createSession(clean);
      toast({ message: `Treino de ${modality.name.toLowerCase()} ${future ? "planejado" : "registrado"}` });
    }
    onClose();
  }

  const currentPace =
    modality && kind === "distance" ? pace(draft.distance, draft.duration, modality.unit) : null;

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modalidade">
            {(id) => (
              <Select id={id} value={draft.modalityId} onChange={(e) => set("modalityId", e.target.value)}>
                {modalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Data" hint={future ? "Dia que ainda não chegou: fica como treino planejado." : undefined}>
            {(id) => (
              <Input
                placeholder="Escolher a data"
                id={id}
                type="date"
                value={draft.date}
                required
                onChange={(e) => set("date", e.target.value)}
              />
            )}
          </Field>
          <Field label="Duração (minutos)">
            {(id) => (
              <Input
                placeholder="Ex.: 60"
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={draft.duration || ""}
                onChange={(e) => set("duration", Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Intensidade">
            {(id) => (
              <Select
                id={id}
                value={draft.intensity}
                onChange={(e) => set("intensity", e.target.value as Intensity)}
              >
                {(Object.keys(INTENSITY_META) as Intensity[]).map((i) => (
                  <option key={i} value={i}>
                    {INTENSITY_META[i].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {kind === "distance" && modality && (
          <Field
            label={`Distância (${modality.unit})`}
            hint={currentPace ? `Ritmo: ${currentPace}` : "Com distância e duração, o ritmo é calculado."}
          >
            {(id) => (
              <Input
                placeholder="Ex.: 5"
                id={id}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className="sm:w-1/2"
                value={draft.distance || ""}
                onChange={(e) => set("distance", Number(e.target.value))}
              />
            )}
          </Field>
        )}

        {kind === "fight" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estilo">
              {(id) => (
                <>
                  <Input
                    id={id}
                    list={`${id}-estilos`}
                    value={draft.style}
                    placeholder="Ex.: Muay thai"
                    onChange={(e) => set("style", e.target.value)}
                  />
                  <datalist id={`${id}-estilos`}>
                    {FIGHT_STYLES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field label="Rounds">
              {(id) => (
                <Input
                  placeholder="Ex.: 5"
                  id={id}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.rounds || ""}
                  onChange={(e) => set("rounds", Number(e.target.value))}
                />
              )}
            </Field>
          </div>
        )}

        {kind === "strength" && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-medium">Exercícios</legend>
            {plans.length > 0 && (
              <Field
                label="Ficha"
                hint={planId && !session ? "Os exercícios vêm da ficha, com as cargas da última vez." : undefined}
              >
                {(id) => (
                  <Select
                    id={id}
                    value={planId}
                    onChange={(e) => {
                      const plan = plans.find((p) => p.id === e.target.value);
                      setPlanId(e.target.value);
                      if (plan) setStrength(fromPlan(plan, catalog, sessions.filter((s) => s.id !== session?.id)));
                    }}
                  >
                    <option value="">Sem ficha</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <StrengthEditor
              value={strength}
              onChange={setStrength}
              catalog={catalog}
              sessions={sessions}
              currentSessionId={session?.id}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setStrength((list) => [...list, newExercise()])}>
                <Plus />
                Adicionar exercício
              </Button>
              {strength.length === 0 && lastOfModality && lastOfModality.exercises.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setStrength(lastOfModality.exercises.map(toDraft));
                    if (lastOfModality.planId) setPlanId(lastOfModality.planId);
                  }}
                >
                  Copiar do último treino
                </Button>
              )}
            </div>
          </fieldset>
        )}

        <Field label="Anotações">
          {(id) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Como foi, o que ajustar na próxima..."
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {session && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeSession(session.id);
              onClose();
              toast({
                message: "Treino excluído",
                action: { label: "Desfazer", onClick: () => restoreSession(session) },
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
        <Button type="submit">
          {future ? (session ? "Salvar plano" : "Planejar treino") : session?.planned ? "Marcar como feito" : session ? "Salvar alterações" : "Registrar treino"}
        </Button>
      </DialogFooter>
    </form>
  );
}
