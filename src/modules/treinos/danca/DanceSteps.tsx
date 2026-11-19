import { useMemo, useState, type FormEvent } from "react";
import { Footprints, Lightbulb, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { shortDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { BeltLabel, BeltSwatch, BeltTrack } from "./Belt";
import { currentLevel, lastChange, LEVEL_META, levelIndex, recentChanges } from "./levels";
import { StepPanel } from "./StepPanel";
import { useDance } from "./store";
import { LEVEL_ORDER, type DanceLevel, type DanceStep } from "./types";
import type { Modality } from "../types";

const ALL = "__todos";
const NO_CATEGORY = "Sem grupo";

/** Catálogo de passos de uma modalidade de dança, com a faixa de cada um e a evolução. */
export function DanceSteps({ modality }: { modality: Modality }) {
  const { steps: all, createStep } = useDance();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<string>(ALL);

  const steps = useMemo(() => all.filter((s) => s.modalityId === modality.id), [all, modality.id]);
  const open = steps.find((s) => s.id === params.get("passo"));
  const openStep = (id: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (id) next.set("passo", id);
        else next.delete("passo");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const categories = useMemo(
    () => [...new Set(steps.map((s) => s.category.trim() || NO_CATEGORY))].sort((a, b) => a.localeCompare(b)),
    [steps],
  );
  const shown = steps.filter((s) => filter === ALL || (s.category.trim() || NO_CATEGORY) === filter);
  // Do mais avançado para o que falta aprender; no mesmo nível, o mais recente primeiro.
  const ordered = [...shown].sort(
    (a, b) =>
      levelIndex(currentLevel(b)) - levelIndex(currentLevel(a)) ||
      lastChange(b).localeCompare(lastChange(a)) ||
      a.name.localeCompare(b.name),
  );
  const counts = LEVEL_ORDER.map((l) => ({ level: l, n: steps.filter((s) => currentLevel(s) === l).length }));
  const recent = recentChanges(steps).slice(0, 5);

  function add(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    // Criado com um grupo aberto, o passo já entra nele.
    const step = createStep(modality.id, clean, filter !== ALL && filter !== NO_CATEGORY ? filter : "");
    setName("");
    openStep(step.id);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold">Passos</h3>
        <p className="text-sm text-muted-foreground">
          {steps.length === 0
            ? "Monte o catálogo dos passos que você quer aprender."
            : `${plural(steps.length, "passo", "passos")}, ${plural(steps.length - counts[0].n, "já começado", "já começados")}`}
        </p>
      </div>

      {steps.length > 0 && <LevelSpread counts={counts} total={steps.length} />}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {categories.length > 1 && (
            <Segmented
              label="Grupo de passos"
              value={filter}
              onChange={setFilter}
              options={[
                { value: ALL, label: "Todos", count: steps.length },
                ...categories.map((c) => ({
                  value: c,
                  label: c,
                  count: steps.filter((s) => (s.category.trim() || NO_CATEGORY) === c).length,
                })),
              ]}
            />
          )}

          {steps.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Footprints}
              frame="dashed"
              className="mt-3"
              title="Nenhum passo ainda"
              description="Cada passo guarda vídeos, dicas e a sua faixa: de Não aprendi até Vermelho."
            />
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border">
              {ordered.map((s) => (
                <StepRow key={s.id} step={s} onOpen={() => openStep(s.id)} />
              ))}
            </ul>
          )}

          <form className="mt-2 flex gap-2" onSubmit={add}>
            <Input
              aria-label="Novo passo"
              value={name}
              placeholder="Novo passo, ex.: Giro da dama"
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" variant="outline" className="shrink-0">
              <Plus />
              Adicionar
            </Button>
          </form>
        </div>

        {recent.length > 0 && (
          <aside className="rounded-lg border border-border p-3.5 lg:w-72">
            <h4 className="text-sm font-semibold">Últimas evoluções</h4>
            <ul className="mt-2 flex flex-col gap-2.5">
              {recent.map(({ step, change, from }) => (
                <li key={change.id}>
                  <button
                    type="button"
                    onClick={() => openStep(step.id)}
                    className="block w-full rounded-sm text-left hover:underline"
                  >
                    <span className="block truncate text-sm font-medium">{step.name || "Passo sem nome"}</span>
                  </button>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BeltSwatch level={from} className="w-4" />
                    <span aria-hidden>→</span>
                    <BeltSwatch level={change.level} className="w-4" />
                    <span className="sr-only">
                      De {LEVEL_META[from].label} para {LEVEL_META[change.level].label}
                    </span>
                    <span className="ml-1">{shortDate(change.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <StepPanel step={open} onClose={() => openStep(null)} categories={categories.filter((c) => c !== NO_CATEGORY)} />
    </div>
  );
}

/** Quantos passos estão em cada faixa, numa barra só. */
function LevelSpread({ counts, total }: { counts: { level: DanceLevel; n: number }[]; total: number }) {
  return (
    <div className="mt-3">
      <div className="flex h-3 overflow-hidden rounded-sm border border-border" aria-hidden>
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <span
              key={c.level}
              title={`${LEVEL_META[c.level].label}: ${c.n}`}
              className="h-full border-r border-border last:border-r-0"
              style={{
                width: `${(c.n / total) * 100}%`,
                background: c.level === "nao" ? "var(--surface-muted)" : LEVEL_META[c.level].color,
              }}
            />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {counts.map((c) => (
          <li key={c.level} className="flex items-center gap-1.5 text-sm">
            <BeltSwatch level={c.level} className="w-4" />
            <span className="text-muted-foreground">{LEVEL_META[c.level].label}</span>
            <span className="font-medium tabular-nums">{c.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepRow({ step: s, onOpen }: { step: DanceStep; onOpen: () => void }) {
  const level = currentLevel(s);
  const since = lastChange(s);
  return (
    <li className="relative flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
        >
          {s.name || "Passo sem nome"}
        </button>
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          {s.category && <span className="truncate">{s.category}</span>}
          {s.videos.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Video className="size-3.5" aria-hidden />
              {s.videos.length}
              <span className="sr-only">{s.videos.length === 1 ? "vídeo" : "vídeos"}</span>
            </span>
          )}
          {s.tips.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Lightbulb className="size-3.5" aria-hidden />
              {s.tips.length}
              <span className="sr-only">{s.tips.length === 1 ? "dica" : "dicas"}</span>
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <BeltLabel level={level} />
        <span className="flex items-center gap-2">
          <BeltTrack level={level} />
          {since && <span className="text-xs text-muted-foreground">{shortDate(since)}</span>}
        </span>
      </div>
    </li>
  );
}
