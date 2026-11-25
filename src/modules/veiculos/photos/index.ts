import mobi from "./mobi.webp";

/** É um Fiat Mobi? Para ele o app mostra a foto do carro em vez do desenho. */
export const isMobi = (v: { brand?: string; model?: string; name?: string }) =>
  /\bmobi\b/i.test(`${v.model ?? ""} ${v.name ?? ""}`) && (!v.brand?.trim() || /fiat/i.test(v.brand));

/** Foto do modelo (fundo transparente, de frente em 3/4), quando o app tem uma. */
export function photoFor(v: { brand?: string; model?: string; name?: string }): string | undefined {
  return isMobi(v) ? mobi : undefined;
}
