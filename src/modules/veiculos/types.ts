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
}

/** Os custos fixos que todo veículo costuma ter, cada um vira uma recorrência. */
export type CostRole = "parcela" | "ipva" | "seguro" | "licenciamento" | "custo";

export const FIXED_COSTS: { role: Exclude<CostRole, "parcela" | "custo">; label: string; icon: string; category: string; hint: string }[] = [
  { role: "ipva", label: "IPVA", icon: "🧾", category: "Impostos", hint: "Valor do ano e quando vence (cota única)." },
  { role: "seguro", label: "Seguro", icon: "🛡️", category: "Transporte", hint: "Valor e data de pagamento ou renovação." },
  { role: "licenciamento", label: "Licenciamento", icon: "📄", category: "Impostos", hint: "Taxa anual do Detran." },
];
