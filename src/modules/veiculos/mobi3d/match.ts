/** É um Mobi? Só ele tem modelo 3D, que fica em ./viewer (carregado só quando abre). */
export const isMobi = (v: { brand?: string; model?: string; name?: string }) =>
  /\bmobi\b/i.test(`${v.model ?? ""} ${v.name ?? ""}`) && (!v.brand?.trim() || /fiat/i.test(v.brand));
