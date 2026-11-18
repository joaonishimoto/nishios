import { ArrowRight, Award, BookOpen, Lightbulb, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { LevelDots } from "@/components/ui/LevelDots";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { lastActivity, LEVEL_LABELS, resourceProgress } from "./logic";
import { useSkills } from "./store";
import type { Skill, SkillStatus } from "./types";

/**
 * Visão principal de Skills. Em cima, o que está em estudo, com o próximo passo
 * de cada plano para marcar ali mesmo. Embaixo, o que você já sabe, por nível,
 * e a fila do que quer aprender, com um botão para começar.
 */
export function SkillsOverview({
  skills,
  onOpen,
  onAdd,
}: {
  skills: Skill[];
  onOpen: (id: string) => void;
  onAdd: (status: SkillStatus) => void;
}) {
  const learning = skills.filter((s) => s.status === "learning").sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  const learned = skills
    .filter((s) => s.status === "learned")
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, "pt-BR"));
  const want = skills.filter((s) => s.status === "want").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionTitle title="Estudando agora" count={learning.length} />
        {learning.length === 0 ? (
          <EmptyState
            size="sm"
            icon={BookOpen}
            frame="dashed"
            className="mt-3"
            title="Nada em estudo agora"
            description="Escolha algo em “Quero aprender” e toque em Começar."
          />
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {learning.map((s) => (
              <StudyCard key={s.id} skill={s} onOpen={() => onOpen(s.id)} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-x-8 gap-y-10 lg:grid-cols-2 [&>section]:min-w-0">
        <section>
          <SectionTitle title="Já sei" count={learned.length} />
          {learned.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Award}
              frame="dashed"
              className="mt-3"
              title="Nada dominado ainda"
              description="O que você já domina aparece aqui, com o nível de cada uma."
            />
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {learned.map((s) => (
                <li
                  key={s.id}
                  className="relative flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpen(s.id)} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0">
                      {s.name || "Sem nome"}
                    </button>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.type === "hard" ? "Hard" : "Soft"}, {s.category}
                    </p>
                  </div>
                  <LevelDots value={s.level} />
                  <span className="hidden w-28 text-sm text-muted-foreground sm:block">{LEVEL_LABELS[s.level]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle
            title="Quero aprender"
            count={want.length}
            action={
              <Button variant="ghost" size="sm" className="h-8" onClick={() => onAdd("want")}>
                <Plus />
                Adicionar
              </Button>
            }
          />
          {want.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Lightbulb}
              frame="dashed"
              className="mt-3"
              title="Lista vazia"
              description="Anote aqui o que você quer aprender, mesmo sem data para começar."
            />
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
              {want.map((s) => (
                <WantRow key={s.id} skill={s} onOpen={() => onOpen(s.id)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight">
        {title}
        <span className="ml-2 text-base font-normal text-subtle-foreground tabular-nums">{count}</span>
      </h2>
      {action}
    </div>
  );
}

function StudyCard({ skill: s, onOpen }: { skill: Skill; onOpen: () => void }) {
  const { update } = useSkills();
  const toast = useToast();
  const progress = resourceProgress(s);
  const next = s.resources.find((r) => !r.done);
  const lastLog = [...s.log].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <li className="relative flex min-w-0 flex-col rounded-lg border border-border bg-surface p-4 transition-colors duration-(--motion-fast) hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onOpen} className="block max-w-full truncate text-left text-lg font-semibold after:absolute after:inset-0">
            {s.name || "Sem nome"}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={s.type === "hard" ? "info" : "warning"}>{s.type === "hard" ? "Hard" : "Soft"}</Badge>
            <span className="text-sm text-muted-foreground">{s.category}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <LevelDots value={s.level} />
          <span className="text-xs text-muted-foreground">{LEVEL_LABELS[s.level]}</span>
        </div>
      </div>

      {progress.total > 0 ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Plano de estudo</span>
            <span className="tabular-nums">
              {progress.done} de {progress.total}
            </span>
          </div>
          <Progress
            value={progress.done / progress.total}
            done={progress.done === progress.total}
            label={`Plano de estudo de ${s.name}`}
            className="mt-1.5 h-1.5"
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sem plano de estudo. Abra para adicionar cursos, livros ou vídeos.</p>
      )}

      {next && (
        <div className="relative z-10 mt-3 flex items-center gap-2.5 rounded-md bg-surface-muted px-2.5 py-2">
          <Checkbox
            checked={false}
            label={`Concluir ${next.title}`}
            onChange={() => {
              const before = s.resources;
              update(s.id, { resources: s.resources.map((r) => (r.id === next.id ? { ...r, done: true } : r)) });
              toast({ message: `${next.title} concluído`, action: { label: "Desfazer", onClick: () => update(s.id, { resources: before }) } });
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Próximo passo</span>
            <span className="block truncate text-sm">{next.title}</span>
          </span>
        </div>
      )}

      {lastLog && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          <span className="text-foreground">{shortDate(lastLog.date)}:</span> {lastLog.text}
        </p>
      )}
    </li>
  );
}

function WantRow({ skill: s, onOpen }: { skill: Skill; onOpen: () => void }) {
  const { update } = useSkills();
  const toast = useToast();
  return (
    <li
      className={cn(
        "relative flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover",
      )}
    >
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0">
          {s.name || "Sem nome"}
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {s.type === "hard" ? "Hard" : "Soft"}, {s.category}
          {s.resources.length > 0 && `, ${s.resources.length} ${s.resources.length === 1 ? "material" : "materiais"}`}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="relative z-10 h-8"
        onClick={() => {
          update(s.id, { status: "learning" });
          toast({
            message: `${s.name} foi para Estudando agora`,
            action: { label: "Desfazer", onClick: () => update(s.id, { status: "want" }) },
          });
        }}
      >
        Começar
        <ArrowRight />
      </Button>
    </li>
  );
}
