import { valuesHidden } from "./privacy";

const whole = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const cents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** O que aparece no lugar de um valor quando o olhinho está fechado. */
export const HIDDEN_MONEY = "R$ ••••";

/** "R$ 4.299" ou "R$ 4.299,90": centavos só aparecem quando existem. Com o olhinho fechado, "R$ ••••". */
export function money(value: number): string {
  if (valuesHidden()) return HIDDEN_MONEY;
  return (Number.isInteger(value) ? whole : cents).format(value);
}

/** "1 bem" / "3 bens". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const compact = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Curto, para eixos de gráfico: "850", "12 mil", "1,2 mi". */
export function shortMoney(value: number): string {
  if (valuesHidden()) return "•••";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${compact.format(value / 1_000_000)} mi`;
  if (abs >= 1000) return `${compact.format(value / 1000)} mil`;
  return compact.format(value);
}
