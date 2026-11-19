import { useId, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { shortDate } from "@/lib/dates";
import { historyByExercise, normalizeName, repsLabel, resolveByName, setsLabel, setsOf, summarizeSets, kg } from "./strength";
import { EQUIPMENT_LABELS, type Exercise, type ExerciseDef, type Plan, type Session, type SetEntry } from "./types";

/** Exercício em edição no formulário do treino. */
export interface DraftExercise {
  key: string;
  name: string;
  exerciseId?: string;
  sets: SetEntry[];
  /** O que a ficha pede, para mostrar ao lado: "4 × 8–10 · 70 kg". */
  target?: string;
}

export const toDraft = (e: Exercise): DraftExercise => ({
  key: crypto.randomUUID(),
  name: e.name,
  exerciseId: e.exerciseId,
  sets: setsOf(e).map((s) => ({ ...s })),
});

/** Monta os exercícios a partir da ficha, repetindo o que foi feito da última vez quando há. */
export function fromPlan(plan: Plan, catalog: ExerciseDef[], sessions: Session[]): DraftExercise[] {
  const histories = historyByExercise(sessions);
  return plan.items.map((item) => {
    const def = catalog.find((d) => d.id === item.exerciseId);
    const last = histories.get(item.exerciseId)?.at(-1);
    const lastSets = last ? setsOf(last.exercise) : [];
    const sets: SetEntry[] = Array.from({ length: Math.max(1, item.sets) }, (_, i) => {
      const prev = lastSets[Math.min(i, lastSets.length - 1)];
      return prev ? { ...prev } : { reps: item.repsMin, weight: item.weight };
    });
    return {
      key: crypto.randomUUID(),
      name: def?.name ?? "Exercício removido",
      exerciseId: def?.id,
      sets,
      target: `${item.sets} × ${repsLabel(item)}${item.weight > 0 ? ` · ${kg(item.weight)}` : ""}`,
    };
  });
}

/**
 * Converte o rascunho em exercícios do treino. Nomes novos viram exercícios do
 * catálogo, devolvidos em `created` para o store guardar.
 */
export function finalize(drafts: DraftExercise[], catalog: ExerciseDef[]): { exercises: Exercise[]; created: ExerciseDef[] } {
  const created: ExerciseDef[] = [];
  const exercises: Exercise[] = [];
  for (const d of drafts) {
    if (!d.name.trim()) continue;
    const known = d.exerciseId ? catalog.find((c) => c.id === d.exerciseId) : undefined;
    const def =
      known && normalizeName(known.name) === normalizeName(d.name)
        ? known
        : (() => {
            const r = resolveByName(d.name, [...catalog, ...created]);
            if (r?.created) created.push(r.def);
            return r?.def;
          })();
    const sets = d.sets.filter((s) => s.reps > 0 || s.weight > 0).map((s) => ({ reps: Math.max(0, Math.floor(s.reps || 0)), weight: Math.max(0, s.weight || 0) }));
    exercises.push({ name: def?.name ?? d.name.trim(), exerciseId: def?.id, ...summarizeSets(sets), setsDetail: sets });
  }
  return { exercises, created };
}

export function StrengthEditor({
  value,
  onChange,
  catalog,
  sessions,
  currentSessionId,
}: {
  value: DraftExercise[];
  onChange: (next: DraftExercise[]) => void;
  catalog: ExerciseDef[];
  /** Treinos feitos, para mostrar a última vez de cada exercício. */
  sessions: Session[];
  currentSessionId?: string;
}) {
  const listId = useId();
  const histories = useMemo(
    () => historyByExercise(sessions.filter((s) => s.id !== currentSessionId)),
    [sessions, currentSessionId],
  );
  const byName = useMemo(() => new Map(catalog.map((d) => [normalizeName(d.name), d])), [catalog]);

  const patch = (key: string, next: Partial<DraftExercise>) =>
    onChange(value.map((d) => (d.key === key ? { ...d, ...next } : d)));
  const setSet = (d: DraftExercise, i: number, next: Partial<SetEntry>) =>
    patch(d.key, { sets: d.sets.map((s, j) => (j === i ? { ...s, ...next } : s)) });
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <datalist id={listId}>
        {catalog.map((d) => (
          <option key={d.id} value={d.name}>
            {EQUIPMENT_LABELS[d.equipment]}
          </option>
        ))}
      </datalist>
      {value.map((d, index) => {
        const def = d.exerciseId ? catalog.find((c) => c.id === d.exerciseId) : byName.get(normalizeName(d.name));
        const last = def ? histories.get(def.id)?.at(-1) : undefined;
        return (
          <div key={d.key} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 w-5 shrink-0 text-sm text-subtle-foreground tabular-nums">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <Input
                  aria-label={`Exercício ${index + 1}`}
                  list={listId}
                  value={d.name}
                  placeholder="Ex.: Supino reto"
                  onChange={(e) => {
                    const match = byName.get(normalizeName(e.target.value));
                    patch(d.key, { name: e.target.value, exerciseId: match?.id });
                  }}
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {def ? (
                    <Badge>{EQUIPMENT_LABELS[def.equipment]}</Badge>
                  ) : (
                    d.name.trim() && <Badge tone="info">Novo no catálogo</Badge>
                  )}
                  {d.target && <span>Ficha: {d.target}</span>}
                  {last && (
                    <span>
                      Última vez, {shortDate(last.date).toLowerCase()}: {setsLabel(last.exercise)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon" className="size-8 max-sm:hidden" aria-label={`Subir o exercício ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 max-sm:hidden" aria-label={`Descer o exercício ${index + 1}`} disabled={index === value.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Remover o exercício ${index + 1}`}
                  onClick={() => onChange(value.filter((x) => x.key !== d.key))}
                >
                  <X />
                </Button>
              </div>
            </div>

            <div className="mt-3 ml-7 flex flex-col gap-1.5">
              <div aria-hidden className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] sm:grid-cols-[3rem_6.5rem_7.5rem_2rem] gap-2 text-xs text-muted-foreground">
                <span>Série</span>
                <span>Reps</span>
                <span>{def?.equipment === "halteres" ? "Kg (cada)" : "Carga (kg)"}</span>
                <span />
              </div>
              {d.sets.map((s, i) => (
                <div key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] sm:grid-cols-[3rem_6.5rem_7.5rem_2rem] items-center gap-2">
                  <span className="text-sm text-muted-foreground tabular-nums">{i + 1}ª</span>
                  <Input
                    aria-label={`Repetições da série ${i + 1} de ${d.name || `exercício ${index + 1}`}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="h-8 px-2"
                    placeholder="Reps"
                    value={s.reps || ""}
                    onChange={(e) => setSet(d, i, { reps: Number(e.target.value) })}
                  />
                  <Input
                    aria-label={`Carga da série ${i + 1} de ${d.name || `exercício ${index + 1}`}, em kg`}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    className="h-8 px-2"
                    placeholder={def?.equipment === "livre" ? "Corpo" : "kg"}
                    value={s.weight || ""}
                    onChange={(e) => setSet(d, i, { weight: Number(e.target.value) })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Remover a série ${i + 1}`}
                    disabled={d.sets.length === 1}
                    onClick={() => patch(d.key, { sets: d.sets.filter((_, j) => j !== i) })}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 self-start"
                onClick={() => patch(d.key, { sets: [...d.sets, { ...(d.sets.at(-1) ?? { reps: 10, weight: 0 }) }] })}
              >
                <Plus />
                Série
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
