import type { Acquisition } from "@/lib/financiamento";

export type VehicleKind = "carro" | "moto" | "caminhonete" | "outro";

export const VEHICLE_KINDS: { value: VehicleKind; label: string; icon: string }[] = [
  { value: "carro", label: "Carro", icon: "🚗" },
  { value: "moto", label: "Moto", icon: "🏍️" },
  { value: "caminhonete", label: "Caminhonete", icon: "🛻" },
  { value: "outro", label: "Outro", icon: "🛵" },
];

export const VEHICLE_ICONS = ["🚗", "🚙", "🏎️", "🛻", "🚐", "🏍️", "🛵", "🚲", "🛴", "🚤", "🚚", "🚘"];

/**
 * Um veículo. Os custos que se repetem (parcela, IPVA, seguro, licenciamento e outros)
 * não ficam aqui: são recorrências de Finanças com `link: { module: "veiculos", id }`,
 * para aparecerem na previsão do mês, no calendário e nos avisos.
 */
export interface Vehicle {
  id: string;
  name: string;
  icon: string;
  kind: VehicleKind;
  brand: string;
  model: string;
  /** Ano do modelo. */
  year?: number;
  plate: string;
  color?: string;
  /** Quilometragem mais recente informada. */
  km?: number;
  /** Quanto vale hoje (tabela FIPE ou avaliação). É o que entra no patrimônio. */
  marketValue: number;
  /** Quando o valor foi atualizado, yyyy-MM-dd. */
  marketValueDate: string;
  acquisition: Acquisition;
  /** Seguradora e corretor, para achar rápido na hora de um sinistro. */
  insurer?: string;
  /** Quando foi vendido; vendido sai da conta do patrimônio e os custos param. */
  sold?: { date: string; price: number };
  notes: string;
  createdAt: string;
  /** Diário do carro: trocas de óleo e pneus, lavagens, batidas, multas... */
  log?: VehicleEvent[];
}

export type EventKind = "oleo" | "pneus" | "lavagem" | "revisao" | "batida" | "multa" | "outro";

export interface VehicleEvent {
  id: string;
  kind: EventKind;
  /** yyyy-MM-dd */
  date: string;
  /** Quanto custou, em reais (0 quando não teve custo). */
  cost: number;
  /** Quilometragem no dia. */
  km?: number;
  /** Batida: o seguro cobriu (o custo é só a franquia ou nada). Multa: já paguei. */
  covered?: boolean;
  /** Multa: pontos na carteira. */
  points?: number;
  /** Título curto: "Troca dos 4 pneus", "Ralado no estacionamento". */
  title: string;
  notes: string;
}

export const EVENT_KINDS: { value: EventKind; label: string; icon: string; hint: string }[] = [
  { value: "oleo", label: "Troca de óleo", icon: "🛢️", hint: "Óleo e filtros" },
  { value: "pneus", label: "Pneus", icon: "🛞", hint: "Troca, rodízio, alinhamento" },
  { value: "lavagem", label: "Lavagem", icon: "🧽", hint: "Lavagem, polimento, higienização" },
  { value: "revisao", label: "Revisão ou conserto", icon: "🔧", hint: "Revisão, freio, bateria, mecânico" },
  { value: "batida", label: "Batida", icon: "💥", hint: "Acidente, ralado, amassado" },
  { value: "multa", label: "Multa", icon: "🚨", hint: "Infração, pontos e valor" },
  { value: "outro", label: "Outro", icon: "📌", hint: "Qualquer outra coisa" },
];

/** Os custos fixos que todo veículo costuma ter, cada um vira uma recorrência. */
export type CostRole = "parcela" | "ipva" | "seguro" | "licenciamento" | "custo";

export const FIXED_COSTS: { role: Exclude<CostRole, "parcela" | "custo">; label: string; icon: string; category: string; hint: string }[] = [
  { role: "ipva", label: "IPVA", icon: "🧾", category: "Impostos", hint: "Valor do ano e quando vence (cota única)." },
  { role: "seguro", label: "Seguro", icon: "🛡️", category: "Transporte", hint: "Valor e data de pagamento ou renovação." },
  { role: "licenciamento", label: "Licenciamento", icon: "📄", category: "Impostos", hint: "Taxa anual do Detran." },
];
