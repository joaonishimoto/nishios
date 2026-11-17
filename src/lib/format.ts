const whole = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const cents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 4.299" ou "R$ 4.299,90": centavos só aparecem quando existem. */
export function money(value: number): string {
  return (Number.isInteger(value) ? whole : cents).format(value);
}

/** "1 bem" / "3 bens". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
