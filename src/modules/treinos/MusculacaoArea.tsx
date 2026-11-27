import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sub } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  LayoutTemplate,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, NoResults } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { InfoTip } from "@/components/ui/InfoTip";
import { LineChart } from "@/components/ui/LineChart";
import { MultiLineChart, SERIES_COLORS, type ChartSeries } from "@/components/ui/MultiLineChart";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { shortDate, toISO, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import { ExerciseForm } from "./ExerciseForm";
import { daysAgoLabel, formatDuration, inCurrentMonth, sum } from "./logic";
import { PlanForm } from "./PlanForm";
import { TemplatesDialog } from "./TemplatesDialog";
import {
  defaultMetric,
  evolution,
  formatMetric,
  formatRest,
  historyByExercise,
  kg,
  metricsOf,
  METRIC_HINTS,
  METRIC_LABELS,
  nextPlan,
  normalizeName,
  PERIOD_LABELS,
  periodStart,
  recentRecords,
  recordSessions,
  recordsOf,
  repsLabel,
  seriesOf,
  setsLabel,
  suggestPlans,
  totalVolume,
  usesLoad,
  weeklySetsByMuscle,
  type HistoryPoint,
  type Period,
  type StrengthMetric,
} from "./strength";
import { useTreinos } from "./store";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Equipment,
  type ExerciseDef,
  type Modality,
  type MuscleGroup,
  type Plan,
  type Session,
} from "./types";

type Tab = "resumo" | "fichas" | "exercicios" | "progresso" | "comparar";
const TABS: { value: Tab; label: string }[] = [
  { value: "resumo", label: "Resumo" },
  { value: "fichas", label: "Fichas" },
  { value: "exercicios", label: "Exercícios" },
  { value: "progresso", label: "Progresso" },
  { value: "comparar", label: "Comparar" },
];

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const signedPct = (n: number) => `${pct.format(n)}%`;

/**
 * Musculação por dentro: fichas, catálogo de exercícios, progresso de cada um e
 * comparação entre eles. Tudo na URL: ?aba=, ?ex= (exercício) e ?cmp= (comparação).
 */
export function MusculacaoArea({
  modality,
  sessions,
  onEdit,
  onStart,
  onOpenSession,
}: {
  modality: Modality;
  /** Treinos feitos desta modalidade, do mais novo para o mais antigo. */
  sessions: Session[];
  onEdit: () => void;
  /** Abre o registro de treino, já com a ficha quando há. */
  onStart: (planId?: string) => void;
  onOpenSession: (session: Session) => void;
}) {
  const { exercises: catalog } = useTreinos();
  const [params, setParams] = useSearchParams();
  const raw = params.get("aba") as Tab | null;
  const tab: Tab = TABS.some((t) => t.value === raw) ? raw! : "resumo";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const openExercise = (id: string) => update({ aba: "progresso", ex: id });

  const histories = useMemo(() => historyByExercise(sessions), [sessions]);
  const byId = useMemo(() => new Map(catalog.map((d) => [d.id, d])), [catalog]);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span>{modality.icon}</span>
          {modality.name}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
            <Pencil />
            <span className="max-sm:sr-only">Editar modalidade</span>
          </Button>
        </div>
      </div>
      <div className="mt-4 -mx-1 overflow-x-auto px-1">
        <Segmented label="Partes da musculação" options={TABS} value={tab} onChange={(t) => update({ aba: t === "resumo" ? null : t })} />
      </div>

      <div className="mt-5">
        {tab === "resumo" && (
          <Overview sessions={sessions} histories={histories} byId={byId} onStart={onStart} onOpenExercise={openExercise} goTo={(t) => update({ aba: t })} />
        )}
        {tab === "fichas" && <PlansTab sessions={sessions} histories={histories} byId={byId} onStart={onStart} />}
        {tab === "exercicios" && <CatalogTab histories={histories} onOpenExercise={openExercise} />}
        {tab === "progresso" && (
          <ProgressTab
            histories={histories}
            byId={byId}
            selectedId={params.get("ex") ?? ""}
            onSelect={(id) => update({ ex: id })}
            sessions={sessions}
            onOpenSession={onOpenSession}
            onCompare={(id) => update({ aba: "comparar", cmp: id })}
          />
        )}
        {tab === "comparar" && (
          <CompareTab
            histories={histories}
            byId={byId}
            selected={(params.get("cmp") ?? "").split(",").filter((id) => byId.has(id))}
            onChange={(ids) => update({ cmp: ids.length ? ids.join(",") : null })}
            onOpenExercise={openExercise}
            sessions={sessions}
          />
        )}
      </div>
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {value}
        {note && <span className="block text-xs font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

/** Linha mínima da evolução, para listas. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <span className={cn("inline-block h-6 w-20", className)} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * 78 + 1).toFixed(1)} ${(22 - ((v - min) / span) * 20).toFixed(1)}`)
    .join(" ");
  return (
    <svg width="80" height="24" aria-hidden className={cn("shrink-0 overflow-visible", className)}>
      <path d={d} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-primary" />
    </svg>
  );
}

function Change({ value, unit = "%" }: { value: number; unit?: string }) {
  if (Math.abs(value) < 0.5) return <span className="text-subtle-foreground">Igual</span>;
  return value > 0 ? (
    <span className="inline-flex items-center gap-0.5 font-medium text-success-strong">
      <ArrowUp className="size-3.5" aria-hidden />
      {unit === "%" ? `${pct.format(Math.abs(value))}%` : unit}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <ArrowDown className="size-3.5" aria-hidden />
      {unit === "%" ? `${pct.format(Math.abs(value))}%` : unit}
    </span>
  );
}

/* ------------------------------------------------------------------ Resumo */

function Overview({
  sessions,
  histories,
  byId,
  onStart,
  onOpenExercise,
  goTo,
}: {
  sessions: Session[];
  histories: Map<string, HistoryPoint[]>;
  byId: Map<string, ExerciseDef>;
  onStart: (planId?: string) => void;
  onOpenExercise: (id: string) => void;
  goTo: (tab: Tab) => void;
}) {
  const { plans } = useTreinos();
  const now = today();
  const month = sessions.filter((s) => inCurrentMonth(s, now));
  const lastMonthKey = toISO(sub(now, { months: 1 })).slice(0, 7);
  const lastMonth = sessions.filter((s) => s.date.slice(0, 7) === lastMonthKey);
  const volume = totalVolume(month);
  const prevVolume = totalVolume(lastMonth);
  const records = recentRecords(histories, 30, now);
  const next = nextPlan(plans, sessions);
  const muscles = weeklySetsByMuscle(sessions, byId, 4, now);
  const maxSets = Math.max(1, ...muscles.map((m) => m.sets));

  const highlights = [...histories]
    .filter(([id]) => byId.has(id))
    .map(([id, h]) => ({ id, h, ev: evolution(h, defaultMetric(h)) }))
    .filter((x) => x.ev && x.h.length >= 2)
    .sort((a, b) => b.h.length - a.h.length)
    .slice(0, 6);

  if (sessions.length === 0 && plans.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={ChartColumn}
        frame="dashed"
        title="Comece pela ficha ou pelo primeiro treino"
        description="Monte a ficha (Treino A, B, C) com os exercícios, ou registre um treino direto. Os números aparecem aqui."
        action={
          <Button onClick={() => goTo("fichas")}>
            <ClipboardList />
            Montar ficha
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => onStart()}>
            Registrar treino
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Fact label="Neste mês" value={plural(month.length, "treino", "treinos")} note={month.length ? `${formatDuration(sum(month, "duration"))} no total` : undefined} />
        <Fact
          label="Volume no mês"
          value={volume > 0 ? formatMetric("volume", volume) : "–"}
          note={prevVolume > 0 ? `mês passado: ${formatMetric("volume", prevVolume)}` : undefined}
        />
        <Fact label="Recordes em 30 dias" value={String(records.length)} />
        <Fact label="Exercícios no catálogo" value={String(byId.size)} />
      </dl>

      {next ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-surface-selected/40 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Próximo treino do rodízio</p>
            <p className="text-lg font-semibold">{next.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {next.items.map((i) => byId.get(i.exerciseId)?.name).filter(Boolean).join(", ") || "Sem exercícios"}
            </p>
          </div>
          <Button onClick={() => onStart(next.id)}>
            <Play />
            Começar treino
          </Button>
        </div>
      ) : (
        <SuggestPlans sessions={sessions} />
      )}

      <div className="grid gap-7 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Trophy className="size-4 text-warning-strong" aria-hidden />
            Recordes recentes
          </h3>
          {records.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum recorde nos últimos 30 dias. Subir um pouco a carga ou uma repetição já conta.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {records.slice(0, 6).map((r) => {
                const def = byId.get(r.exerciseId);
                if (!def) return null;
                return (
                  <li key={r.exerciseId}>
                    <button type="button" onClick={() => onOpenExercise(r.exerciseId)} className="flex w-full items-center gap-3 py-2 text-left hover:text-primary">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{def.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {shortDate(r.date)}, antes {formatMetric(r.metric, r.previous)}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatMetric(r.metric, r.value)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-1 font-semibold">
            Séries por grupo muscular
            <InfoTip label="Sobre as séries por grupo">
              Média de séries por semana nas últimas 4 semanas, somando os exercícios de cada grupo. Entre 10 e 20 séries por semana é a faixa mais usada para ganhar massa.
            </InfoTip>
          </h3>
          {muscles.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sem treinos nas últimas 4 semanas.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {muscles.map((m) => (
                <li key={m.muscle} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                  <span className="truncate">{MUSCLE_LABELS[m.muscle]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(m.sets / maxSets) * 100}%` }} />
                  </span>
                  <span className="text-right text-muted-foreground tabular-nums">{m.sets.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/sem</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {highlights.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Evolução dos exercícios mais feitos</h3>
            <button type="button" onClick={() => goTo("comparar")} className="text-sm font-medium text-primary hover:underline">
              Comparar
            </button>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {highlights.map(({ id, h, ev }) => {
              const def = byId.get(id)!;
              const metric = defaultMetric(h);
              return (
                <li key={id}>
                  <button type="button" onClick={() => onOpenExercise(id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-surface-hover">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{def.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatMetric(metric, ev!.first)} → {formatMetric(metric, ev!.last)}
                      </span>
                    </span>
                    <Sparkline values={seriesOf(h, metric).map((p) => p.value)} className="max-sm:hidden" />
                    <span className="w-14 text-right text-sm tabular-nums">
                      <Change value={ev!.change} />
                    </span>
                    <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuggestPlans({ sessions }: { sessions: Session[] }) {
  const { createPlan, removePlan, exercises } = useTreinos();
  const toast = useToast();
  const [form, setForm] = useState(false);
  const [templates, setTemplates] = useState(false);
  const suggestions = useMemo(() => suggestPlans(sessions.filter((s) => s.date >= toISO(sub(today(), { days: 60 })))), [sessions]);
  const names = new Map(exercises.map((d) => [d.id, d]));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Monte as fichas</p>
        <p className="text-sm text-muted-foreground">
          {suggestions.length > 0
            ? `Seus treinos dos últimos 60 dias formam ${plural(suggestions.length, "ficha", "fichas")}. Dá para criar de uma vez e ajustar depois.`
            : "Com as fichas, o próximo treino do rodízio aparece aqui com as cargas da última vez. Comece de um modelo pronto ou monte do zero."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.length > 0 && (
          <Button
            onClick={() => {
              const created = suggestions.map((p) => {
                const muscles = [...new Set(p.items.map((i) => names.get(i.exerciseId)?.muscle).filter((m): m is MuscleGroup => !!m))]
                  .slice(0, 3)
                  .map((m) => MUSCLE_LABELS[m]);
                return createPlan({ ...p, name: muscles.length ? `${p.name} · ${muscles.join(", ")}` : p.name });
              });
              toast({
                message: `${plural(created.length, "ficha criada", "fichas criadas")} a partir dos treinos`,
                action: { label: "Desfazer", onClick: () => created.forEach((p) => removePlan(p.id)) },
              });
            }}
          >
            <Sparkles />
            Criar a partir dos treinos
          </Button>
        )}
        <Button variant={suggestions.length > 0 ? "outline" : "primary"} onClick={() => setTemplates(true)}>
          <LayoutTemplate />
          Usar um modelo
        </Button>
        <Button variant="ghost" onClick={() => setForm(true)}>
          <Plus />
          Nova ficha
        </Button>
      </div>
      <PlanForm open={form} onOpenChange={setForm} />
      <TemplatesDialog open={templates} onOpenChange={setTemplates} />
    </div>
  );
}

/* ------------------------------------------------------------------ Fichas */

function PlansTab({
  sessions,
  histories,
  byId,
  onStart,
}: {
  sessions: Session[];
  histories: Map<string, HistoryPoint[]>;
  byId: Map<string, ExerciseDef>;
  onStart: (planId?: string) => void;
}) {
  const { plans, movePlan } = useTreinos();
  const [form, setForm] = useState<{ open: boolean; plan?: Plan }>({ open: false });
  const [templates, setTemplates] = useState(false);
  const next = nextPlan(plans, sessions);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {plans.length > 1 ? "A ordem das fichas é a ordem do rodízio: depois da última volta para a primeira." : "Cada ficha é um treino: os exercícios, as séries, as repetições e a carga alvo."}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setTemplates(true)}>
            <LayoutTemplate />
            Modelos
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setForm({ open: true })}>
            <Plus />
            Nova ficha
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <SuggestPlans sessions={sessions} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {plans.map((p, index) => {
            const done = sessions.filter((s) => s.planId === p.id);
            return (
              <li key={p.id} className={cn("flex flex-col rounded-lg border bg-surface p-4", next?.id === p.id ? "border-primary/50" : "border-border")}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {done.length === 0 ? "Ainda não feita" : `Feita ${done.length === 1 ? "1 vez" : `${done.length} vezes`}, a última ${daysAgoLabel(done[0].date)}`}
                    </p>
                  </div>
                  {next?.id === p.id && <Badge tone="info">Próxima</Badge>}
                </div>
                <ol className="mt-3 flex flex-1 flex-col gap-1.5 text-sm">
                  {p.items.map((item, i) => {
                    const def = byId.get(item.exerciseId);
                    const last = histories.get(item.exerciseId)?.at(-1);
                    return (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="w-4 shrink-0 text-subtle-foreground tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{def?.name ?? "Exercício removido"}</span>
                          {def && <span className="text-muted-foreground"> · {EQUIPMENT_LABELS[def.equipment]}</span>}
                          {last && <span className="block text-xs text-muted-foreground">Última: {setsLabel(last.exercise)}</span>}
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          {item.sets} × {repsLabel(item)}
                          {item.weight > 0 && <span className="text-muted-foreground"> · {kg(item.weight)}</span>}
                          {item.rest > 0 && <span className="block text-xs text-subtle-foreground">descanso {formatRest(item.rest)}</span>}
                        </span>
                      </li>
                    );
                  })}
                  {p.items.length === 0 && <li className="text-muted-foreground">Sem exercícios ainda.</li>}
                </ol>
                {p.notes && <p className="mt-3 text-sm text-muted-foreground">{p.notes}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" className="h-8" onClick={() => onStart(p.id)}>
                    <Play />
                    Começar treino
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setForm({ open: true, plan: p })}>
                    <Pencil />
                    Editar
                  </Button>
                  {plans.length > 1 && (
                    <span className="ml-auto flex">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Mover ${p.name} para antes`} disabled={index === 0} onClick={() => movePlan(p.id, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Mover ${p.name} para depois`} disabled={index === plans.length - 1} onClick={() => movePlan(p.id, 1)}>
                        <ArrowDown />
                      </Button>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <PlanForm open={form.open} plan={form.plan} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <TemplatesDialog open={templates} onOpenChange={setTemplates} />
    </div>
  );
}

/* -------------------------------------------------------------- Exercícios */

const MUSCLE_ORDER = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

function CatalogTab({
  histories,
  onOpenExercise,
}: {
  histories: Map<string, HistoryPoint[]>;
  onOpenExercise: (id: string) => void;
}) {
  const { exercises } = useTreinos();
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<Equipment | "todos">("todos");
  const [muscle, setMuscle] = useState<MuscleGroup | "todos">("todos");
  const [form, setForm] = useState<{ open: boolean; exercise?: ExerciseDef }>({ open: false });

  const q = normalizeName(query);
  const filtered = exercises.filter(
    (d) =>
      (equipment === "todos" || d.equipment === equipment) &&
      (muscle === "todos" || d.muscle === muscle || d.secondary?.includes(muscle)) &&
      (!q || normalizeName(d.name).includes(q)),
  );
  const groups = MUSCLE_ORDER.map((m) => ({
    muscle: m,
    items: filtered
      .filter((d) => (muscle === "todos" ? d.muscle === m : m === muscle))
      // Os que você já fez primeiro; depois em ordem alfabética.
      .sort((a, b) => Number(histories.has(b.id)) - Number(histories.has(a.id)) || a.name.localeCompare(b.name, "pt-BR")),
  })).filter((g) => g.items.length > 0);

  const counts = (eq: Equipment) => exercises.filter((d) => d.equipment === eq).length;
  const options = [
    { value: "todos" as const, label: "Todos", count: exercises.length },
    ...(Object.keys(EQUIPMENT_LABELS) as Equipment[]).filter((eq) => counts(eq) > 0).map((eq) => ({ value: eq, label: EQUIPMENT_LABELS[eq], count: counts(eq) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input aria-label="Buscar exercício" value={query} placeholder="Buscar exercício" className="pl-8" onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select aria-label="Grupo muscular" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "todos")} className="w-auto min-w-40">
          <option value="todos">Todos os grupos</option>
          {MUSCLE_ORDER.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={() => setForm({ open: true })}>
          <Plus />
          Novo exercício
        </Button>
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <Segmented label="Equipamento" options={options} value={equipment} onChange={setEquipment} />
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          size="sm"
          icon={Dumbbell}
          frame="dashed"
          title="Catálogo vazio"
          description="Os exercícios entram aqui ao registrar um treino ou montar uma ficha. Ou cadastre agora, com o equipamento e o grupo muscular."
          action={
            <Button onClick={() => setForm({ open: true })}>
              <Plus />
              Novo exercício
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <NoResults query={query} onClear={() => (setQuery(""), setEquipment("todos"), setMuscle("todos"))} />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.muscle}>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {MUSCLE_LABELS[g.muscle]} <span className="font-normal text-subtle-foreground">{g.items.length}</span>
              </h3>
              <ul className="mt-1.5 overflow-hidden rounded-lg border border-border">
                {g.items.map((d) => {
                  const h = histories.get(d.id) ?? [];
                  const metric = defaultMetric(h);
                  const last = h.at(-1);
                  const best = recordsOf(h)[metric];
                  return (
                    <li key={d.id} className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-surface-hover">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => (last ? onOpenExercise(d.id) : setForm({ open: true, exercise: d }))}
                          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
                        >
                          {d.name}
                        </button>
                        <p className="truncate text-sm text-muted-foreground" title={last ? undefined : d.notes || undefined}>
                          {last ? `${setsLabel(last.exercise)}, ${daysAgoLabel(last.date)}` : d.notes || "Ainda não feito"}
                        </p>
                      </div>
                      <Badge className="max-sm:hidden">{EQUIPMENT_LABELS[d.equipment]}</Badge>
                      <Sparkline values={seriesOf(h, metric).map((p) => p.value)} className="max-md:hidden" />
                      <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                        {best ? (
                          <>
                            <span className="block font-medium">{formatMetric(metric, best.value)}</span>
                            <span className="text-xs text-muted-foreground">recorde</span>
                          </>
                        ) : (
                          <span className="text-subtle-foreground">–</span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative z-10 size-8"
                        aria-label={`Editar ${d.name}`}
                        onClick={() => setForm({ open: true, exercise: d })}
                      >
                        <Pencil />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ExerciseForm open={form.open} exercise={form.exercise} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
    </div>
  );
}

/* --------------------------------------------------------------- Progresso */

function ExercisePicker({
  value,
  onChange,
  byId,
  histories,
  label,
  exclude = [],
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  byId: Map<string, ExerciseDef>;
  histories: Map<string, HistoryPoint[]>;
  label: string;
  exclude?: string[];
  placeholder?: string;
}) {
  // Só os que já têm treino: a biblioteca inteira deixaria a lista longa demais.
  const list = [...byId.values()].filter((d) => !exclude.includes(d.id) && (d.id === value || histories.has(d.id)));
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="w-full sm:w-80">
      {placeholder && <option value="">{placeholder}</option>}
      {MUSCLE_ORDER.map((m) => {
        const items = list.filter((d) => d.muscle === m).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        if (items.length === 0) return null;
        return (
          <optgroup key={m} label={MUSCLE_LABELS[m]}>
            {items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {histories.get(d.id)?.length ? `(${histories.get(d.id)!.length})` : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}

function ProgressTab({
  histories,
  byId,
  selectedId,
  onSelect,
  sessions,
  onOpenSession,
  onCompare,
}: {
  histories: Map<string, HistoryPoint[]>;
  byId: Map<string, ExerciseDef>;
  selectedId: string;
  onSelect: (id: string) => void;
  sessions: Session[];
  onOpenSession: (s: Session) => void;
  onCompare: (id: string) => void;
}) {
  const { plans } = useTreinos();
  const mostDone = [...histories].filter(([id]) => byId.has(id)).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
  const id = byId.has(selectedId) ? selectedId : (mostDone ?? "");
  const def = byId.get(id);
  const all = histories.get(id) ?? [];
  const load = usesLoad(all);
  const metrics: StrengthMetric[] = load ? ["top", "e1rm", "volume", "bestReps"] : ["bestReps"];
  const [metricRaw, setMetric] = useState<StrengthMetric>("top");
  const metric = metrics.includes(metricRaw) ? metricRaw : metrics[0];
  const [period, setPeriod] = useState<Period>("tudo");
  const [shown, setShown] = useState(8);

  if (!def) {
    return (
      <EmptyState
        size="sm"
        icon={ChartColumn}
        frame="dashed"
        title="Nenhum exercício para acompanhar"
        description="Registre um treino com exercícios para ver a evolução de cada um."
      />
    );
  }

  const since = periodStart(period);
  const history = all.filter((h) => h.date >= since);
  const points = seriesOf(history, metric);
  const ev = evolution(history, metric);
  const rec = recordsOf(all);
  const prs = recordSessions(all);
  const planName = new Map(plans.map((p) => [p.id, p.name]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <ExercisePicker value={id} onChange={onSelect} byId={byId} histories={histories} label="Exercício" />
        <Badge>{EQUIPMENT_LABELS[def.equipment]}</Badge>
        <Badge>{MUSCLE_LABELS[def.muscle]}</Badge>
        <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={() => onCompare(id)}>
          Comparar com outros
          <ChevronRight />
        </Button>
      </div>
      {def.notes && <p className="-mt-2 text-sm text-muted-foreground">{def.notes}</p>}

      {all.length === 0 ? (
        <EmptyState size="sm" icon={ChartColumn} frame="dashed" title="Ainda sem registros" description={`Quando ${def.name.toLowerCase()} entrar num treino, a evolução aparece aqui.`} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {load ? (
              <>
                <Fact label="Maior carga" value={rec.top ? kg(rec.top.value) : "–"} note={rec.top ? `${rec.top.reps} reps, ${shortDate(rec.top.date)}` : undefined} />
                <Fact label="1RM estimado" value={rec.e1rm ? kg(Math.round(rec.e1rm.value * 2) / 2) : "–"} note={rec.e1rm ? shortDate(rec.e1rm.date) : undefined} />
                <Fact label="Maior volume" value={rec.volume ? formatMetric("volume", rec.volume.value) : "–"} note={rec.volume ? shortDate(rec.volume.date) : undefined} />
              </>
            ) : (
              <Fact label="Mais repetições" value={rec.bestReps ? formatMetric("bestReps", rec.bestReps.value) : "–"} note={rec.bestReps ? shortDate(rec.bestReps.date) : undefined} />
            )}
            <Fact label="Feito" value={plural(all.length, "vez", "vezes")} note={`último ${daysAgoLabel(all.at(-1)!.date)}`} />
          </dl>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                <Segmented label="Métrica" options={metrics.map((m) => ({ value: m, label: METRIC_LABELS[m] }))} value={metric} onChange={setMetric} />
                <InfoTip label={`Sobre ${METRIC_LABELS[metric].toLowerCase()}`}>{METRIC_HINTS[metric]}</InfoTip>
              </div>
              <Segmented label="Período" options={(Object.keys(PERIOD_LABELS) as Period[]).map((p) => ({ value: p, label: PERIOD_LABELS[p] }))} value={period} onChange={setPeriod} />
            </div>
            {ev && (
              <p className="mt-3 text-sm text-muted-foreground">
                {formatMetric(metric, ev.first)} → <span className="font-medium text-foreground">{formatMetric(metric, ev.last)}</span>{" "}
                <Change value={ev.change} />
                {ev.perMonth !== 0 && (
                  <span>
                    {" "}
                    · {ev.perMonth > 0 ? "+" : "−"}
                    {formatMetric(metric, Math.abs(ev.perMonth))} por mês
                  </span>
                )}
              </p>
            )}
            <div className="mt-3">
              {points.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sem registros neste período.</p>
              ) : (
                <LineChart points={points} label={`${METRIC_LABELS[metric]} de ${def.name} ao longo do tempo`} format={(v) => formatMetric(metric, Math.round(v * 10) / 10)} />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Histórico</h3>
            <ul className="mt-2 overflow-hidden rounded-lg border border-border">
              {[...history].reverse().slice(0, shown).map((h) => {
                const s = sessionById.get(h.sessionId);
                return (
                  <li key={h.sessionId + h.date} className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-surface-hover">
                    <span className="w-16 shrink-0 text-sm text-muted-foreground">{shortDate(h.date)}</span>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => s && onOpenSession(s)} className="block max-w-full text-left font-medium tabular-nums after:absolute after:inset-0">
                        {setsLabel(h.exercise)}
                      </button>
                      <p className="truncate text-sm text-muted-foreground">
                        {[load ? `volume ${formatMetric("volume", h.metrics.volume)}` : `${h.metrics.totalReps} reps no total`, h.planId && planName.get(h.planId)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {prs.has(h.sessionId) && (
                      <Badge tone="warning">
                        <Trophy className="size-3" aria-hidden />
                        Recorde
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
            {history.length > shown && (
              <Button variant="ghost" className="mt-2" onClick={() => setShown((n) => n + 10)}>
                Mostrar mais antigos
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Comparar */

/** Sem escolha ainda: o exercício mais feito de cada um de três grupos musculares. */
function defaultPicks(ranked: [string, HistoryPoint[]][], byId: Map<string, ExerciseDef>): string[] {
  const seen = new Set<MuscleGroup>();
  const out: string[] = [];
  for (const [id] of ranked) {
    const muscle = byId.get(id)?.muscle;
    if (!muscle || seen.has(muscle)) continue;
    seen.add(muscle);
    out.push(id);
    if (out.length === 3) break;
  }
  return out;
}

type CompareMetric = "change" | "e1rm" | "top" | "volume";
const COMPARE_LABELS: Record<CompareMetric, string> = {
  change: "Evolução %",
  e1rm: "1RM estimado",
  top: "Carga máxima",
  volume: "Volume",
};

function CompareTab({
  histories,
  byId,
  selected,
  onChange,
  onOpenExercise,
  sessions,
}: {
  histories: Map<string, HistoryPoint[]>;
  byId: Map<string, ExerciseDef>;
  selected: string[];
  onChange: (ids: string[]) => void;
  onOpenExercise: (id: string) => void;
  sessions: Session[];
}) {
  const [metric, setMetric] = useState<CompareMetric>("change");
  const [period, setPeriod] = useState<Period>("tudo");
  const now = today();
  const ranked = [...histories].filter(([id, h]) => byId.has(id) && h.length >= 2).sort((a, b) => b[1].length - a[1].length);
  const ids = selected.length > 0 ? selected : defaultPicks(ranked, byId);
  const since = periodStart(period, now);

  const all = ids.map((id) => {
    const h = (histories.get(id) ?? []).filter((p) => p.date >= since);
    const load = usesLoad(histories.get(id) ?? []);
    // Na evolução %, cada um pela própria medida; nas outras, só quem tem carga.
    const m: StrengthMetric = metric === "change" ? (load ? "e1rm" : "bestReps") : metric;
    return { id, def: byId.get(id)!, h, m, load, ev: evolution(h, m) };
  });
  const rows = metric === "change" ? all : all.filter((r) => r.load);
  const colorOf = (id: string) => SERIES_COLORS[ids.indexOf(id) % SERIES_COLORS.length];
  const left = all.filter((r) => !rows.includes(r));

  const series: ChartSeries[] = rows.map((r) => {
    const pts = seriesOf(r.h, r.m);
    const first = pts[0]?.value ?? 0;
    return {
      key: r.id,
      label: r.def.name,
      color: colorOf(r.id),
      points: metric === "change" ? pts.map((p) => ({ date: p.date, value: first > 0 ? ((p.value - first) / first) * 100 : 0 })) : pts.map((p) => ({ date: p.date, value: Math.round(p.value * 10) / 10 })),
    };
  });
  const format = metric === "change" ? signedPct : (v: number) => formatMetric(metric, v);

  const add = (id: string) => id && onChange([...ids, id].slice(0, 5));
  const remove = (id: string) => onChange(ids.filter((x) => x !== id));

  // Volume por grupo muscular, mês a mês: a outra comparação que importa.
  const months = Array.from({ length: 6 }, (_, i) => toISO(sub(now, { months: 5 - i })).slice(0, 7));
  const muscleVolume = (Object.keys(MUSCLE_LABELS) as MuscleGroup[])
    .map((muscle) => ({
      muscle,
      byMonth: months.map((mk) =>
        sessions
          .filter((s) => s.date.slice(0, 7) === mk)
          .reduce((t, s) => t + s.exercises.filter((e) => e.exerciseId && byId.get(e.exerciseId)?.muscle === muscle).reduce((v, e) => v + metricsOf(e).sets, 0), 0),
      ),
    }))
    .filter((m) => m.byMonth.some((v) => v > 0));
  const maxMonth = Math.max(1, ...muscleVolume.flatMap((m) => m.byMonth));

  if (ranked.length === 0 && selected.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={ChartColumn}
        frame="dashed"
        title="Ainda não dá para comparar"
        description="A comparação precisa de exercícios feitos pelo menos duas vezes."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {ids.map((id, i) => (
          <span key={id} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface pr-1 pl-2.5 text-sm">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {byId.get(id)?.name}
            <button type="button" aria-label={`Tirar ${byId.get(id)?.name} da comparação`} onClick={() => remove(id)} className="rounded-sm px-1 text-subtle-foreground hover:bg-surface-hover hover:text-foreground">
              ×
            </button>
          </span>
        ))}
        {ids.length < 5 && (
          <ExercisePicker value="" onChange={add} byId={byId} histories={histories} label="Adicionar exercício à comparação" exclude={ids} placeholder="+ Adicionar exercício" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Segmented label="Comparar por" options={(Object.keys(COMPARE_LABELS) as CompareMetric[]).map((m) => ({ value: m, label: COMPARE_LABELS[m] }))} value={metric} onChange={setMetric} />
          <InfoTip label="Sobre a comparação">
            "Evolução %" põe todos no mesmo ponto de partida (0%), então dá para comparar uma máquina de 200 kg com uma rosca de 20 kg. Usa o 1RM estimado, ou as repetições nos exercícios sem carga.
          </InfoTip>
        </div>
        <Segmented label="Período" options={(Object.keys(PERIOD_LABELS) as Period[]).map((p) => ({ value: p, label: PERIOD_LABELS[p] }))} value={period} onChange={setPeriod} />
      </div>

      {left.length > 0 && (
        <p className="-mt-3 text-sm text-muted-foreground">
          {left.map((r) => r.def.name).join(", ")} {left.length === 1 ? "fica" : "ficam"} de fora: sem carga, só contam em "Evolução %".
        </p>
      )}

      {series.every((s) => s.points.length === 0) ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sem registros neste período.</p>
      ) : (
        <MultiLineChart series={series} label={`Comparação por ${COMPARE_LABELS[metric].toLowerCase()}`} format={format} baseline={metric === "change" ? 0 : undefined} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-normal">Exercício</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Vezes</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Início</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Agora</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Evolução</th>
              <th scope="col" className="py-2 text-right font-normal">Por mês</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-b-0">
                <th scope="row" className="py-2 pr-4 font-medium">
                  <button type="button" onClick={() => onOpenExercise(r.id)} className="flex items-center gap-2 text-left hover:text-primary">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.id) }} />
                    <span>
                      {r.def.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {EQUIPMENT_LABELS[r.def.equipment]} · {METRIC_LABELS[r.m]}
                      </span>
                    </span>
                  </button>
                </th>
                <td className="py-2 pr-4 text-right tabular-nums">{r.h.length}</td>
                <td className="py-2 pr-4 text-right text-muted-foreground tabular-nums">{r.ev ? formatMetric(r.m, r.ev.first) : "–"}</td>
                <td className="py-2 pr-4 text-right font-medium tabular-nums">{r.ev ? formatMetric(r.m, r.ev.last) : "–"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{r.ev ? <Change value={r.ev.change} /> : "–"}</td>
                <td className="py-2 text-right text-muted-foreground tabular-nums">
                  {r.ev && r.ev.perMonth !== 0 ? `${r.ev.perMonth > 0 ? "+" : "−"}${formatMetric(r.m, Math.abs(r.ev.perMonth))}` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {muscleVolume.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1 font-semibold">
            Séries por grupo muscular, mês a mês
            <InfoTip label="Sobre as séries por mês">Total de séries de cada grupo em cada mês. Mostra o que está ficando para trás no treino.</InfoTip>
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-3 text-left font-normal">Grupo</th>
                  {months.map((mk) => (
                    <th key={mk} scope="col" className="px-1 py-1.5 text-center font-normal capitalize">
                      {new Date(`${mk}-15`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {muscleVolume.map((m) => (
                  <tr key={m.muscle}>
                    <th scope="row" className="py-1 pr-3 text-left font-medium whitespace-nowrap">{MUSCLE_LABELS[m.muscle]}</th>
                    {m.byMonth.map((v, i) => (
                      <td key={i} className="px-1 py-1">
                        <span
                          className="flex h-7 items-center justify-center rounded-sm text-xs tabular-nums"
                          style={{ background: v > 0 ? `color-mix(in srgb, var(--primary) ${Math.round(12 + (v / maxMonth) * 60)}%, transparent)` : undefined }}
                          title={`${MUSCLE_LABELS[m.muscle]}: ${v} séries`}
                        >
                          <span className={v / maxMonth > 0.55 ? "font-medium text-primary-foreground" : ""}>{v || "–"}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
