/**
 * Forma do Fiat Mobi Like 2018 (linha 2017–2020, antes da reestilização), em metros.
 *
 * Eixos: x para a frente, y para cima, z para a direita do carro. Origem no chão, no meio do
 * entre-eixos. Medidas da ficha técnica: 3,57 m de comprimento, 1,63 m de largura, 1,49 m de
 * altura, 2,305 m de entre-eixos, pneus 175/65 R14.
 *
 * A lataria é um "loft": uma fatia transversal a cada posição x. O perfil de cima e de baixo de
 * cada fatia saiu da foto de lado do carro (medida pixel a pixel); a largura vem de uma função
 * que afina nos vidros (tumblehome), embaixo e nas pontas, com cantos arredondados. Este arquivo
 * não depende do three.js: o app usa ele para montar a malha, e o script `scripts/mobi/bake.ts`
 * usa a mesma malha para pintar as texturas (vidros, faróis, lanternas, frisos, plásticos).
 */

export type P2 = [number, number];

/* ---------------- medidas ---------------- */

export const WHEELBASE = 2.305;
export const AXLE_F = WHEELBASE / 2;
export const AXLE_R = -WHEELBASE / 2;
/** Pneu 175/65 R14. */
export const TIRE_R = 0.2915;
export const TIRE_W = 0.175;
export const RIM_R = 0.178;
/** Meia bitola (centro do pneu). */
export const TRACK = 0.705;
/** Raio da caixa de roda. */
export const ARCH_R = 0.35;
export const ROOF_H = 1.478;
export const HALF_W = 0.8165;

/*
 * Medidas tiradas da foto de lado (600 px). O entre-eixos dá a escala no meio do carro; os
 * balanços na foto aparecem encurtados pela perspectiva, então cada ponta tem sua escala
 * (balanço dianteiro 0,73 m, traseiro 0,53 m, somando os 3,57 m da ficha).
 */
const PX_AXLE_F = 125;
const PX_AXLE_R = 500;
const PX_FRONT = 27;
const PX_REAR = 571;
const FRONT_OH = 0.731;
const REAR_OH = 0.53;
const K = WHEELBASE / (PX_AXLE_R - PX_AXLE_F);
const PX_GROUND = 437.5;

export function mapX(p: number) {
  if (p <= PX_AXLE_F) return AXLE_F + ((PX_AXLE_F - p) * FRONT_OH) / (PX_AXLE_F - PX_FRONT);
  if (p <= PX_AXLE_R) return AXLE_F - (p - PX_AXLE_F) * K;
  return AXLE_R - ((p - PX_AXLE_R) * REAR_OH) / (PX_REAR - PX_AXLE_R);
}
export const mapH = (q: number) => (PX_GROUND - q) * 0.00615;
/** Converte uma lista de pontos da foto de lado em metros (x, altura). */
export const sv = (pts: P2[]): P2[] => pts.map(([p, q]) => [mapX(p), mapH(q)]);

export const X_FRONT = mapX(PX_FRONT);
export const X_REAR = mapX(PX_REAR);

/* ---------------- utilidades ---------------- */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolação linear numa tabela ordenada pelo primeiro valor. */
export function table(t: P2[], x: number) {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (x <= t[i][0]) {
      const [x0, y0] = t[i - 1], [x1, y1] = t[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return t[t.length - 1][1];
}

/** Suaviza um polígono aberto (Chaikin), mantendo as pontas. */
export function chaikin(p: P2[], n: number): P2[] {
  for (let k = 0; k < n; k++) {
    const q: P2[] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

/* ---------------- silhueta lateral ---------------- */

/** Contorno de cima, da ponta do para-choque dianteiro até a ponta do traseiro (pixels da foto). */
const TOP_PX: P2[] = [
  [27, 336], [28, 326], [30, 317], [33, 309], [37, 302], [42, 296], [48, 291], [56, 287], [66, 283], [80, 278],
  [100, 272], [120, 267], [140, 263], [155, 260], [163, 258], [170, 254.5], [190, 243], [210, 232], [230, 222],
  [250, 214], [268, 207], [282, 203], [298, 199.5], [320, 197.5], [350, 196.5], [400, 196], [450, 196.5],
  [490, 197.5], [508, 199], [516, 200.5], [521, 203], [526, 210], [532, 221], [539, 234], [546, 248], [551, 260],
  [555, 271], [557, 279], [558, 287], [561, 296], [565, 304], [568, 312], [570, 320], [571, 330],
];
/** Contorno de baixo (sem as caixas de roda, que são recortadas depois). */
const BOTTOM_PX: P2[] = [
  [27, 386], [29, 392], [33, 396], [40, 398], [60, 398.5], [125, 398.5], [300, 396], [470, 396], [520, 395.5],
  [540, 393], [552, 389], [561, 385], [566, 381], [569, 377], [571, 370],
];

function profile(px: P2[]): P2[] {
  const m = chaikin(sv(px), 3);
  return m.sort((a, b) => a[0] - b[0]);
}
const TOP = profile(TOP_PX);
const BOTTOM = profile(BOTTOM_PX);
export const topAt = (x: number) => table(TOP, x);
export const bottomAt = (x: number) => table(BOTTOM, x);

/** Linha de cintura (base dos vidros laterais), em metros. */
const BELT: P2[] = sv([
  [600, 250], [490, 240], [470, 250], [441, 259.5], [400, 263.5], [345, 268], [207, 282], [150, 288], [0, 292],
]).sort((a, b) => a[0] - b[0]);
export const beltAt = (x: number) => table(BELT, x);

/* ---------------- largura ---------------- */

/** Meia largura da lataria (abaixo dos vidros) em função da altura. */
function bodyHalf(h: number) {
  // embaixo a lateral entra (saia), em cima fecha um pouco até o ombro
  const low = HALF_W - 0.034 * (1 - smooth(0.24, 0.52, h));
  // vinco do ombro na altura das maçanetas: acima dele a lateral recolhe
  return low - 0.012 * smooth(0.835, 0.87, h) - 0.014 * smooth(0.87, 1.04, h);
}

/** Meia largura sem os arredondamentos das pontas e de cima/baixo. */
export function halfWidth(x: number, h: number) {
  const belt = beltAt(x);
  let w: number;
  if (h <= belt) w = bodyHalf(h);
  else {
    const wb = bodyHalf(belt);
    const t = clamp01((h - belt) / (ROOF_H - belt));
    // degrau do ombro até o vidro e depois o vidro inclinado até o teto
    w = wb - 0.022 * smooth(0, 0.06, t) - (wb - 0.022 - 0.588) * Math.pow(t, 0.9);
  }
  // vista de cima: a frente e a traseira afinam
  w *= 1 - 0.04 * smooth(0.9, X_FRONT, x) - 0.022 * smooth(-1.05, X_REAR, x);
  // para-lamas levemente estufados em volta das rodas (abaixo da cintura)
  for (const ax of [AXLE_F, AXLE_R]) {
    const d = Math.hypot(x - ax, h - TIRE_R);
    w += 0.008 * smooth(ARCH_R + 0.3, ARCH_R + 0.06, d) * (1 - smooth(0.75, 0.95, h));
  }
  return w;
}

/** Arredondamento das pontas visto de cima (0 na ponta, 1 depois do canto). */
function planRound(x: number, h: number) {
  const df = X_FRONT - x;
  const rf = 0.5 + 0.1 * smooth(0.6, 0.85, h);
  if (df < rf) {
    const t = 1 - df / rf;
    return Math.pow(Math.max(0, 1 - Math.pow(t, 1.85)), 1 / 1.85);
  }
  const dr = x - X_REAR;
  const rr = 0.22;
  if (dr < rr) {
    const t = 1 - dr / rr;
    return Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 1 / 2.4);
  }
  return 1;
}

/** Raio do canto de cima da fatia: teto, para-brisa, capô, tampa traseira. */
function topRadius(x: number) {
  // capô bem abaulado perto do para-brisa (o pé das colunas fica baixo) e quase reto na frente
  if (x > 0.95) return lerp(0.13, 0.05, smooth(0.95, 1.8, x));
  if (x > 0.15) return lerp(0.1, 0.13, smooth(0.15, 0.95, x));
  if (x > -1.3) return 0.1;
  return lerp(0.1, 0.075, smooth(-1.3, -1.55, x));
}
const BOTTOM_R = 0.05;

/* ---------------- malha ---------------- */

export interface BodyGrid {
  /** Fatias ao longo do carro. */
  nu: number;
  /** Pontos em volta de cada fatia (lado direito de baixo para cima, depois o esquerdo de cima para baixo). */
  nv: number;
  /** Posições, nu × nv × 3. */
  pos: Float32Array;
  /** Normais (para fora), nu × nv × 3. */
  nor: Float32Array;
}

/** Caixas de roda: centro (x, altura) e raio. */
export const ARCHES: { x: number; h: number; r: number }[] = [
  { x: AXLE_F, h: TIRE_R, r: ARCH_R },
  { x: AXLE_R, h: TIRE_R, r: ARCH_R - 0.005 },
];
/** Altura do teto da caixa de roda na posição x (ou -1 fora dela). */
export function archTop(x: number) {
  for (const a of ARCHES) {
    const dx = Math.abs(x - a.x);
    if (dx < a.r) return a.h + Math.sqrt(a.r * a.r - dx * dx);
  }
  return -1;
}
/** Moldura preta das caixas de roda (largura) e o quanto ela salta da lataria. */
export const FLARE_W = 0.046;
const FLARE_OUT = 0.011;

/** Posições x das fatias: mais densas nas pontas, onde a fatia muda rápido. */
function stations(nu: number) {
  // percorre o contorno visto de cima (meia largura na altura do para-choque) por comprimento de arco
  const N = 4000, xs: number[] = [], acc: number[] = [0];
  let prev: P2 | null = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // parâmetro com cosseno para pegar bem as pontas
    const x = X_FRONT - (X_FRONT - X_REAR) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    const w = 0.8 * planRound(x, 0.5);
    const p: P2 = [x, w];
    if (prev) acc.push(acc[acc.length - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    xs.push(x);
    prev = p;
  }
  const L = acc[acc.length - 1], out: number[] = [];
  let k = 0;
  for (let i = 0; i < nu; i++) {
    const s = (L * i) / (nu - 1);
    while (k < N - 1 && acc[k + 1] < s) k++;
    const f = (s - acc[k]) / Math.max(1e-9, acc[k + 1] - acc[k]);
    out.push(xs[k] + (xs[k + 1] - xs[k]) * clamp01(f));
  }
  out[0] = X_FRONT;
  out[nu - 1] = X_REAR;
  return out;
}

/** Uma fatia (lado direito, de baixo para cima) reamostrada com `m` pontos por comprimento de arco. */
function section(x: number, m: number): P2[] {
  const zb = bottomAt(x), zt = topAt(x);
  const H = Math.max(1e-4, zt - zb);
  let rt = topRadius(x), rb = BOTTOM_R;
  if (rt + rb > H * 0.9) {
    const s = (H * 0.9) / (rt + rb);
    rt *= s;
    rb *= s;
  }
  const pr = planRound(x, (zb + zt) / 2);
  const N = 900;
  const pts: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / N);
    const h = zb + H * t;
    let f = 1;
    if (h > zt - rt) {
      const u = (h - (zt - rt)) / rt;
      f *= Math.sqrt(Math.max(0, 1 - u * u));
    }
    if (h < zb + rb) {
      const u = (zb + rb - h) / rb;
      f *= Math.sqrt(Math.max(0, 1 - u * u));
    }
    const pf = planRound(x, h) * 0.5 + pr * 0.5;
    pts.push([halfWidth(x, h) * pf * f, h]);
  }
  pts[0][0] = 0;
  pts[N][0] = 0;
  // reamostra por comprimento
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = acc[acc.length - 1], out: P2[] = [];
  let k = 0;
  for (let j = 0; j < m; j++) {
    const s = (L * j) / (m - 1);
    while (k < pts.length - 2 && acc[k + 1] < s) k++;
    const f = clamp01((s - acc[k]) / Math.max(1e-12, acc[k + 1] - acc[k]));
    out.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f]);
  }
  return out;
}

function computeNormals(nu: number, nv: number, pos: Float32Array) {
  const nor = new Float32Array(nu * nv * 3);
  const at = (i: number, j: number) => (Math.min(nu - 1, Math.max(0, i)) * nv + Math.min(nv - 1, Math.max(0, j))) * 3;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      // somatório das normais dos quatro quadriláteros vizinhos (robusto a pontos repetidos)
      let nx = 0, ny = 0, nz = 0;
      const o = at(i, j);
      for (const [di, dj] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        const a = at(i + di, j), b = at(i, j + dj);
        const ax = pos[a] - pos[o], ay = pos[a + 1] - pos[o + 1], az = pos[a + 2] - pos[o + 2];
        const bx = pos[b] - pos[o], by = pos[b + 1] - pos[o + 1], bz = pos[b + 2] - pos[o + 2];
        const s = di * dj; // mantém a orientação
        nx += s * (ay * bz - az * by);
        ny += s * (az * bx - ax * bz);
        nz += s * (ax * by - ay * bx);
      }
      const L = Math.hypot(nx, ny, nz) || 1;
      nor[o] = nx / L;
      nor[o + 1] = ny / L;
      nor[o + 2] = nz / L;
    }
  }
  return nor;
}

let cached: BodyGrid | null = null;

/** A malha da lataria (é a mesma no app e no script que pinta as texturas). */
export function bodyGrid(): BodyGrid {
  if (cached) return cached;
  const nu = 320, m = 130, nv = m * 2;
  const xs = stations(nu);
  const pos = new Float32Array(nu * nv * 3);
  for (let i = 0; i < nu; i++) {
    const x = xs[i];
    const sec = section(x, m);
    const at = archTop(x);
    for (let j = 0; j < m; j++) {
      let [w, h] = sec[j];
      // recorta a caixa de roda: o que ficaria dentro dela sobe para o teto da caixa
      if (at > 0 && h < at) h = at;
      // capô: miolo levemente elevado, com dois vincos que saem das pontas da grade
      if (x > 0.9 && h > 0.8 && w < 0.62) {
        const c = lerp(0.46, 0.34, smooth(0.95, 1.75, x));
        const fade = smooth(0.92, 1.02, x) * (1 - smooth(1.72, 1.82, x));
        h += 0.009 * fade * (1 - smooth(c - 0.012, c + 0.012, w));
      }
      const r = (i * nv + j) * 3, l = (i * nv + (nv - 1 - j)) * 3;
      pos[r] = x; pos[r + 1] = h; pos[r + 2] = w;
      pos[l] = x; pos[l + 1] = h; pos[l + 2] = -w;
    }
  }
  // orientação: com u para trás e v subindo pela direita, o produto vetorial aponta para fora?
  let nor = computeNormals(nu, nv, pos);
  {
    const i = Math.floor(nu / 2), j = Math.floor(m / 2), o = (i * nv + j) * 3;
    if (nor[o + 2] < 0) for (let k = 0; k < nor.length; k++) nor[k] = -nor[k];
  }
  // moldura das caixas de roda: salta um pouco para fora
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const o = (i * nv + j) * 3;
      const x = pos[o], h = pos[o + 1];
      if (Math.abs(nor[o + 2]) < 0.35 || h > 0.95) continue;
      let bump = 0;
      for (const a of ARCHES) {
        const d = Math.hypot(x - a.x, h - a.h);
        if (h < a.h - 0.02) continue;
        bump = Math.max(bump, smooth(a.r - 0.004, a.r + 0.012, d) * (1 - smooth(a.r + FLARE_W - 0.012, a.r + FLARE_W + 0.004, d)));
      }
      if (bump > 0) {
        pos[o] += nor[o] * bump * FLARE_OUT;
        pos[o + 1] += nor[o + 1] * bump * FLARE_OUT;
        pos[o + 2] += nor[o + 2] * bump * FLARE_OUT;
      }
    }
  }
  const flip = (() => {
    const i = Math.floor(nu / 2), j = Math.floor(m / 2), o = (i * nv + j) * 3;
    return computeNormals(nu, nv, pos)[o + 2] < 0;
  })();
  nor = computeNormals(nu, nv, pos);
  if (flip) for (let k = 0; k < nor.length; k++) nor[k] = -nor[k];
  cached = { nu, nv, pos, nor };
  return cached;
}

/** Índices dos triângulos da grade, já com a orientação certa (normais para fora). */
export function gridIndex(g: BodyGrid): Uint32Array {
  const { nu, nv, pos, nor } = g;
  const idx: number[] = [];
  // descobre a orientação pelo triângulo do meio do lado direito
  const i0 = Math.floor(nu / 2), j0 = Math.floor(nv / 4);
  const a = i0 * nv + j0, b = (i0 + 1) * nv + j0, c = i0 * nv + j0 + 1;
  const e1 = [pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]];
  const e2 = [pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]];
  const cz = e1[0] * e2[1] - e1[1] * e2[0];
  const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2];
  const ok = cx * nor[a * 3] + cy * nor[a * 3 + 1] + cz * nor[a * 3 + 2] > 0;
  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const p = i * nv + j, q = (i + 1) * nv + j, r = i * nv + j + 1, s = (i + 1) * nv + j + 1;
      if (ok) idx.push(p, q, r, r, q, s);
      else idx.push(p, r, q, r, s, q);
    }
  }
  return new Uint32Array(idx);
}

/* ---------------- desenhos (para o script de texturas e para as peças) ---------------- */

/** Contorno externo dos vidros laterais com as colunas pretas (vista de lado). */
export const DLO = sv([
  [206, 283], [207, 266], [222, 250], [244, 229], [262, 213], [276, 207.5], [300, 204.5], [345, 203.5], [400, 203.5],
  [470, 205], [484, 207.5], [489, 213], [487, 226], [481, 239], [470, 250], [455, 256], [441, 259.5], [400, 263.5],
  [345, 268], [206, 283],
]);
/** Vidro da porta dianteira. */
export const GLASS_F = sv([
  [217, 279.5], [217, 263], [232, 247], [250, 228], [265, 214], [279, 210], [300, 208.5], [339, 208], [340, 267.5], [217, 279.5],
]);
/** Vidro da porta traseira. */
export const GLASS_R = sv([
  [360, 208.5], [436, 208.5], [440, 213], [440.5, 259.5], [360, 266.5], [360, 208.5],
]);
/** Cavalete do retrovisor (triângulo preto na frente do vidro). */
export const MIRROR_SAIL = sv([[206, 283], [207, 262], [217, 262], [217, 280.5]]);

/** Frisos das portas e das tampas (vista de lado). */
export const SIDE_SEAMS: P2[][] = [
  sv([[197.5, 279], [197.5, 300], [197, 340], [196.5, 370], [196, 386]]),
  sv([[352, 267.5], [351.5, 300], [350, 350], [348.5, 386]]),
  sv([[497, 211], [499, 230], [499, 256], [497, 280], [493, 298], [487, 316], [480, 330]]),
  sv([[196, 386], [300, 386.5], [430, 386.5]]),
  // para-choque traseiro com a lateral
  sv([[528, 292], [537, 304], [545, 318], [551, 334]]),
];
/** Tampa do tanque (lado direito). */
export const FUEL = { x: mapX(511), h: mapH(301), r: 0.058 };

/** Farol visto de lado e de frente (meia largura, altura). */
export const HEAD_SIDE = sv([
  [38, 304], [42, 298], [50, 294], [65, 292.5], [85, 292], [105, 292.5], [118, 293.5], [114, 298], [100, 302.5],
  [84, 309], [70, 317], [57, 325], [46, 328], [40, 322], [38, 314],
]);
export const HEAD_FRONT: P2[] = [
  [0.355, 0.812], [0.45, 0.822], [0.55, 0.836], [0.65, 0.852], [0.73, 0.87], [0.79, 0.888], [0.835, 0.875],
  [0.835, 0.83], [0.815, 0.78], [0.78, 0.742], [0.7, 0.714], [0.6, 0.706], [0.5, 0.714], [0.42, 0.728], [0.355, 0.745],
];
/** Borda de baixo do farol (para a faixa escura de dentro). */
export const HEAD_BOTTOM: P2[] = [[0.355, 0.745], [0.42, 0.728], [0.5, 0.714], [0.6, 0.706], [0.7, 0.714], [0.78, 0.742], [0.815, 0.78], [0.835, 0.83]];
/** Grade de cima (vista de frente, meia largura): trapézio preto entre os faróis. */
export const GRILLE: P2[] = [
  [0, 0.818], [0.2, 0.816], [0.36, 0.808], [0.37, 0.77], [0.36, 0.722], [0.31, 0.68], [0.22, 0.668], [0, 0.665],
];
/** Faróis de neblina (moldura preta) e grade de baixo em colmeia. */
export const FOG = { y: 0.505, z0: 0.56, z1: 0.765, hh: 0.048 };
export const LOWER_GRILLE: P2[] = [
  [0, 0.452], [0.4, 0.452], [0.47, 0.425], [0.455, 0.36], [0, 0.352],
];
/** Placa dianteira e traseira (centro, altura). */
export const PLATE_F = { h: 0.54 };
export const PLATE_R = { h: 0.54 };

/** Tampa traseira: painel preto brilhante único (vidro + tampa), vista de trás. */
export const TAILGATE: P2[] = [
  [0, 1.415], [0.47, 1.415], [0.535, 1.39], [0.565, 1.33], [0.578, 1.22], [0.57, 1.1], [0.545, 0.98], [0.52, 0.88],
  [0.49, 0.815], [0.43, 0.785], [0, 0.78],
];
/** Lanterna vista de lado e de trás. */
export const TAIL_SIDE = sv([
  [511, 278], [513, 266], [518, 254], [523, 245.5], [534, 243.5], [543, 247], [550, 256], [555, 267], [558, 280],
  [557, 290], [545, 292], [528, 292], [515, 288],
]);
export const TAIL_REAR: P2[] = [
  [0.575, 1.225], [0.66, 1.23], [0.73, 1.2], [0.78, 1.13], [0.805, 1.03], [0.81, 0.94], [0.78, 0.895], [0.7, 0.885],
  [0.6, 0.9], [0.555, 0.95], [0.548, 1.05], [0.56, 1.16],
];

/** Para-brisa: do pé (x maior) até o topo, e meia largura em cada ponta. */
export const WINDSHIELD = { x0: mapX(167), x1: mapX(293), w0: 0.675, w1: 0.575 };
