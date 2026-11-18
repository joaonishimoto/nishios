import { format, subMonths } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Investment, Recurrence } from "./types";

/** Dia `day` de `months` meses atrás (negativo = à frente). */
function on(day: number, months: number): string {
  const d = subMonths(today(), months);
  return `${format(d, "yyyy-MM")}-${String(day).padStart(2, "0")}`;
}

/**
 * Exemplos com datas relativas a hoje: o mês atual sempre tem salário,
 * contas da casa, assinaturas, um parcelamento em andamento e o aporte da reserva.
 */
export function seedRecurrences(): Recurrence[] {
  const base = { notes: "", every: 1 };
  return [
    { ...base, id: "r-salario", kind: "in", name: "Salário", icon: "💼", category: "Salário", amount: 7800, first: on(5, 24) },
    { ...base, id: "r-freela", kind: "in", name: "Freela fixo de design", icon: "💰", category: "Renda extra", amount: 1200, first: on(20, 5), notes: "Contrato de 12 meses.", times: 12 },
    { ...base, id: "r-aluguel", kind: "out", name: "Aluguel", icon: "🏠", category: "Moradia", amount: 2300, first: on(10, 18) },
    { ...base, id: "r-condominio", kind: "out", name: "Condomínio", icon: "🏢", category: "Moradia", amount: 640, first: on(10, 18) },
    { ...base, id: "r-luz", kind: "out", name: "Luz", icon: "💡", category: "Contas da casa", amount: 210, approx: true, first: on(15, 18) },
    { ...base, id: "r-internet", kind: "out", name: "Internet", icon: "🌐", category: "Contas da casa", amount: 119.9, first: on(12, 18) },
    { ...base, id: "r-celular", kind: "out", name: "Plano do celular", icon: "📱", category: "Contas da casa", amount: 59.9, first: on(8, 14), assetId: "a2" },
    { ...base, id: "r-academia", kind: "out", name: "Academia", icon: "🏋️", category: "Saúde", amount: 149.9, first: on(1, 10) },
    { ...base, id: "r-muaythai", kind: "out", name: "Muay thai", icon: "🥋", category: "Saúde", amount: 220, first: on(5, 6) },
    { ...base, id: "r-spotify", kind: "out", name: "Spotify", icon: "🎵", category: "Assinaturas", amount: 21.9, first: on(18, 30) },
    { ...base, id: "r-netflix", kind: "out", name: "Netflix", icon: "📺", category: "Assinaturas", amount: 44.9, first: on(22, 30) },
    { ...base, id: "r-racao", kind: "out", name: "Ração e areia dos gatos", icon: "🐱", category: "Pets", amount: 260, approx: true, first: on(3, 12) },
    { ...base, id: "r-seguro", kind: "out", name: "Seguro do carro", icon: "🛡️", category: "Transporte", amount: 2400, every: 12, first: on(15, -2), assetId: "a11" },
    { ...base, id: "r-ipva", kind: "out", name: "IPVA", icon: "🧾", category: "Impostos", amount: 2480, every: 12, first: on(20, today().getMonth()), assetId: "a11", notes: "Cota única com desconto." },
    { ...base, id: "r-notebook", kind: "out", name: "MacBook Air (parcelas)", icon: "💻", category: "Parcelamentos", amount: 949.9, first: on(15, 7), times: 10, assetId: "a1" },
    { ...base, id: "r-aporte-reserva", kind: "out", name: "Aporte na reserva", icon: "🐷", category: "Investimentos", amount: 1000, first: on(6, 12), investmentId: "inv-reserva" },
    { ...base, id: "r-aporte-tesouro", kind: "out", name: "Aporte no Tesouro", icon: "📈", category: "Investimentos", amount: 300, first: on(6, 8), investmentId: "inv-tesouro" },
  ];
}

export function seedInvestments(): Investment[] {
  const now = today();
  const at = (months: number) => toISO(subMonths(now, months));
  // Reserva: 1.000 por mês com um pouco de rendimento, até os 18.500 de hoje.
  const reserva = [12100, 13150, 14230, 15300, 16380, 17440, 18500];
  const tesouro = [9200, 9560, 9900, 10310, 10720, 11050, 11400];
  return [
    {
      id: "inv-reserva",
      name: "Reserva de emergência",
      icon: "🐷",
      type: "reserva",
      institution: "Nubank, Caixinha",
      history: reserva.map((balance, i) => ({ date: at(reserva.length - 1 - i), balance })),
      notes: "Liquidez diária. Seis meses de custo de vida.",
    },
    {
      id: "inv-tesouro",
      name: "Tesouro IPCA+ 2035",
      icon: "📈",
      type: "renda-fixa",
      institution: "XP",
      history: tesouro.map((balance, i) => ({ date: at(tesouro.length - 1 - i), balance })),
      notes: "Para a aposentadoria. Não mexer.",
    },
  ];
}

