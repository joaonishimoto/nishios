import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { LevelDots } from "@/components/ui/LevelDots";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { lastActivity, LEVEL_LABELS, matches, resourceProgress, STATUS_META, STATUS_ORDER } from "./logic";
import { SkillPanel } from "./SkillPanel";
import { useSkills } from "./store";
import type { Skill, SkillStatus, SkillType } from "./types";

type Filter = "all" | SkillType;

export function SkillsPage() {
  const { skills, create, update } = useSkills();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState<SkillStatus | null>(null);

  const openSkill = skills.find((s) => s.id === params.get("s"));
  const open = (id: string | null) =>
    setParams(id ? { s: id } : {}, { replace: !id, preventScrollReset: true });

  const columns = useMemo(() => {
    const visible = skills.filter((s) => matches(s, filter, query));
    return STATUS_ORDER.map((status) => ({
      status,
      items: visible
        .filter((s) => s.status === status)
        .sort((a, b) =>
          status === "learned"
            ? b.level - a.level || a.name.localeCompare(b.name, "pt-BR")
            : lastActivity(b).localeCompare(lastActivity(a)),
        ),
    }));
  }, [skills, filter, query]);

  const learning = skills.filter((s) => s.status === "learning").length;
  const learned = skills.filter((s) => s.status === "learned").length;
  const filtering = filter !== "all" || query.trim() !== "";
  const nothingFound = filtering && columns.every((c) => c.items.length === 0);
  const newType: SkillType = filter === "soft" ? "soft" : "hard";

  function add(status: SkillStatus) {
    open(create("", status, newType).id);
  }

  return (
    <>
      <PageHeader
        title="Skills"
        description={
          skills.length === 0
            ? "O que você sabe, o que está aprendendo e o que ainda falta."
            : `${learning === 0 ? "Nada em estudo agora" : `Aprendendo ${plural(learning, "skill", "skills")} agora`}, ${learned} já ${learned === 1 ? "dominada" : "dominadas"}.`
        }
        action={
          <Button onClick={() => add("want")}>
            <Plus />
            Nova skill
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          label="Tipo de skill"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todas", count: skills.length },
            { value: "hard", label: "Hard skills", count: skills.filter((s) => s.type === "hard").length },
            { value: "soft", label: "Soft skills", count: skills.filter((s) => s.type === "soft").length },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-52">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar skill"
            placeholder="Buscar"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        {skills.length === 0 ? (
          <EmptyState
            title="Nenhuma skill ainda"
            description="Comece listando o que você quer aprender. Depois é só arrastar conforme avança."
            action={
              <Button onClick={() => add("want")}>
                <Plus />
                Nova skill
              </Button>
            }
          />
        ) : nothingFound ? (
          <EmptyState
            title="Nada por aqui"
            description="Nenhuma skill combina com os filtros escolhidos."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {columns.map(({ status, items }) => {
              const meta = STATUS_META[status];
              return (
                <section
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(status);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) update(id, { status });
                    setDragOver(null);
                  }}
                  className={cn(
                    "flex flex-col rounded-lg bg-surface-muted p-2 transition-colors duration-(--motion-fast)",
                    dragOver === status && "bg-surface-selected",
                  )}
                >
                  <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold">
                    <Dot tone={meta.tone} />
                    {meta.label}
                    <span className="font-normal text-subtle-foreground tabular-nums">{items.length}</span>
                  </h2>
                  {items.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">{meta.empty}</p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-2">
                      {items.map((s) => (
                        <Card key={s.id} skill={s} onOpen={() => open(s.id)} />
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => add(status)}
                    className="mt-1 flex h-9 items-center gap-2 rounded-md px-2 text-left text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="size-4" aria-hidden />
                    Adicionar skill
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <SkillPanel skill={openSkill} onClose={() => open(null)} />
    </>
  );
}

function Card({ skill, onOpen }: { skill: Skill; onOpen: () => void }) {
  const progress = resourceProgress(skill);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", skill.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="relative flex cursor-grab flex-col gap-2.5 rounded-md border border-border bg-surface p-3 shadow-xs transition-colors duration-(--motion-fast) hover:border-border-strong active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "text-left leading-snug font-medium after:absolute after:inset-0",
          !skill.name && "text-subtle-foreground",
        )}
      >
        {skill.name || "Sem nome"}
      </button>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Badge tone={skill.type === "hard" ? "info" : "warning"}>{skill.type === "hard" ? "Hard" : "Soft"}</Badge>
        <span className="truncate text-sm text-muted-foreground">{skill.category}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <LevelDots value={skill.level} />
        <span className="text-sm text-muted-foreground">{LEVEL_LABELS[skill.level]}</span>
        {progress.total > 0 && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {progress.done} de {progress.total} {progress.total === 1 ? "passo" : "passos"}
          </span>
        )}
      </div>
    </li>
  );
}
