import { add, sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Task } from "./types";

/** Tarefas de exemplo, com prazos relativos a hoje. */
export function seedTasks(): Task[] {
  const now = today();
  const inDays = (n: number) => toISO(add(now, { days: n }));
  const ago = (n: number) => toISO(sub(now, { days: n }));
  const base = { notes: "", completedAt: "", createdAt: ago(6) };

  return [
    { ...base, id: "t1", title: "Enviar a proposta do site para a confeitaria", status: "doing", priority: "urgent", list: "Trabalho", due: inDays(0), notes: "Incluir o prazo de 3 semanas e as duas opções de pacote." },
    { ...base, id: "t2", title: "Revisar o módulo 4 do curso de inglês", status: "doing", priority: "normal", list: "Estudos", due: inDays(2) },
    { ...base, id: "t3", title: "Pagar o IPVA", status: "todo", priority: "high", list: "Pessoal", due: ago(1) },
    { ...base, id: "t4", title: "Marcar a revisão do carro", status: "todo", priority: "high", list: "Pessoal", due: inDays(3) },
    { ...base, id: "t5", title: "Comprar ração da Mel", status: "todo", priority: "normal", list: "Casa", due: inDays(0) },
    { ...base, id: "t6", title: "Organizar os recibos para o imposto de renda", status: "todo", priority: "normal", list: "Pessoal", due: inDays(12) },
    { ...base, id: "t7", title: "Trocar a lâmpada da varanda", status: "todo", priority: "low", list: "Casa", due: "" },
    { ...base, id: "t8", title: "Ligar para o Rafa sobre a viagem de janeiro", status: "todo", priority: "low", list: "Pessoal", due: inDays(6) },
    { ...base, id: "t9", title: "Publicar o carrossel da semana", status: "done", priority: "normal", list: "Trabalho", due: ago(1), completedAt: ago(1) },
    { ...base, id: "t10", title: "Renovar o seguro do notebook", status: "done", priority: "high", list: "Pessoal", due: ago(3), completedAt: ago(4) },
  ];
}
