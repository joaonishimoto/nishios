/** Cores de pintura comuns, pelo nome que a pessoa escreve no campo Cor. */
const PAINTS: [RegExp, string][] = [
  [/prata/, "#b9bdc2"],
  [/grafite|cinza|chumbo/, "#6f747a"],
  [/preto|preta/, "#151618"],
  [/vermelh|vinho/, "#9e1520"],
  [/azul/, "#1f5f9a"],
  [/verde/, "#2f5d3a"],
  [/bege|areia/, "#d6c8a8"],
  [/amarel/, "#e0b31b"],
  [/marrom/, "#5a3e2b"],
  [/laranja/, "#d2601a"],
];
export const WHITE = "#f1f1ee";

export function paintFor(color?: string): string {
  const c = (color ?? "").toLowerCase();
  return PAINTS.find(([re]) => re.test(c))?.[1] ?? WHITE;
}

/** Nomes sugeridos no campo Cor. */
export const COLOR_NAMES = ["Branco", "Prata", "Cinza", "Preto", "Vermelho", "Azul", "Verde", "Bege", "Amarelo", "Marrom", "Laranja"];
