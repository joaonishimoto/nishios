import { latest } from "@/modules/corpo/logic";
import type { Entry } from "@/modules/corpo/types";
import { MEASURE } from "@/modules/corpo/types";
import { balance, totalInvested } from "@/modules/financas/logic";
import type { Investment } from "@/modules/financas/types";
import type { Skill } from "@/modules/skills/types";
import type { Task } from "@/modules/tarefas/types";
import type { Modality, Session } from "@/modules/treinos/types";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Goal, GoalLink, Habit, TrainingMetric } from "./types";

/** O que as ligações precisam enxergar dos outros módulos. */
export interface LinkData {
  sessions: Session[];
  modalities: Modality[];
  entries: Entry[];
  tasks: Task[];
  skills: Skill[];
  investments: Investment[];
  /** Hábitos já com os dias automáticos, para metas que contam hábito. */
  habits: Habit[];
}

export const TRAINING_METRICS: Record<TrainingMetric, { label: string; unit: string }> = {
  sessions: { label: "Número de treinos", unit: "treinos" },
  distance: { label: "Distância", unit: "km" },
  hours: { label: "Horas de treino", unit: "horas" },
  rounds: { label: "Rounds", unit: "rounds" },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** O número atual de uma meta ligada. */
export function linkedValue(link: GoalLink, data: LinkData): number {
  switch (link.kind) {
    case "treinos": {
      const sessions = data.sessions.filter(
        (s) => s.date >= link.since && (!link.modalityId || s.modalityId === link.modalityId),
      );
      if (link.metric === "sessions") return sessions.length;
      if (link.metric === "hours") return round1(sessions.reduce((n, s) => n + s.duration, 0) / 60);
      if (link.metric === "rounds") return sessions.reduce((n, s) => n + s.rounds, 0);
      // Distância sempre em km, mesmo que a modalidade registre em metros.
      const unit = new Map(data.modalities.map((m) => [m.id, m.unit]));
      return round1(sessions.reduce((n, s) => n + (unit.get(s.modalityId) === "m" ? s.distance / 1000 : s.distance), 0));
    }
    case "habito": {
      const habit = data.habits.find((h) => h.id === link.habitId);
      if (!habit) return 0;
      if (habit.type === "evitar") {
        // Mau hábito: conta os dias limpos desde o início, sem os dias em que escapou.
        const from = [link.since, habit.createdAt ?? ""].sort().at(-1)!;
        const now = today();
        const days = from ? differenceInCalendarDays(now, parseISO(from)) + 1 : 0;
        return Math.max(0, days - new Set(habit.log.filter((d) => d >= from && d <= toISO(now))).size);
      }
      return new Set(habit.log.filter((d) => d >= link.since)).size;
    }
    case "tarefas":
      return data.tasks.filter(
        (t) => t.status === "done" && t.completedAt >= link.since && (!link.list || t.list === link.list),
      ).length;
    case "peso":
      return latest(data.entries, "peso")?.value ?? 0;
    case "gordura":
      return latest(data.entries, "gordura")?.value ?? 0;
    case "medida":
      return latest(data.entries, link.measure)?.value ?? 0;
    case "skill": {
      const skill = data.skills.find((s) => s.id === link.skillId);
      if (!skill) return 0;
      return link.metric === "nivel" ? skill.level : skill.resources.filter((r) => r.done).length;
    }
    case "skills":
      return data.skills.filter((s) => s.status === "learned").length;
    case "investimento": {
      const inv = data.investments.find((i) => i.id === link.investmentId);
      return inv ? balance(inv) : 0;
    }
    case "investimentos":
      return totalInvested(data.investments);
  }
}

/** Frase curta que diz de onde o número vem, para o cartão da meta. */
export function linkLabel(link: GoalLink, data: Pick<LinkData, "modalities" | "habits" | "skills" | "investments">): string {
  switch (link.kind) {
    case "treinos": {
      const m = data.modalities.find((x) => x.id === link.modalityId);
      return `Atualiza sozinha com ${m ? `os treinos de ${m.name.toLowerCase()}` : "os treinos"}`;
    }
    case "habito": {
      const h = data.habits.find((x) => x.id === link.habitId);
      if (h?.type === "evitar") return `Conta os dias sem ${h.name.toLowerCase()}`;
      return `Atualiza sozinha com o hábito ${h ? h.name : "ligado"}`;
    }
    case "tarefas":
      return `Atualiza sozinha com as tarefas concluídas${link.list ? ` de ${link.list}` : ""}`;
    case "peso":
      return "Atualiza sozinha com o peso registrado em Corpo";
    case "gordura":
      return "Atualiza sozinha com a gordura registrada em Corpo";
    case "medida":
      return `Atualiza sozinha com a medida de ${MEASURE[link.measure].label.toLowerCase()} em Corpo`;
    case "skill": {
      const skill = data.skills.find((x) => x.id === link.skillId);
      const what = link.metric === "nivel" ? "o nível" : "os materiais concluídos";
      return `Atualiza sozinha com ${what} de ${skill ? skill.name : "uma skill"}`;
    }
    case "skills":
      return "Atualiza sozinha com as skills que você marca como aprendidas";
    case "investimento": {
      const inv = data.investments.find((i) => i.id === link.investmentId);
      return `Atualiza sozinha com o saldo de ${inv ? inv.name : "um investimento"} em Finanças`;
    }
    case "investimentos":
      return "Atualiza sozinha com o total investido em Finanças";
  }
}

/** Página onde o número da meta é alimentado. */
export function linkRoute(link: GoalLink): string {
  if (link.kind === "treinos") return link.modalityId ? `/treinos?m=${link.modalityId}` : "/treinos";
  if (link.kind === "tarefas") return "/tarefas";
  if (link.kind === "habito") return `/rotina?habito=${link.habitId}`;
  if (link.kind === "skill") return `/skills?s=${link.skillId}`;
  if (link.kind === "skills") return "/skills";
  if (link.kind === "investimento" || link.kind === "investimentos") return "/financas?aba=investimentos";
  return "/corpo";
}

/** Hábitos com os dias de treino somados ao registro manual. */
export function resolveHabits(habits: Habit[], sessions: Session[]): Habit[] {
  return habits.map((h) => {
    if (!h.link || h.type === "evitar") return h;
    const modalityId = h.link.modalityId;
    const auto = [...new Set(sessions.filter((s) => !modalityId || s.modalityId === modalityId).map((s) => s.date))];
    return { ...h, autoDates: auto, log: [...new Set([...h.log, ...auto])] };
  });
}

export function resolveGoals(goals: Goal[], data: LinkData): Goal[] {
  return goals.map((g) => {
    if (g.link) return { ...g, current: linkedValue(g.link, data) };
    // Meta de etapas: o alvo é o número de etapas e o progresso, as concluídas.
    if (g.steps) return { ...g, current: g.steps.filter((s) => s.done).length, target: g.steps.length, unit: "etapas" };
    return g;
  });
}
