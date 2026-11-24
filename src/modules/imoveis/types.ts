/**
 * Um imóvel: apartamento, casa, terreno ou sala. Cada um fica salvo numa chave própria
 * (`nishios:imoveis:<id>`), então mexer em um nunca sobrescreve o outro na sincronização.
 */
export type PropertyKind = "apartamento" | "casa" | "terreno" | "comercial" | "outro";

export const PROPERTY_KINDS: { value: PropertyKind; label: string; icon: string }[] = [
  { value: "apartamento", label: "Apartamento", icon: "🏢" },
  { value: "casa", label: "Casa", icon: "🏠" },
  { value: "terreno", label: "Terreno", icon: "🌳" },
  { value: "comercial", label: "Sala ou loja", icon: "🏬" },
  { value: "outro", label: "Outro", icon: "🏡" },
];

/**
 * A relação com o imóvel:
 * - mora: é meu e eu moro nele;
 * - renda: é meu e está alugado para alguém (eu recebo o aluguel);
 * - vazio: é meu e está vazio, à venda ou esperando inquilino;
 * - obra: é meu e ainda está em construção (comprado na planta);
 * - aluguel: não é meu, eu moro de aluguel (eu pago o aluguel);
 * - vendido: já foi meu, fica para o histórico do patrimônio.
 */
export type Situation = "mora" | "renda" | "vazio" | "obra" | "aluguel" | "vendido";

export const SITUATIONS: { value: Situation; label: string; hint: string }[] = [
  { value: "mora", label: "Meu, moro nele", hint: "Entra no patrimônio." },
  { value: "renda", label: "Meu, alugado para alguém", hint: "Entra no patrimônio e gera renda." },
  { value: "vazio", label: "Meu, vazio", hint: "À venda, esperando inquilino ou de veraneio." },
  { value: "obra", label: "Meu, em obra ou na planta", hint: "Ainda não foi entregue." },
  { value: "aluguel", label: "Alugado por mim", hint: "Eu moro e pago o aluguel." },
  { value: "vendido", label: "Vendido", hint: "Fica no histórico." },
];

/** Valor do imóvel em uma data (avaliação, anúncio parecido, IPTU). */
export interface ValuePoint {
  /** yyyy-MM-dd */
  date: string;
  value: number;
}

export interface Financing {
  /** Banco ou construtora. */
  lender: string;
  /** Prestação de hoje, em reais. */
  installment: number;
  /** Quantas parcelas ao todo. */
  total: number;
  /** Quantas já estavam pagas em `paidAsOf`; daí em diante, conta uma por mês no dia do vencimento. */
  paid: number;
  /** yyyy-MM-dd */
  paidAsOf: string;
  /** Dia do mês em que a parcela vence. */
  dueDay: number;
  /** Quanto foi financiado (para estimar o saldo no SAC). */
  financed?: number;
  /** Juros ao ano, em %. */
  rate?: number;
  system?: "sac" | "price";
  /** Saldo devedor do extrato do banco, e quando ele foi visto. Quando existe, vale mais que a estimativa. */
  balance?: number;
  balanceAsOf?: string;
}

/** Contrato de aluguel: o que eu recebo (imóvel meu alugado) ou o que eu pago (moro de aluguel). */
export interface Lease {
  rent: number;
  dueDay: number;
  /** Inquilino ou proprietário. */
  who: string;
  /** yyyy-MM-dd; vazios quando não se sabe. */
  start: string;
  end: string;
  /** Índice do reajuste (IGP-M, IPCA). */
  index: string;
  /** Taxa da imobiliária, em % do aluguel (só quando eu recebo). */
  fee?: number;
}

/** O que eu pago por mês ou por ano para manter o imóvel. Quando o inquilino paga, fica 0. */
export interface Costs {
  condo: number;
  /** IPTU do ano todo. */
  iptu: number;
  /** Seguro do ano todo. */
  insurance: number;
  /** Outros custos por mês (manutenção, taxa de lixo). */
  other: number;
}

export interface Property {
  id: string;
  name: string;
  icon: string;
  kind: PropertyKind;
  situation: Situation;
  address: string;
  /** Área privativa em m². 0 = não informada. */
  area: number;
  /** Compra: data e preço pago. */
  purchaseDate: string;
  purchasePrice: number;
  /** Valor patrimonial ao longo do tempo; o último é o atual. */
  values: ValuePoint[];
  financing?: Financing;
  lease?: Lease;
  costs: Costs;
  /** Venda: data e valor. */
  soldDate?: string;
  soldPrice?: number;
  /** Planta desenhada no app (hoje só o apartamento tem). */
  plan?: "apartamento";
  notes: string;
  createdAt: string;
}

export type PropertyDraft = Omit<Property, "id" | "createdAt" | "plan">;

/** Lançamentos que um imóvel pode ter em Finanças. */
export type PropertyFlow = "prestacao" | "aluguel" | "condominio" | "iptu" | "seguro";
