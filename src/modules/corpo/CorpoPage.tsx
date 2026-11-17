import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineChart } from "@/components/ui/LineChart";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { deadlineLabel, goalDone, goalProgress } from "@/modules/rotina/logic";
import { useRoutine } from "@/modules/rotina/store";
import { EntryForm } from "./EntryForm";
import { bmi, change, entrySummary, formatDelta, formatValue, metricLabel, num, series } from "./logic";
import { Silhouette } from "./Silhouette";
import { useCorpo } from "./store";
import type { Entry, Metric } from "./types";

const PAGE = 8;

export function CorpoPage() {
  const { entries, profile } = useCorpo();
  const { goals } = useRoutine();
  const [metric, setMetric] = useState<Metric>("peso");
  const [form, setForm] = useState<{ open: boolean; entry?: Entry }>({ open: false });
  const [shown, setShown] = useState(PAGE);

  const weight = change(entries, "peso");
  const fat = change(entries, "gordura");
  const index = weight ? bmi(weight.last.value, profile.height) : null;
  const points = series(entries, metric);
  const selected = change(entries, metric);
  const history = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  // Metas ligadas ao que está no gráfico: viram a linha de alvo e o cartão de progresso.
  const linked = goals.filter((g) =>
    metric === "peso" ? g.link?.kind === "peso" : metric === "gordura" ? g.link?.kind === "gordura" : g.link?.kind === "medida" && g.link.measure === metric,
  );
  const goal = linked.find((g) => !goalDone(g)) ?? linked[0];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Corpo"
        description={
          weight
            ? `${formatValue(weight.last.value, "peso")} na última pesagem, em ${shortDate(weight.last.date)}.`
            : "Peso e medidas do corpo, com a evolução de cada um."
        }
        action={
          <Button onClick={() => setForm({ open: true })}>
            <Plus />
            Registrar medidas
          </Button>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhuma medição ainda"
          description="Registre o peso e as medidas de hoje. A partir da segunda medição a evolução aparece aqui."
          action={
            <Button onClick={() => setForm({ open: true })}>
              <Plus />
              Registrar medidas
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <section aria-label="Medidas no corpo" className="rounded-lg border border-border bg-surface p-4">
              <Silhouette entries={entries} selected={metric} onSelect={setMetric} />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Toque em uma medida para ver a evolução. A variação é desde a primeira medição.
              </p>
            </section>

            <div className="flex min-w-0 flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Tile
                  label="Peso"
                  value={weight ? formatValue(weight.last.value, "peso") : "Sem registro"}
                  detail={weight && weight.first !== weight.last ? `${formatDelta(weight.total, "peso")} desde ${shortDate(weight.first.date)}` : undefined}
                  active={metric === "peso"}
                  onSelect={() => setMetric("peso")}
                />
                <Tile
                  label="Gordura corporal"
                  value={fat ? `${num(fat.last.value)}%` : "Sem registro"}
                  detail={fat && fat.first !== fat.last ? `${formatDelta(fat.total, "gordura")} desde ${shortDate(fat.first.date)}` : undefined}
                  active={metric === "gordura"}
                  onSelect={() => setMetric("gordura")}
                />
                <Tile
                  label="IMC"
                  value={index ? num(index.value) : "Informe a altura"}
                  detail={index ? `${index.label}, com ${(profile.height / 100).toFixed(2).replace(".", ",")} m` : undefined}
                  className="col-span-2 sm:col-span-1"
                />
              </div>

              <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">{metricLabel(metric)}</h2>
                  {selected && selected.first !== selected.last && (
                    <p className="text-sm text-muted-foreground">
                      {formatDelta(selected.total, metric)} em {points.length} medições
                      {selected.recent !== null && `, ${formatDelta(selected.recent, metric)} na última`}
                    </p>
                  )}
                </div>
                {points.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    Ainda sem medição de {metricLabel(metric).toLowerCase()}. Registre a primeira para começar o gráfico.
                  </p>
                ) : (
                  <div className="mt-4">
                    <LineChart
                      points={points}
                      label={`Evolução de ${metricLabel(metric).toLowerCase()}: de ${formatValue(points[0].value, metric)} para ${formatValue(points.at(-1)!.value, metric)}`}
                      format={(v) => formatValue(v, metric)}
                      target={goal && !goalDone(goal) ? { value: goal.target, label: `Meta: ${formatValue(goal.target, metric)}` } : undefined}
                    />
                  </div>
                )}

                {goal ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate font-medium">
                        <span className="mr-1.5">{goal.icon}</span>
                        {goal.name}
                      </p>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {goalDone(goal) ? "Meta batida" : `${Math.round(goalProgress(goal) * 100)}% do caminho`}
                      </span>
                    </div>
                    <Progress value={goalProgress(goal)} done={goalDone(goal)} label={`Progresso de ${goal.name}`} className="mt-2" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[!goalDone(goal) && `Faltam ${formatValue(Math.abs(goal.target - goal.current), metric)}`, deadlineLabel(goal)]
                        .filter(Boolean)
                        .join(". ")}
                      {!goalDone(goal) && ". "}
                      <Link to="/rotina" className="font-medium text-primary hover:underline">
                        Ver em metas
                      </Link>
                    </p>
                  </div>
                ) : (
                  points.length > 0 && (
                    <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                      Quer um alvo para {metricLabel(metric).toLowerCase()}?{" "}
                      <Link to="/rotina" className="font-medium text-primary hover:underline">
                        Crie uma meta
                      </Link>{" "}
                      ligada ao corpo e ela se atualiza a cada medição.
                    </p>
                  )
                )}
              </section>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">Histórico</h2>
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {history.slice(0, shown).map((e) => (
                <li
                  key={e.id}
                  className="relative flex items-center gap-4 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover"
                >
                  <span className="w-20 shrink-0 text-sm text-muted-foreground">{shortDate(e.date)}</span>
                  <button
                    type="button"
                    onClick={() => setForm({ open: true, entry: e })}
                    className="w-20 shrink-0 text-left font-medium tabular-nums after:absolute after:inset-0"
                  >
                    {e.weight > 0 ? formatValue(e.weight, "peso") : "Medidas"}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{entrySummary(e)}</span>
                </li>
              ))}
            </ul>
            {history.length > shown && (
              <Button variant="ghost" className="mt-2" onClick={() => setShown((n) => n + PAGE)}>
                Mostrar medições mais antigas
              </Button>
            )}
          </section>
        </>
      )}

      <EntryForm open={form.open} entry={form.entry} onOpenChange={(open) => setForm((s) => ({ ...s, open }))} />
    </div>
  );
}

function Tile({
  label,
  value,
  detail,
  active,
  onSelect,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  active?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</span>
      {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
    </>
  );
  const box = "flex h-full w-full flex-col rounded-lg border bg-surface p-3.5 text-left";
  if (!onSelect) return <div className={cn(box, "border-border", className)}>{body}</div>;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        box,
        "transition-colors duration-(--motion-fast)",
        active ? "border-primary bg-surface-selected" : "border-border hover:border-border-strong hover:bg-surface-hover",
        className,
      )}
    >
      {body}
    </button>
  );
}
