import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Gauge, Link2, Pencil, PiggyBank, Plus, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { LineChart, type ChartPoint } from "@/components/ui/LineChart";
import { cn } from "@/lib/cn";
import { formatDate, today } from "@/lib/dates";
import { money, shortMoney } from "@/lib/format";
import { totalHistory } from "@/modules/financas/InvestmentsTab";
import { balance, monthlyContribution, monthOf, reachDate } from "@/modules/financas/logic";
import { useFinancas } from "@/modules/financas/store";
import { useSkills } from "@/modules/skills/store";
import { useTreinos } from "@/modules/treinos/store";
import { GoalBar, PACE_TONE, QuickUpdate } from "./GoalsTab";
import { linkLabel, linkRoute } from "./linked";
import {
  deadlineLabel,
  goalAmountLabel,
  goalDone,
  goalNeeded,
  goalPace,
  goalPoints,
  goalProgress,
  goalProjection,
  PACE_LABEL,
} from "./logic";
import { useRoutine } from "./store";
import type { Goal } from "./types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function GoalPanel({
  goal,
  onClose,
  onEdit,
}: {
  goal: Goal | undefined;
  onClose: () => void;
  onEdit: (g: Goal) => void;
}) {
  return (
    <Dialog variant="sheet" open={!!goal} onOpenChange={(o) => !o && onClose()} title={goal?.name || "Meta"} hideTitle>
      {goal && <Content goal={goal} onEdit={() => onEdit(goal)} />}
    </Dialog>
  );
}

function Content({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { habits } = useRoutine();
  const { modalities } = useTreinos();
  const { skills } = useSkills();
  const { investments, recurrences } = useFinancas();
  const now = today();
  const done = goalDone(goal);
  const pace = goalPace(goal, now);
  const needed = goalNeeded(goal, now);
  // A previsão só ajuda sem prazo ou quando está atrás; no ritmo, ela repetiria o prazo.
  const projection = !pace || pace.status === "atrasada" ? goalProjection(goal, now) : null;
  const deadline = deadlineLabel(goal, now);
  const isMoney = goal.unit.trim().toLowerCase() === "reais";
  const fmt = (v: number) => (isMoney ? money(v) : `${number.format(v)} ${goal.unit}`.trim());

  // Metas ligadas a investimentos: o histórico e o aporte vêm de Finanças.
  const month = monthOf(now);
  let points: ChartPoint[] = [];
  let perMonth = 0;
  if (goal.link?.kind === "investimento") {
    const investmentId = goal.link.investmentId;
    const inv = investments.find((i) => i.id === investmentId);
    points = inv ? inv.history.map((p) => ({ date: p.date, value: p.balance })) : [];
    perMonth = inv ? monthlyContribution(recurrences, inv.id, month) : 0;
  } else if (goal.link?.kind === "investimentos") {
    points = totalHistory(investments);
    perMonth = investments.reduce((n, i) => n + monthlyContribution(recurrences, i.id, month), 0);
  } else if (!goal.link) {
    points = goalPoints(goal, now);
  }
  const reach = perMonth > 0 ? reachDate(goal.current, goal.target, perMonth, now) : null;
  const investment = goal.link?.kind === "investimento" ? investments.find((i) => goal.link?.kind === "investimento" && i.id === goal.link.investmentId) : undefined;

  return (
    <>
      <DialogBody className="flex flex-col gap-6 pt-12">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{goal.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{goal.name}</h2>
            <p className="text-sm text-muted-foreground">{goalAmountLabel(goal)}</p>
          </div>
          <span className="text-2xl font-semibold tabular-nums">{Math.round(goalProgress(goal) * 100)}%</span>
        </div>

        <div>
          <GoalBar goal={goal} />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {done ? (
              <Badge tone="success">Concluída</Badge>
            ) : (
              pace && <Badge tone={PACE_TONE[pace.status]}>{PACE_LABEL[pace.status]}</Badge>
            )}
            {deadline && <span className="text-muted-foreground">{deadline}</span>}
            {goal.deadline && <span className="text-muted-foreground">· prazo em {formatDate(goal.deadline)}</span>}
          </div>
        </div>

        {!done && (pace || needed || projection || reach) && (
          <ul className="flex flex-col gap-2.5 rounded-lg border border-border p-3 text-sm">
            {pace && (
              <Fact icon={Gauge}>
                Hoje deveria estar em {Math.round(pace.expected * 100)}% e está em {Math.round(goalProgress(goal) * 100)}%.
              </Fact>
            )}
            {needed && <Fact icon={CalendarClock}>{needed}.</Fact>}
            {reach ? (
              <Fact icon={PiggyBank}>
                Com o aporte de {money(perMonth)} por mês, chega lá em {formatDate(reach.date, "MMMM 'de' yyyy")} (sem contar rendimento).
              </Fact>
            ) : (
              projection && (
                <Fact icon={TrendingUp}>
                  No ritmo de até agora, chega lá em {formatDate(projection, "MMMM 'de' yyyy")}
                  {goal.deadline && formatDate(projection, "yyyy-MM-dd") > goal.deadline ? ", depois do prazo" : ""}.
                </Fact>
              )
            )}
          </ul>
        )}

        {goal.link && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              {linkLabel(goal.link, { modalities, habits, skills, investments })}
              {investment && ` (saldo de ${money(balance(investment))})`}
            </span>
            {goal.link.kind !== "habito" && (
              <Link to={linkRoute(goal.link)} className="shrink-0 font-medium text-primary hover:underline">
                Abrir origem
              </Link>
            )}
          </div>
        )}

        {!goal.link && !goal.steps && !done && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <p className="text-sm">
              <span className="font-medium">Onde está agora:</span> {fmt(goal.current)}
            </p>
            <QuickUpdate goal={goal} />
          </div>
        )}

        {goal.steps && <StepsEditor goal={goal} />}

        {points.length >= 2 && (
          <section>
            <h3 className="mb-1 text-sm font-medium">Evolução</h3>
            <LineChart
              points={points}
              label={`Evolução de ${goal.name}`}
              format={fmt}
              axisFormat={isMoney ? shortMoney : (v) => number.format(v)}
              target={{ value: goal.target, label: `Alvo: ${fmt(goal.target)}` }}
            />
          </section>
        )}

        {goal.notes && (
          <section>
            <h3 className="mb-1 text-sm font-medium">Anotações</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{goal.notes}</p>
          </section>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onEdit}>
          <Pencil />
          Editar
        </Button>
      </DialogFooter>
    </>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Gauge; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** As etapas da meta, editáveis na hora: marcar, tirar e incluir. */
export function StepsEditor({ goal }: { goal: Goal }) {
  const { updateGoal } = useRoutine();
  const [text, setText] = useState("");
  const steps = goal.steps ?? [];

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    updateGoal(goal.id, { steps: [...steps, { id: crypto.randomUUID(), text: text.trim(), done: false }] });
    setText("");
  }

  return (
    <section>
      <h3 className="mb-1.5 text-sm font-medium">
        Etapas{" "}
        <span className="font-normal text-muted-foreground tabular-nums">
          {steps.filter((s) => s.done).length} de {steps.length}
        </span>
      </h3>
      <ul className="overflow-hidden rounded-lg border border-border">
        {steps.map((s) => (
          <li key={s.id} className="group flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0">
            <Checkbox
              checked={s.done}
              label={s.text}
              onChange={(done) => updateGoal(goal.id, { steps: steps.map((x) => (x.id === s.id ? { ...x, done } : x)) })}
            />
            <span className={cn("min-w-0 flex-1 text-sm", s.done && "text-muted-foreground line-through")}>{s.text}</span>
            <button
              type="button"
              aria-label={`Tirar a etapa ${s.text}`}
              onClick={() => updateGoal(goal.id, { steps: steps.filter((x) => x.id !== s.id) })}
              className="rounded-sm p-0.5 text-subtle-foreground opacity-60 hover:text-danger-strong hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
        <li>
          <form onSubmit={add} className="flex items-center gap-2 px-2 py-1.5">
            <Input
              aria-label="Nova etapa"
              placeholder="Nova etapa"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-8 border-transparent bg-transparent"
            />
            <Button type="submit" variant="ghost" size="icon" aria-label="Incluir etapa" disabled={!text.trim()}>
              <Plus />
            </Button>
          </form>
        </li>
      </ul>
    </section>
  );
}
