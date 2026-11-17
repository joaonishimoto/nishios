import { add, parseISO } from "date-fns";
import { toISO } from "@/lib/dates";
import type { Asset, Wish } from "@/modules/bens/types";
import { entrySummary, formatValue } from "@/modules/corpo/logic";
import type { Entry } from "@/modules/corpo/types";
import { derive } from "@/modules/compromissos/logic";
import type { Commitment } from "@/modules/compromissos/types";
import { contact } from "@/modules/pessoas/logic";
import type { Person } from "@/modules/pessoas/types";
import { careState } from "@/modules/pets/logic";
import type { Pet } from "@/modules/pets/types";
import { goalDone } from "@/modules/rotina/logic";
import type { Goal } from "@/modules/rotina/types";
import type { Skill } from "@/modules/skills/types";
import type { Task } from "@/modules/tarefas/types";
import { sessionSummary } from "@/modules/treinos/logic";
import type { Modality, Session } from "@/modules/treinos/types";
import { occurrences, spanDays } from "./events";
import type { CalEvent, CalItem, ItemState } from "./types";

export interface Everything {
  events: CalEvent[];
  tasks: Task[];
  commitments: Commitment[];
  goals: Goal[];
  modalities: Modality[];
  sessions: Session[];
  plannedSessions: Session[];
  entries: Entry[];
  assets: Asset[];
  wishes: Wish[];
  people: Person[];
  pets: Pet[];
  skills: Skill[];
}

/** Quantas vezes projetar para a frente algo que se repete (compromissos, vacinas). */
const MAX_PROJECTIONS = 60;

/**
 * Junta tudo o que tem data no sistema em uma lista só, entre `from` e `to`
 * (yyyy-MM-dd, inclusive). É a única função que conhece todos os módulos:
 * um módulo novo entra no calendário ganhando um bloco aqui.
 */
export function collect(data: Everything, from: string, to: string, now: Date): CalItem[] {
  const items: CalItem[] = [];
  const todayISO = toISO(now);
  const inRange = (d: string) => !!d && d >= from && d <= to;
  const planned = (d: string): ItemState => (d < todayISO ? "overdue" : "planned");
  const push = (item: CalItem) => {
    if (inRange(item.date)) items.push(item);
  };

  /* Eventos próprios e do iPhone */
  for (const e of data.events) {
    const days = spanDays(e);
    const who = (e.personIds ?? []).flatMap((id) => {
      const p = data.people.find((x) => x.id === id);
      return p ? [p.name.split(" ")[0]] : [];
    });
    const withWho = who.length ? `Com ${who.length > 1 ? `${who.slice(0, -1).join(", ")} e ${who.at(-1)}` : who[0]}` : undefined;
    for (const o of occurrences(e, from, to)) {
      const timed = !e.allDay && e.start && o.dayIndex === 0;
      items.push({
        key: `ev-${e.id}-${o.date}`,
        source: e.origin === "iphone" ? "iphone" : "eventos",
        date: o.date,
        title: e.title || "Sem título",
        time: timed ? e.start : undefined,
        endTime: timed ? e.end : undefined,
        state: "planned",
        note: [days > 1 ? `Dia ${o.dayIndex + 1} de ${days}` : undefined, withWho].filter(Boolean).join(". ") || undefined,
        location: e.location || undefined,
        eventId: e.id,
        series:
          e.repeat !== "none"
            ? { id: e.id, repeat: e.repeat, interval: e.interval, until: e.until || undefined, start: e.date, days }
            : undefined,
      });
    }
  }

  /* Tarefas: prazo das abertas, dia de conclusão das feitas */
  for (const t of data.tasks) {
    const title = t.title || "Sem título";
    if (t.status === "done") {
      push({ key: `task-${t.id}`, source: "tarefas", date: t.completedAt || t.due, title, state: "done", note: t.list, to: `/tarefas?t=${t.id}`, taskId: t.id });
    } else if (t.due) {
      push({ key: `task-${t.id}`, source: "tarefas", date: t.due, title, state: planned(t.due), note: t.list, to: `/tarefas?t=${t.id}`, taskId: t.id });
    }
  }

  /* Compromissos: vezes já feitas, o próximo vencimento e as projeções seguintes */
  for (const c of data.commitments) {
    const to_ = `/compromissos?c=${c.id}`;
    for (const d of c.history) {
      push({ key: `com-${c.id}-done-${d}`, source: "compromissos", date: d, title: c.name, icon: c.icon, state: "done", note: "Feito", to: to_ });
    }
    const next = derive(c, now).nextDue;
    if (!next) continue;
    for (let n = 0; n < MAX_PROJECTIONS; n++) {
      const date = toISO(add(next, { [c.intervalUnit]: c.intervalValue * n }));
      if (date > to) break;
      // Só o vencimento real pode estar atrasado; as projeções são sempre futuras.
      if (n > 0 && date < todayISO) continue;
      push({ key: `com-${c.id}-${date}`, source: "compromissos", date, title: c.name, icon: c.icon, state: planned(date), note: n === 0 ? c.category : "Previsão, se o anterior for feito em dia", to: to_ });
    }
  }

  /* Metas: prazo */
  for (const g of data.goals) {
    if (!g.deadline) continue;
    const done = goalDone(g);
    push({ key: `goal-${g.id}`, source: "rotina", date: g.deadline, title: `Prazo da meta: ${g.name}`, icon: g.icon, state: done ? "done" : planned(g.deadline), note: done ? "Meta batida" : undefined, to: "/rotina" });
  }

  /* Treinos registrados */
  const modality = new Map(data.modalities.map((m) => [m.id, m]));
  for (const s of data.plannedSessions) {
    const m = modality.get(s.modalityId);
    if (!m) continue;
    push({ key: `ses-${s.id}`, source: "treinos", date: s.date, title: `${m.name} planejado`, icon: m.icon, state: planned(s.date), note: sessionSummary(s, m), to: `/treinos?m=${m.id}` });
  }
  for (const s of data.sessions) {
    const m = modality.get(s.modalityId);
    if (!m) continue;
    push({ key: `ses-${s.id}`, source: "treinos", date: s.date, title: m.name, icon: m.icon, state: "done", note: sessionSummary(s, m), to: `/treinos?m=${m.id}` });
  }

  /* Corpo: pesagens e medidas registradas */
  for (const e of data.entries) {
    push({ key: `corpo-${e.id}`, source: "corpo", date: e.date, title: e.weight > 0 ? `Peso: ${formatValue(e.weight, "peso")}` : "Medidas do corpo", state: "done", note: entrySummary(e), to: "/corpo" });
  }

  /* Bens: fim da garantia. Desejos: data pretendida de compra */
  for (const a of data.assets) {
    if (a.warrantyUntil) {
      push({ key: `war-${a.id}`, source: "bens", date: a.warrantyUntil, title: `Fim da garantia: ${a.name}`, icon: a.icon, state: "planned", to: "/bens" });
    }
  }
  for (const w of data.wishes) {
    if (w.targetDate) {
      push({ key: `wish-${w.id}`, source: "bens", date: w.targetDate, title: `Comprar: ${w.name}`, icon: w.icon, state: "planned", note: "Lista de desejos", to: "/bens?aba=desejos" });
    }
  }

  /* Aniversários (pessoas e pets) em cada ano do intervalo */
  const years: number[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) years.push(y);
  const birthdays = (id: string, born: string, title: string, source: "pessoas" | "pets", icon: string, to_: string) => {
    for (const y of years) {
      const age = y - Number(born.slice(0, 4));
      if (age < 0) continue;
      const date = `${y}${born.slice(4)}`;
      push({
        key: `bday-${id}-${y}`,
        source,
        date,
        title,
        icon,
        state: "planned",
        note: age === 0 ? "Nascimento" : `Faz ${age} ${age === 1 ? "ano" : "anos"}`,
        to: to_,
        series: { id: `bday-${id}`, repeat: "yearly", interval: 1, start: born, days: 1 },
      });
    }
  };

  /* Pessoas: aniversário e a próxima hora de procurar */
  for (const p of data.people) {
    const to_ = `/pessoas?p=${p.id}`;
    if (p.birthday) birthdays(p.id, p.birthday, `Aniversário de ${p.name}`, "pessoas", "🎂", to_);
    const next = contact(p, now).nextContact;
    if (next) {
      const date = toISO(next);
      push({ key: `contact-${p.id}`, source: "pessoas", date, title: `Falar com ${p.name}`, state: planned(date), note: p.context || p.group, to: to_ });
    }
  }

  /* Pets: aniversário, cuidados feitos e próximos, registros de saúde */
  for (const pet of data.pets) {
    const to_ = `/pets?p=${pet.id}`;
    if (pet.birthday) birthdays(pet.id, pet.birthday, `Aniversário de ${pet.name}`, "pets", pet.icon, to_);
    for (const c of pet.cares) {
      if (c.lastDate) {
        push({ key: `care-${c.id}-done`, source: "pets", date: c.lastDate, title: `${c.name} de ${pet.name}`, icon: pet.icon, state: "done", note: "Feito", to: to_ });
      }
      const next = careState(c, now).next;
      if (!next) continue;
      for (let n = 0; n < MAX_PROJECTIONS; n++) {
        const date = toISO(add(next, { months: c.intervalMonths * n }));
        if (date > to) break;
        if (n > 0 && date < todayISO) continue;
        push({ key: `care-${c.id}-${date}`, source: "pets", date, title: `${c.name} de ${pet.name}`, icon: pet.icon, state: planned(date), note: n === 0 ? undefined : "Previsão, se o anterior for feito em dia", to: to_ });
      }
    }
    for (const h of pet.health) {
      push({ key: `health-${h.id}`, source: "pets", date: h.date, title: `${h.title} de ${pet.name}`, icon: pet.icon, state: "done", note: h.kind, to: to_ });
    }
  }

  /* Skills: anotações do diário */
  for (const s of data.skills) {
    for (const l of s.log) {
      push({ key: `skill-${l.id}`, source: "skills", date: l.date, title: s.name || "Skill", state: "done", note: l.text, to: `/skills?s=${s.id}` });
    }
  }

  return items.sort(byDayOrder);
}

const STATE_ORDER: ItemState[] = ["overdue", "planned", "done"];

/** Dentro do dia: com hora primeiro (em ordem), depois o que falta, depois o feito. */
export function byDayOrder(a: CalItem, b: CalItem): number {
  return (
    a.date.localeCompare(b.date) ||
    Number(!a.time) - Number(!b.time) ||
    (a.time ?? "").localeCompare(b.time ?? "") ||
    STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}

export function groupByDate(items: CalItem[]): Map<string, CalItem[]> {
  const map = new Map<string, CalItem[]>();
  for (const item of items) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  return map;
}

export const isoAdd = (iso: string, days: number) => toISO(add(parseISO(iso), { days }));
