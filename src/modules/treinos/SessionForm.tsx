import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { INTENSITY_META, newestFirst, pace } from "./logic";
import { useTreinos } from "./store";
import { FIGHT_STYLES, type Exercise, type Intensity, type Session, type SessionDraft } from "./types";

const EMPTY_EXERCISE: Exercise = { name: "", sets: 3, reps: 10, weight: 0 };

export function SessionForm({
  open,
  onOpenChange,
  session,
  defaultModalityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: Session;
  /** Modalidade já escolhida ao registrar um treino novo. */
  defaultModalityId?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={session ? "Editar treino" : "Registrar treino"}
      className="max-w-xl"
    >
      <Content
        key={session?.id ?? `novo-${defaultModalityId}`}
        session={session}
        defaultModalityId={defaultModalityId}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function Content({
  session,
  defaultModalityId,
  onClose,
}: {
  session?: Session;
  defaultModalityId?: string;
  onClose: () => void;
}) {
  const { modalities, sessions, createSession, updateSession, removeSession, restoreSession } =
    useTreinos();
  const toast = useToast();
  const [draft, setDraft] = useState<SessionDraft>(() => ({
    modalityId: session?.modalityId ?? defaultModalityId ?? modalities[0]?.id ?? "",
    date: session?.date ?? toISO(today()),
    duration: session?.duration ?? 60,
    intensity: session?.intensity ?? "moderado",
    notes: session?.notes ?? "",
    distance: session?.distance ?? 0,
    rounds: session?.rounds ?? 0,
    style: session?.style ?? "",
    exercises: session?.exercises ?? [],
  }));
  const set = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const modality = modalities.find((m) => m.id === draft.modalityId);
  const kind = modality?.kind ?? "other";
  const lastOfModality = sessions
    .filter((s) => s.modalityId === draft.modalityId && s.id !== session?.id)
    .sort(newestFirst)[0];

  const setExercise = (index: number, patch: Partial<Exercise>) =>
    set(
      "exercises",
      draft.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!modality || !draft.date) return;
    // Guarda só os campos do tipo da modalidade, para não sobrar dado escondido.
    const clean: SessionDraft = {
      ...draft,
      notes: draft.notes.trim(),
      duration: Math.max(0, draft.duration || 0),
      distance: kind === "distance" ? Math.max(0, draft.distance || 0) : 0,
      rounds: kind === "fight" ? Math.max(0, Math.floor(draft.rounds || 0)) : 0,
      style: kind === "fight" ? draft.style.trim() : "",
      exercises:
        kind === "strength"
          ? draft.exercises
              .filter((x) => x.name.trim())
              .map((x) => ({ ...x, name: x.name.trim() }))
          : [],
    };
    if (session) {
      updateSession(session.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createSession(clean);
      toast({ message: `Treino de ${modality.name.toLowerCase()} registrado` });
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
          <Field label="Data">
            {(id) => (
              <Input
                id={id}
                type="date"
                max={toISO(today())}
                value={draft.date}
                required
                onChange={(e) => set("date", e.target.value)}
              />
            )}
          </Field>
          <Field label="Duração (minutos)">
            {(id) => (
              <Input
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
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Exercícios</legend>
            {draft.exercises.length > 0 && (
              <div
                aria-hidden
                className="hidden grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem_1.75rem] gap-2 text-xs text-muted-foreground sm:grid"
              >
                <span>Exercício</span>
                <span>Séries</span>
                <span>Reps</span>
                <span>Carga (kg)</span>
                <span />
              </div>
            )}
            {draft.exercises.map((x, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1.75rem] items-center gap-2 max-sm:pb-2 sm:grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem_1.75rem]"
              >
                <Input
                  aria-label={`Exercício ${i + 1}`}
                  value={x.name}
                  placeholder="Ex.: Supino reto"
                  className="col-span-3 sm:col-span-1"
                  onChange={(e) => setExercise(i, { name: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 sm:order-last"
                  aria-label={`Remover o exercício ${i + 1}`}
                  onClick={() => set("exercises", draft.exercises.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
                <Input
                  aria-label={`Séries do exercício ${i + 1}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="px-2"
                  placeholder="Séries"
                  value={x.sets || ""}
                  onChange={(e) => setExercise(i, { sets: Number(e.target.value) })}
                />
                <Input
                  aria-label={`Repetições do exercício ${i + 1}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="px-2"
                  placeholder="Reps"
                  value={x.reps || ""}
                  onChange={(e) => setExercise(i, { reps: Number(e.target.value) })}
                />
                <Input
                  aria-label={`Carga do exercício ${i + 1}, em kg`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className="px-2"
                  placeholder="kg"
                  value={x.weight || ""}
                  onChange={(e) => setExercise(i, { weight: Number(e.target.value) })}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => set("exercises", [...draft.exercises, { ...EMPTY_EXERCISE }])}
              >
                <Plus />
                Adicionar exercício
              </Button>
              {draft.exercises.length === 0 && lastOfModality && lastOfModality.exercises.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => set("exercises", lastOfModality.exercises.map((x) => ({ ...x })))}
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
        <Button type="submit">{session ? "Salvar alterações" : "Registrar treino"}</Button>
      </DialogFooter>
    </form>
  );
}
