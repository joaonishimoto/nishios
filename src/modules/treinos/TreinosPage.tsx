import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUp, ChartColumn, Check, Dumbbell, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import {
  currentWeek,
  daysAgoLabel,
  formatDistance,
  formatDuration,
  inCurrentMonth,
  inCurrentWeek,
  INTENSITY_META,
  loadProgress,
  newestFirst,
  num,
  pace,
  sessionSummary,
  sum,
} from "./logic";
import { DanceSteps } from "./danca/DanceSteps";
import { ModalityForm } from "./ModalityForm";
import { SessionForm } from "./SessionForm";
import { useTreinos } from "./store";
import type { Modality, Session } from "./types";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PAGE = 12;

export function TreinosPage() {
  const { modalities, sessions, planned, completeSession, updateSession } = useTreinos();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [sessionForm, setSessionForm] = useState<{ open: boolean; session?: Session }>({ open: false });
  const [modalityForm, setModalityForm] = useState<{ open: boolean; modality?: Modality }>({ open: false });
  const [shown, setShown] = useState(PAGE);

  const now = today();
  const byId = useMemo(() => new Map(modalities.map((m) => [m.id, m])), [modalities]);
  const selected = byId.get(params.get("m") ?? "");
  const select = (id: string | null) => {
    setShown(PAGE);
    setParams(id ? { m: id } : {}, { replace: true, preventScrollReset: true });
  };

  const sorted = useMemo(() => [...sessions].sort(newestFirst), [sessions]);
  const history = selected ? sorted.filter((s) => s.modalityId === selected.id) : sorted;
  const thisWeek = sessions.filter((s) => inCurrentWeek(s, now));
  const week = currentWeek(now);

  return (
    <div className="flex flex-col gap-9">
      <PageHeader
        title="Treinos"
        description={
          thisWeek.length === 0
            ? "Nenhum treino registrado nesta semana."
            : `${plural(thisWeek.length, "treino", "treinos")} nesta semana, ${formatDuration(sum(thisWeek, "duration"))} no total.`
        }
        action={
          modalities.length > 0 && (
            <Button onClick={() => setSessionForm({ open: true })}>
              <Plus />
              Registrar treino
            </Button>
          )
        }
      />

      {modalities.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhuma modalidade ainda"
          description="Crie a primeira: musculação, luta, corrida, natação ou o que você pratica."
          action={
            <Button onClick={() => setModalityForm({ open: true })}>
              <Plus />
              Nova modalidade
            </Button>
          }
        />
      ) : (
        <>
          <section aria-label="Esta semana">
            <ol className="grid grid-cols-7 overflow-hidden rounded-lg border border-border bg-surface">
              {week.map((day) => {
                const iso = toISO(day);
                const isToday = iso === toISO(now);
                const daySessions = sessions.filter((s) => s.date === iso);
                return (
                  <li
                    key={iso}
                    className={cn(
                      "flex min-h-24 flex-col items-center gap-1.5 border-r border-border px-1 py-2.5 last:border-r-0",
                      isToday && "bg-surface-selected/60",
                      day > now && "text-subtle-foreground",
                    )}
                  >
                    <span className={cn("text-xs", isToday ? "font-semibold" : "text-muted-foreground")}>
                      {WEEKDAY_SHORT[day.getDay()]}
                      <span className="sr-only">, dia {day.getDate()}</span>
                    </span>
                    <span aria-hidden className={cn("text-sm tabular-nums", isToday && "font-semibold")}>
                      {day.getDate()}
                    </span>
                    <span className="flex flex-wrap justify-center gap-0.5 text-lg leading-none sm:text-xl">
                      {daySessions.map((s) => {
                        const m = byId.get(s.modalityId);
                        return (
                          <span key={s.id} title={m?.name} role="img" aria-label={m?.name ?? "Treino"}>
                            {m?.icon ?? "•"}
                          </span>
                        );
                      })}
                      {planned
                        .filter((s) => s.date === iso)
                        .map((s) => {
                          const m = byId.get(s.modalityId);
                          return (
                            <span key={s.id} title={`${m?.name ?? "Treino"} planejado`} role="img" aria-label={`${m?.name ?? "Treino"} planejado`} className="opacity-40 grayscale">
                              {m?.icon ?? "•"}
                            </span>
                          );
                        })}
                      {daySessions.length === 0 && day <= now && !planned.some((s) => s.date === iso) && (
                        <span className="text-sm text-border-strong">
                          <span aria-hidden>–</span>
                          <span className="sr-only">Sem treino</span>
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {planned.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold tracking-tight">Planejados</h2>
              <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
                {planned.map((s) => {
                  const m = byId.get(s.modalityId);
                  if (!m) return null;
                  const late = s.date < toISO(now);
                  return (
                    <li
                      key={s.id}
                      className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover"
                    >
                      <span className="text-xl leading-none">{m.icon}</span>
                      <div className="min-w-0 flex-1 basis-40">
                        <button
                          type="button"
                          onClick={() => setSessionForm({ open: true, session: s })}
                          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
                        >
                          {m.name}
                        </button>
                        <p className="truncate text-sm text-muted-foreground">{sessionSummary(s, m)}</p>
                      </div>
                      <span className={cn("text-sm", late ? "text-danger-strong" : "text-muted-foreground")}>
                        {late ? `Era ${shortDate(s.date).toLowerCase()}` : shortDate(s.date)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative z-10 h-8"
                        onClick={() => {
                          completeSession(s.id);
                          toast({
                            message: `Treino de ${m.name.toLowerCase()} marcado como feito`,
                            action: { label: "Desfazer", onClick: () => updateSession(s.id, s) },
                          });
                        }}
                      >
                        <Check />
                        Marcar como feito
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Modalidades</h2>
              <div className="flex items-center gap-3">
                {selected && (
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver todas juntas
                  </button>
                )}
                <Button variant="outline" size="sm" className="h-8" onClick={() => setModalityForm({ open: true })}>
                  <Plus />
                  Nova modalidade
                </Button>
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {modalities.map((m) => (
                <li key={m.id}>
                  <ModalityCard
                    modality={m}
                    sessions={sorted.filter((s) => s.modalityId === m.id)}
                    selected={selected?.id === m.id}
                    onSelect={() => select(selected?.id === m.id ? null : m.id)}
                  />
                </li>
              ))}
            </ul>
          </section>

          {selected && (
            <ModalityDetail
              modality={selected}
              sessions={history}
              onEdit={() => setModalityForm({ open: true, modality: selected })}
            />
          )}

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              {selected ? `Histórico de ${selected.name.toLowerCase()}` : "Histórico"}
            </h2>
            {history.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  icon={Dumbbell}
                  title="Nenhum treino registrado"
                  description={
                    selected
                      ? `Registre o primeiro treino de ${selected.name.toLowerCase()}.`
                      : "Registre o primeiro treino para começar o histórico."
                  }
                  action={
                    <Button onClick={() => setSessionForm({ open: true })}>
                      <Plus />
                      Registrar treino
                    </Button>
                  }
                />
              </div>
            ) : (
              <>
                <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
                  {history.slice(0, shown).map((s) => {
                    const m = byId.get(s.modalityId);
                    return m ? (
                      <SessionRow
                        key={s.id}
                        session={s}
                        modality={m}
                        showModality={!selected}
                        onOpen={() => setSessionForm({ open: true, session: s })}
                      />
                    ) : null;
                  })}
                </ul>
                {history.length > shown && (
                  <Button variant="ghost" className="mt-2" onClick={() => setShown((n) => n + PAGE)}>
                    Mostrar treinos mais antigos
                  </Button>
                )}
              </>
            )}
          </section>
        </>
      )}

      <SessionForm
        open={sessionForm.open}
        session={sessionForm.session}
        defaultModalityId={selected?.id}
        onOpenChange={(open) => setSessionForm((s) => ({ ...s, open }))}
      />
      <ModalityForm
        open={modalityForm.open}
        modality={modalityForm.modality}
        onRemoved={() => select(null)}
        onOpenChange={(open) => setModalityForm((s) => ({ ...s, open }))}
      />
    </div>
  );
}

/** O número que mais importa no mês, conforme o tipo da modalidade. */
function monthHighlight(m: Modality, month: Session[]): string {
  if (m.kind === "distance") return formatDistance(sum(month, "distance"), m.unit);
  if (m.kind === "fight") return plural(sum(month, "rounds"), "round", "rounds");
  return formatDuration(sum(month, "duration"));
}

function ModalityCard({
  modality: m,
  sessions,
  selected,
  onSelect,
}: {
  modality: Modality;
  sessions: Session[];
  selected: boolean;
  onSelect: () => void;
}) {
  const month = sessions.filter((s) => inCurrentMonth(s));
  const last = sessions[0];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full w-full flex-col rounded-lg border bg-surface p-3.5 text-left transition-colors duration-(--motion-fast)",
        selected
          ? "border-primary bg-surface-selected"
          : "border-border hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="text-xl leading-none">{m.icon}</span>
        <span className="truncate font-medium">{m.name}</span>
      </span>
      <span className="mt-3 text-lg font-semibold tabular-nums">
        {month.length === 0 ? "Nada neste mês" : monthHighlight(m, month)}
      </span>
      <span className="text-sm text-muted-foreground">
        {month.length === 0
          ? last
            ? `Último treino ${daysAgoLabel(last.date)}`
            : "Nenhum treino ainda"
          : `${plural(month.length, "treino", "treinos")} no mês, último ${daysAgoLabel(last.date)}`}
      </span>
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** O "lá dentro" de cada modalidade: números e evolução próprios do tipo. */
function ModalityDetail({
  modality: m,
  sessions,
  onEdit,
}: {
  modality: Modality;
  sessions: Session[];
  onEdit: () => void;
}) {
  const month = sessions.filter((s) => inCurrentMonth(s));
  const progress = m.kind === "strength" ? loadProgress(sessions) : [];
  const withDistance = sessions.filter((s) => s.distance > 0 && s.duration > 0);
  const longest = sessions.reduce((max, s) => Math.max(max, s.distance), 0);
  const styles = [...new Set(sessions.map((s) => s.style).filter(Boolean))];

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span>{m.icon}</span>
          {m.name}
        </h2>
        <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
          <Pencil />
          Editar modalidade
        </Button>
      </div>

      {sessions.length === 0 ? (
        // Na dança, os passos logo abaixo já ocupam o lugar; os números chegam com o primeiro treino.
        m.kind === "dance" ? null : <EmptyState
          size="sm"
          icon={ChartColumn}
          frame="dashed"
          className="mt-3"
          title="Ainda sem treinos"
          description="Os números desta modalidade aparecem aqui depois do primeiro registro."
        />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Fact label="Neste mês" value={plural(month.length, "treino", "treinos")} />
            <Fact label="Tempo no mês" value={month.length ? formatDuration(sum(month, "duration")) : "–"} />
            {m.kind === "distance" && (
              <>
                <Fact label="Distância no mês" value={formatDistance(sum(month, "distance"), m.unit)} />
                <Fact
                  label="Ritmo médio"
                  value={pace(sum(withDistance, "distance"), sum(withDistance, "duration"), m.unit) ?? "–"}
                />
                <Fact label="Maior distância" value={longest > 0 ? formatDistance(longest, m.unit) : "–"} />
              </>
            )}
            {m.kind === "fight" && (
              <>
                <Fact label="Rounds no mês" value={num(sum(month, "rounds"))} />
                <Fact label="Estilos" value={styles.join(", ") || "–"} />
              </>
            )}
            {m.kind === "strength" && (
              <Fact
                label="Duração média"
                value={formatDuration(sum(sessions, "duration") / sessions.length)}
              />
            )}
            <Fact label="Total registrado" value={plural(sessions.length, "treino", "treinos")} />
          </dl>

          {m.kind === "strength" && progress.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold">Evolução de carga</h3>
              <p className="text-sm text-muted-foreground">
                Do primeiro registro de cada exercício até o mais recente.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[26rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border text-sm text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-normal">Exercício</th>
                      <th scope="col" className="py-2 pr-4 text-right font-normal">Começou</th>
                      <th scope="col" className="py-2 pr-4 text-right font-normal">Agora</th>
                      <th scope="col" className="py-2 text-right font-normal">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((p) => {
                      const diff = p.last - p.first;
                      return (
                        <tr key={p.name} className="border-b border-border last:border-b-0">
                          <th scope="row" className="py-2 pr-4 font-medium">
                            {p.name}
                            <span className="block text-sm font-normal text-muted-foreground">
                              {plural(p.times, "treino", "treinos")}, último em {shortDate(p.lastDate)}
                            </span>
                          </th>
                          <td className="py-2 pr-4 text-right text-muted-foreground tabular-nums">
                            {num(p.first)} kg
                          </td>
                          <td className="py-2 pr-4 text-right font-medium tabular-nums">{num(p.last)} kg</td>
                          <td className="py-2 text-right tabular-nums">
                            {diff > 0 ? (
                              <span className="inline-flex items-center gap-0.5 font-medium text-success-strong">
                                <ArrowUp className="size-3.5" aria-hidden />
                                {num(diff)} kg
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-muted-foreground">{num(diff)} kg</span>
                            ) : (
                              <span className="text-subtle-foreground">Igual</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {m.kind === "dance" && <DanceSteps modality={m} />}
    </section>
  );
}

function SessionRow({
  session: s,
  modality: m,
  showModality,
  onOpen,
}: {
  session: Session;
  modality: Modality;
  showModality: boolean;
  onOpen: () => void;
}) {
  const intensity = INTENSITY_META[s.intensity];
  const summary = sessionSummary(s, m);
  return (
    <li className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">
        {m.icon}
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
        >
          {showModality ? m.name : summary}
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {showModality ? summary : s.notes || formatDate(s.date, "EEEE")}
        </p>
      </div>
      <Badge tone={intensity.tone} className="hidden sm:inline-flex">
        {intensity.label}
      </Badge>
      <span className="w-20 shrink-0 text-right text-sm text-muted-foreground">
        {shortDate(s.date)}
      </span>
    </li>
  );
}
