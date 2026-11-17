import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { UPCOMING_NAV } from "@/components/shell/nav";
import { CycleTrack } from "@/modules/compromissos/CycleTrack";
import { MarkDone } from "@/modules/compromissos/MarkDone";
import { byUrgency, derive, dueLabel, shortDate, STATUS_META, today } from "@/modules/compromissos/logic";
import { useCommitments } from "@/modules/compromissos/store";
import { useAttention } from "@/modules/compromissos/useAttention";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function HomePage() {
  const { commitments } = useCommitments();
  const attention = useAttention();
  const now = today();
  const upcoming = commitments
    .filter((c) => derive(c).status === "ok")
    .sort((a, b) => byUrgency(a, b))
    .slice(0, 3);
  const dateLine = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-muted-foreground first-letter:uppercase">{dateLine}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{greeting()}, João</h1>
      </header>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {attention.length === 0
              ? "Nada pedindo atenção"
              : attention.length === 1
                ? "1 compromisso pede atenção"
                : `${attention.length} compromissos pedem atenção`}
          </h2>
          <Link
            to="/compromissos"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

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

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold tracking-tight">Depois disso</h2>
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
            {upcoming.map((c) => {
              const d = derive(c);
              return (
                <li key={c.id} className="border-b border-border last:border-b-0">
                  <Link
                    to={`/compromissos?c=${c.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover"
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <span className="hidden w-32 sm:block">
                      <CycleTrack derived={d} />
                    </span>
                    <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">
                      {dueLabel(d)}
                    </span>
                  </Link>
                </li>
              );
            })}
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
