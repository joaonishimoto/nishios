import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as RadixDialog from "@radix-ui/react-dialog";
import { CalendarPlus, ChefHat, CornerDownLeft, GraduationCap, ListPlus, Search, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { shortDate, toISO, today } from "@/lib/dates";
import { money } from "@/lib/format";
import { useBens } from "@/modules/bens/store";
import { useCalendar } from "@/modules/calendario/store";
import { balance } from "@/modules/financas/logic";
import { useFinancas } from "@/modules/financas/store";
import { useCasa } from "@/modules/casa/store";
import { useCulinaria } from "@/modules/culinaria/store";
import { STATUS_META as RECIPE_STATUS } from "@/modules/culinaria/logic";
import { useCommitments } from "@/modules/compromissos/store";
import { usePeople } from "@/modules/pessoas/store";
import { usePets } from "@/modules/pets/store";
import { useRoutine } from "@/modules/rotina/store";
import { useSkills } from "@/modules/skills/store";
import { useTasks } from "@/modules/tarefas/store";
import { useTreinos } from "@/modules/treinos/store";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/modules/treinos/types";
import { MAIN_NAV } from "./nav";

interface Entry {
  id: string;
  group: string;
  title: string;
  detail?: string;
  /** Emoji do item ou ícone do módulo. */
  icon: ReactNode;
  /** Texto extra que também conta na busca (anotações, categoria...). */
  extra?: string;
  run: () => void;
}

/** Minúsculas e sem acento, para "medico" achar "médico". */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** 0 = não bate. Quanto maior, mais em cima: começo do título, começo de palavra, meio, só no texto extra. */
function score(entry: { title: string; hay: string }, tokens: string[]): number {
  let total = 0;
  for (const t of tokens) {
    if (entry.title.startsWith(t)) total += 4;
    else if (entry.title.includes(` ${t}`)) total += 3;
    else if (entry.title.includes(t)) total += 2;
    else if (entry.hay.includes(t)) total += 1;
    else return 0;
  }
  return total;
}

const PER_GROUP = 6;

function Glyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-4 text-muted-foreground" aria-hidden />;
}

/** Tudo o que dá para achar, de todos os módulos. Só é montado com a busca aberta. */
function useEntries(go: (to: string) => void): Entry[] {
  const { tasks, projects } = useTasks();
  const { commitments } = useCommitments();
  const { habits, goals } = useRoutine();
  const { events } = useCalendar();
  const { people } = usePeople();
  const { pets } = usePets();
  const { skills } = useSkills();
  const { assets, wishes } = useBens();
  const { modalities, exercises, plans } = useTreinos();
  const { home } = useCasa();
  const { recurrences, investments } = useFinancas();
  const { recipes } = useCulinaria();

  return useMemo(() => {
    const emoji = (e: string) => <span className="text-base leading-none">{e}</span>;
    const page = (to: string) => {
      const nav = MAIN_NAV.find((n) => n.to === to);
      return nav ? <Glyph icon={nav.icon} /> : null;
    };
    const list: Entry[] = [];
    for (const n of MAIN_NAV) {
      list.push({ id: `nav-${n.to}`, group: "Ir para", title: n.label, icon: <Glyph icon={n.icon} />, run: () => go(n.to!) });
    }
    list.push({ id: "nav-dados", group: "Ir para", title: "Dados e backup", icon: <Glyph icon={Search} />, extra: "exportar importar restaurar", run: () => go("/dados") });
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    for (const p of projects) {
      list.push({
        id: `p-${p.id}`,
        group: "Tarefas",
        title: p.name,
        detail: p.archived ? "Projeto arquivado" : "Projeto",
        icon: emoji(p.icon),
        extra: `${p.client} ${p.notes} projeto`,
        run: () => go(`/tarefas?projeto=${p.id}`),
      });
    }
    for (const t of tasks) {
      list.push({
        id: `t-${t.id}`,
        group: "Tarefas",
        title: t.title,
        detail: t.status === "done" ? "Concluída" : t.due ? shortDate(t.due) : t.list,
        icon: page("/tarefas"),
        extra: `${t.notes} ${t.list} ${projectName.get(t.projectId) ?? ""}`,
        run: () => go(`/tarefas?t=${t.id}`),
      });
    }
    for (const e of events) {
      list.push({
        id: `e-${e.id}`,
        group: "Eventos",
        title: e.title,
        detail: shortDate(e.date),
        icon: page("/calendario"),
        extra: `${e.location} ${e.notes}`,
        run: () => go(`/calendario?dia=${e.date}`),
      });
    }
    for (const c of commitments) {
      list.push({ id: `c-${c.id}`, group: "Compromissos", title: c.name, detail: c.category, icon: emoji(c.icon), extra: c.notes, run: () => go(`/compromissos?c=${c.id}`) });
    }
    for (const h of habits) {
      list.push({ id: `h-${h.id}`, group: "Hábitos", title: h.name, icon: emoji(h.icon), run: () => go(`/rotina?habito=${h.id}`) });
    }
    for (const g of goals) {
      list.push({ id: `g-${g.id}`, group: "Metas", title: g.name, detail: `${g.current} de ${g.target} ${g.unit}`.trim(), icon: emoji(g.icon), extra: g.notes, run: () => go(`/rotina?meta=${g.id}`) });
    }
    for (const p of people) {
      list.push({ id: `p-${p.id}`, group: "Pessoas", title: p.name, detail: p.context || p.group, icon: page("/pessoas"), extra: `${p.group} ${p.city} ${p.notes}`, run: () => go(`/pessoas?p=${p.id}`) });
    }
    for (const p of pets) {
      list.push({ id: `pet-${p.id}`, group: "Pets", title: p.name, detail: p.species, icon: emoji(p.icon), extra: `${p.breed} ${p.notes}`, run: () => go(`/pets?p=${p.id}`) });
      for (const c of p.cares) {
        list.push({ id: `care-${p.id}-${c.id}`, group: "Pets", title: `${c.name} de ${p.name}`, detail: c.lastDate ? `Última em ${shortDate(c.lastDate)}` : "Nunca feita", icon: emoji(p.icon), run: () => go(`/pets?p=${p.id}`) });
      }
    }
    for (const s of skills) {
      list.push({ id: `s-${s.id}`, group: "Skills", title: s.name, detail: s.category, icon: page("/skills"), extra: `${s.notes} ${s.resources.map((r) => r.title).join(" ")}`, run: () => go(`/skills?s=${s.id}`) });
    }
    const recipeName = new Map(recipes.map((r) => [r.id, r.name]));
    for (const r of recipes) {
      const parent = recipeName.get(r.parentId);
      list.push({
        id: `rec-${r.id}`,
        group: "Culinária",
        title: r.name || "Sem nome",
        detail: parent ? `Variação de ${parent}` : RECIPE_STATUS[r.status].label,
        icon: emoji(r.icon),
        extra: `${r.category} ${r.change} ${r.ingredients} ${r.lessons} receita`,
        run: () => go(`/culinaria?r=${r.id}`),
      });
    }
    for (const a of assets) {
      list.push({ id: `a-${a.id}`, group: "Bens", title: a.name, detail: a.location || a.category, icon: emoji(a.icon), extra: `${a.category} ${a.brand ?? ""} ${a.store ?? ""} ${a.notes}`, run: () => go("/bens") });
    }
    for (const w of wishes) {
      list.push({ id: `w-${w.id}`, group: "Desejos", title: w.name, detail: w.price ? money(w.price) : undefined, icon: emoji(w.icon), run: () => go("/bens?aba=desejos") });
    }
    for (const m of modalities) {
      list.push({ id: `m-${m.id}`, group: "Treinos", title: m.name, detail: "Modalidade", icon: emoji(m.icon), run: () => go(`/treinos?m=${m.id}`) });
    }
    // Fichas e exercícios abrem dentro da primeira modalidade de força.
    const strength = modalities.find((m) => m.kind === "strength");
    if (strength) {
      for (const p of plans) {
        list.push({ id: `f-${p.id}`, group: "Treinos", title: p.name, detail: "Ficha", icon: emoji(strength.icon), run: () => go(`/treinos?m=${strength.id}&aba=fichas`) });
      }
      for (const x of exercises) {
        list.push({ id: `ex-${x.id}`, group: "Treinos", title: x.name, detail: `Exercício · ${EQUIPMENT_LABELS[x.equipment]}`, icon: emoji(strength.icon), extra: `${MUSCLE_LABELS[x.muscle]} ${x.notes}`, run: () => go(`/treinos?m=${strength.id}&aba=progresso&ex=${x.id}`) });
      }
    }
    for (const r of home.rooms) {
      list.push({ id: `r-${r.id}`, group: "Casa", title: r.name, detail: "Cômodo", icon: page("/casa"), run: () => go(`/casa?comodo=${r.id}`) });
    }
    for (const r of recurrences) {
      list.push({
        id: `fin-${r.id}`,
        group: "Finanças",
        title: r.name,
        detail: `${r.kind === "in" ? "Entrada" : "Saída"} de ${money(r.amount)}`,
        icon: emoji(r.icon),
        extra: `${r.category} ${r.notes} recorrência`,
        run: () => go(`/financas?aba=recorrencias&r=${r.id}`),
      });
    }
    for (const i of investments) {
      list.push({ id: `inv-${i.id}`, group: "Finanças", title: i.name, detail: money(balance(i)), icon: emoji(i.icon), extra: `${i.institution} ${i.notes} investimento`, run: () => go(`/financas?aba=investimentos&i=${i.id}`) });
    }
    return list;
  }, [tasks, projects, commitments, habits, goals, events, people, pets, skills, assets, wishes, modalities, exercises, plans, home, recurrences, investments, recipes, go]);
}

function Results({ query, onDone }: { query: string; onDone: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const tasks = useTasks();
  const calendar = useCalendar();
  const skills = useSkills();
  const culinaria = useCulinaria();
  const go = useMemo(
    () => (to: string) => {
      navigate(to);
      onDone();
    },
    [navigate, onDone],
  );
  const entries = useEntries(go);
  const indexed = useMemo(
    () => entries.map((e) => ({ entry: e, title: fold(e.title), hay: fold(`${e.detail ?? ""} ${e.extra ?? ""} ${e.group}`) })),
    [entries],
  );

  const text = query.trim();
  const groups = useMemo(() => {
    const tokens = fold(text).split(/\s+/).filter(Boolean);
    const found: { group: string; items: Entry[] }[] = [];
    if (tokens.length === 0) {
      found.push({ group: "Ir para", items: entries.filter((e) => e.group === "Ir para") });
      return found;
    }
    const scored = indexed
      .map((i) => ({ entry: i.entry, s: score(i, tokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    for (const { entry } of scored) {
      let g = found.find((f) => f.group === entry.group);
      if (!g) found.push((g = { group: entry.group, items: [] }));
      if (g.items.length < PER_GROUP) g.items.push(entry);
    }
    // Criar direto da busca: o que foi digitado vira o título.
    const created = (message: string, to: string) => {
      onDone();
      toast({ message, action: { label: "Abrir", onClick: () => navigate(to) } });
    };
    found.push({
      group: "Criar",
      items: [
        {
          id: "new-task",
          group: "Criar",
          title: `Criar tarefa "${text}"`,
          icon: <Glyph icon={ListPlus} />,
          run: () => {
            const t = tasks.create({ title: text });
            created("Tarefa criada", `/tarefas?t=${t.id}`);
          },
        },
        {
          id: "new-event",
          group: "Criar",
          title: `Criar evento hoje "${text}"`,
          icon: <Glyph icon={CalendarPlus} />,
          run: () => {
            const date = toISO(today());
            calendar.create({ title: text, date, endDate: "", allDay: true, start: "", end: "", location: "", notes: "", repeat: "none", interval: 1, until: "" });
            created("Evento criado para hoje", `/calendario?dia=${date}`);
          },
        },
        {
          id: "new-skill",
          group: "Criar",
          title: `Quero aprender "${text}"`,
          icon: <Glyph icon={GraduationCap} />,
          run: () => {
            const s = skills.create(text, "want", "hard");
            created("Skill adicionada em Quero aprender", `/skills?s=${s.id}`);
          },
        },
        {
          id: "new-recipe",
          group: "Criar",
          title: `Nova receita "${text}"`,
          icon: <Glyph icon={ChefHat} />,
          run: () => {
            const r = culinaria.create({ name: text });
            created("Receita criada", `/culinaria?r=${r.id}`);
          },
        },
      ],
    });
    return found;
  }, [text, entries, indexed, tasks, calendar, skills, culinaria, toast, navigate, onDone]);

  const flat = groups.flatMap((g) => g.items);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setActive(0), [text]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // As setas e o Enter são ouvidos no painel todo, com o foco sempre no campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (flat.length ? (i + step + flat.length) % flat.length : 0));
      } else if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        flat[active]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, active]);

  let index = -1;
  return (
    <div ref={listRef} id="busca-resultados" role="listbox" aria-label="Resultados" className="max-h-[min(26rem,60dvh)] overflow-y-auto p-1.5">
      {groups.map((g) => (
        <div key={g.group} role="group" aria-label={g.group} className="mb-1 last:mb-0">
          <p className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">{g.group}</p>
          {g.items.map((item) => {
            index++;
            const i = index;
            const selected = i === active;
            return (
              <div
                key={item.id}
                id={`busca-${i}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => setActive(i)}
                onClick={item.run}
                className={cn(
                  "flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5",
                  selected && "bg-surface-hover",
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {item.detail && <span className="max-w-[40%] shrink-0 truncate text-sm text-muted-foreground">{item.detail}</span>}
                {selected && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const SHORTCUT = isMac ? "⌘K" : "Ctrl K";

/** Busca em tudo, aberta pelo botão da barra de cima ou por Cmd+K. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const close = useMemo(() => () => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-overlay animate-fade-in bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-dialog flex w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 animate-fade-in flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-md focus:outline-none"
        >
          <RadixDialog.Title className="sr-only">Buscar no NishiOS</RadixDialog.Title>
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              role="combobox"
              aria-expanded
              aria-controls="busca-resultados"
              aria-label="Buscar em tudo"
              placeholder="Buscar tarefas, pessoas, eventos, bens..."
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Results query={query} onDone={close} />
          <p className="hidden shrink-0 border-t border-border px-4 py-2 text-xs text-muted-foreground sm:block">
            Setas para escolher, Enter para abrir, Esc para fechar. Digite algo novo para criar uma tarefa, um evento, uma skill
            ou uma receita.
          </p>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
