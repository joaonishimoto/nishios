import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { UPCOMING_NAV } from "@/components/shell/nav";
import { CycleTrack } from "@/components/ui/CycleTrack";
import { MarkDone } from "@/modules/compromissos/MarkDone";
import { derive, dueLabel, shortDate, STATUS_META, today } from "@/modules/compromissos/logic";
import { useAttention } from "@/modules/compromissos/useAttention";
import { Avatar } from "@/components/ui/Avatar";
import {
  birthdayLabel,
  byContactUrgency,
  contact,
  needsContact,
  nextContactLabel,
  upcomingBirthdays,
} from "@/modules/pessoas/logic";
import { usePeople } from "@/modules/pessoas/store";
import type { Person } from "@/modules/pessoas/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/cn";
import { toISO } from "@/lib/dates";
import { isDone, isScheduled } from "@/modules/rotina/logic";
import { useRoutine } from "@/modules/rotina/store";
import { byPriority, needsAttention } from "@/modules/tarefas/logic";
import { useTasks } from "@/modules/tarefas/store";
import { DueLabel, TaskCheck } from "@/modules/tarefas/TaskBits";

function PersonLine({ person, detail, tone }: { person: Person; detail: string; tone: string }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={`/pessoas?p=${person.id}`}
        className="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover"
      >
        <Avatar name={person.name} />
        <span className="min-w-0 flex-1 truncate font-medium">{person.name}</span>
        <span className={cn("shrink-0 text-sm", tone)}>{detail}</span>
      </Link>
    </li>
  );
}

function SectionHeader({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {linkLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function HomePage() {
  const attention = useAttention();
  const now = today();
  const { habits, toggleHabit } = useRoutine();
  const { tasks } = useTasks();
  const dueHabits = habits.filter((h) => isScheduled(h, now));
  const doneHabits = dueHabits.filter((h) => isDone(h, now)).length;
  const todayTasks = tasks.filter((t) => needsAttention(t, now)).sort(byPriority);
  const { people } = usePeople();
  const birthdays = upcomingBirthdays(people, 7, now);
  const toReach = people
    .filter((p) => needsContact(p, now))
    .sort((a, b) => byContactUrgency(a, b, now))
    .slice(0, 4);
  const dateLine = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-muted-foreground first-letter:uppercase">{dateLine}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{greeting()}, João</h1>
      </header>

      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <section>
          <SectionHeader
            title={
              dueHabits.length === 0
                ? "Rotina de hoje"
                : `Rotina de hoje: ${doneHabits} de ${dueHabits.length}`
            }
            to="/rotina"
            linkLabel="Ver a semana"
          />
          {dueHabits.length === 0 ? (
            <p className="mt-2 text-muted-foreground">Nenhum hábito previsto para hoje.</p>
          ) : (
            <>
              <Progress
                value={doneHabits / dueHabits.length}
                done={doneHabits === dueHabits.length}
                label="Hábitos feitos hoje"
                className="mt-3 h-1.5"
              />
              <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
                {dueHabits.map((h) => {
                  const done = isDone(h, now);
                  return (
                    <li
                      key={h.id}
                      className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        checked={done}
                        onChange={() => toggleHabit(h.id, toISO(now))}
                        label={h.name}
                      />
                      <span className="text-lg leading-none">{h.icon}</span>
                      <span className={cn("truncate", done && "text-muted-foreground line-through")}>
                        {h.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section>
          <SectionHeader
            title={
              todayTasks.length === 0
                ? "Tarefas para hoje"
                : todayTasks.length === 1
                  ? "1 tarefa para hoje"
                  : `${todayTasks.length} tarefas para hoje`
            }
            to="/tarefas"
            linkLabel="Ver todas"
          />
          {todayTasks.length === 0 ? (
            <p className="mt-2 text-muted-foreground">
              Nenhuma tarefa vence hoje e nada está atrasado.
            </p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {todayTasks.map((t) => (
                <li
                  key={t.id}
                  className="relative flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-surface-hover"
                >
                  <TaskCheck task={t} />
                  <Link
                    to={`/tarefas?t=${t.id}`}
                    className="min-w-0 flex-1 truncate font-medium after:absolute after:inset-0"
                  >
                    {t.title}
                  </Link>
                  <DueLabel task={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <SectionHeader
          title={
            attention.length === 0
              ? "Nenhum compromisso pedindo atenção"
              : attention.length === 1
                ? "1 compromisso pede atenção"
                : `${attention.length} compromissos pedem atenção`
          }
          to="/compromissos"
          linkLabel="Ver todos"
        />

        {attention.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Todos os seus compromissos estão em dia.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((c) => {
              const d = derive(c);
              const meta = STATUS_META[d.status];
              return (
                <li
                  key={c.id}
                  className="relative flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:border-border-strong"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/compromissos?c=${c.id}`}
                        className="block truncate font-medium after:absolute after:inset-0"
                      >
                        {c.name}
                      </Link>
                      <p
                        className={
                          d.status === "overdue"
                            ? "text-sm text-danger-strong"
                            : "text-sm text-warning-strong"
                        }
                      >
                        {dueLabel(d)}
                      </p>
                    </div>
                    <Dot tone={meta.tone} className="mt-1.5" />
                  </div>
                  <CycleTrack derived={d} className="mt-4" />
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{d.lastDone && shortDate(d.lastDone)}</span>
                    <span>{d.nextDue && shortDate(d.nextDue)}</span>
                  </div>
                  <div className="relative z-10 mt-4">
                    <MarkDone commitment={c} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(toReach.length > 0 || birthdays.length > 0) && (
        <section>
          <SectionHeader title="Pessoas" to="/pessoas" linkLabel="Ver todas" />
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
            {birthdays.map(({ person, birthday: b }) => (
              <PersonLine
                key={`b-${person.id}`}
                person={person}
                detail={`Aniversário ${birthdayLabel(b).toLowerCase()}, faz ${b.turning}`}
                tone="text-warning-strong"
              />
            ))}
            {toReach.map((person) => (
              <PersonLine
                key={`c-${person.id}`}
                person={person}
                detail={nextContactLabel(contact(person, now))}
                tone="text-danger-strong"
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold tracking-tight">O que vem nas próximas fases</h2>
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Esta é a fundação do NishiOS. Os outros módulos entram aos poucos, usando o mesmo design
          system.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {UPCOMING_NAV.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-dashed border-border-strong px-2.5 text-sm text-muted-foreground"
            >
              <Icon className="size-3.5" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
