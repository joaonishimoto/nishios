import { add, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Project, Task, TimeEntry } from "./types";

/** Tarefas de exemplo, com prazos relativos a hoje. */
export function seedTasks(): Task[] {
  const now = today();
  const inDays = (n: number) => toISO(add(now, { days: n }));
  const ago = (n: number) => toISO(sub(now, { days: n }));
  const base = { notes: "", completedAt: "", createdAt: ago(6), projectId: "" };

  const tasks: Omit<Task, "rank">[] = [
    { ...base, id: "t1", title: "Enviar a proposta do site para a confeitaria", status: "doing", priority: "urgent", list: "Trabalho", projectId: "p1", due: inDays(0), notes: "Incluir o prazo de 3 semanas e as duas opções de pacote." },
    { ...base, id: "t2", title: "Revisar o módulo 4 do curso de inglês", status: "doing", priority: "normal", list: "Estudos", due: inDays(2) },
    { ...base, id: "t3", title: "Pagar o IPVA", status: "todo", priority: "high", list: "Pessoal", due: ago(1) },
    { ...base, id: "t4", title: "Marcar a revisão do carro", status: "todo", priority: "high", list: "Pessoal", due: inDays(3) },
    { ...base, id: "t5", title: "Comprar ração da Maki e do Gojo", status: "todo", priority: "normal", list: "Casa", due: inDays(0) },
    { ...base, id: "t6", title: "Organizar os recibos para o imposto de renda", status: "todo", priority: "normal", list: "Pessoal", due: inDays(12) },
    { ...base, id: "t7", title: "Trocar a lâmpada da varanda", status: "todo", priority: "low", list: "Casa", due: "" },
    { ...base, id: "t8", title: "Ligar para o Rafa sobre a viagem de janeiro", status: "todo", priority: "low", list: "Pessoal", due: inDays(6) },
    { ...base, id: "t9", title: "Publicar o carrossel da semana", status: "done", priority: "normal", list: "Trabalho", projectId: "p2", due: ago(1), completedAt: ago(1) },
    { ...base, id: "t10", title: "Renovar o seguro do notebook", status: "done", priority: "high", list: "Pessoal", due: ago(3), completedAt: ago(4) },
    { ...base, id: "t11", title: "Montar o layout da página de cardápio", status: "todo", priority: "high", list: "Trabalho", projectId: "p1", due: inDays(4) },
    { ...base, id: "t12", title: "Configurar o domínio e o e-mail", status: "todo", priority: "normal", list: "Trabalho", projectId: "p1", due: inDays(9) },
    { ...base, id: "t13", title: "Pedir as fotos dos doces", status: "todo", priority: "normal", list: "Trabalho", projectId: "p1", due: "" },
    { ...base, id: "t14", title: "Roteiro do Reels de segunda", status: "todo", priority: "high", list: "Trabalho", projectId: "p2", due: inDays(1) },
    { ...base, id: "t15", title: "Relatório de métricas do mês", status: "todo", priority: "normal", list: "Trabalho", projectId: "p2", due: inDays(8) },
  ];
  return tasks.map((t, i) => ({ ...t, rank: i }));
}

export function seedProjects(): Project[] {
  const created = sub(today(), { days: 30 }).toISOString();
  return [
    { id: "p1", name: "Site da confeitaria", icon: "🍰", client: "Doce Ateliê", notes: "", hourlyRate: 120, archived: false, createdAt: created },
    { id: "p2", name: "Conteúdo do Instagram", icon: "📣", client: "", notes: "", hourlyRate: 0, archived: false, createdAt: created },
  ];
}

export function seedTimeEntries(): TimeEntry[] {
  const ago = (n: number) => toISO(sub(today(), { days: n }));
  return [
    { id: "h1", projectId: "p1", taskId: "t1", date: ago(0), minutes: 90, note: "Proposta e orçamento" },
    { id: "h2", projectId: "p1", taskId: "", date: ago(2), minutes: 120, note: "Reunião de briefing" },
    { id: "h3", projectId: "p1", taskId: "t11", date: ago(3), minutes: 150, note: "" },
    { id: "h4", projectId: "p2", taskId: "t9", date: ago(1), minutes: 60, note: "" },
  ];
}
