/**
 * Pinta as texturas da lataria do Mobi 3D: cor, plásticos, vidros, faróis, lanternas, frisos.
 *
 * Para cada pixel da textura acha o ponto da lataria (a mesma malha que o app monta, de
 * `shape.ts`) e decide o que tem ali olhando a posição e a direção da superfície contra os
 * desenhos tirados das fotos (vista de lado, de frente, de trás e de cima).
 *
 * Saídas, em src/modules/veiculos/mobi3d/tex/:
 *   albedo.png  cor das peças (onde é pintura fica preto; o app soma a cor do carro × R do orm)
 *   orm.png     R = pintura (e verniz), G = aspereza, B = metal
 *   fx.png      R = luz vermelha (lanternas), G = luz branca (faróis), B = vidro
 *
 * Rodar: node scripts/mobi/bake.ts  (Node 22.18 ou mais novo, que entende TypeScript)
 * Depois: python3 scripts/mobi/encode.py  (converte albedo para webp)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import {
  ARCHES, AXLE_F, AXLE_R, ARCH_R, DLO, FLARE_W, FOG, FUEL, GLASS_F, GLASS_R, GRILLE, HEAD_FRONT, HEAD_SIDE,
  LOWER_GRILLE, MIRROR_SAIL, HEAD_BOTTOM, table, SIDE_SEAMS, TAILGATE, TAIL_REAR, TAIL_SIDE, WINDSHIELD, beltAt, bodyGrid, type P2,
} from "../../src/modules/veiculos/mobi3d/shape.ts";

const SIZE = Number(process.env.SIZE ?? 2048);
const SS = Number(process.env.SS ?? 2);
const OUT = new URL("../../src/modules/veiculos/mobi3d/tex/", import.meta.url);

/* ---------- geometria 2D ---------- */

function inPoly(poly: P2[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function lineDist(pl: P2[], x: number, y: number) {
  let d = Infinity;
  for (let i = 0; i < pl.length - 1; i++) d = Math.min(d, segDist(x, y, pl[i][0], pl[i][1], pl[i + 1][0], pl[i + 1][1]));
  return d;
}
function polyEdgeDist(poly: P2[], x: number, y: number) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  return d;
}
function bbox(p: P2[]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
}
const inBox = (b: ReturnType<typeof bbox>, x: number, y: number, m = 0) => x >= b.x0 - m && x <= b.x1 + m && y >= b.y0 - m && y <= b.y1 + m;

const B_DLO = bbox(DLO), B_HS = bbox(HEAD_SIDE), B_TS = bbox(TAIL_SIDE);

/* ---------- materiais ---------- */

/** r, g, b (0–255, sRGB), pintura, aspereza, metal, luz vermelha, luz branca, vidro */
type M = [number, number, number, number, number, number, number, number, number];
// a cor da pintura entra no app; aqui fica preto para a borda das peças não clarear ao filtrar
const PAINT: M = [0, 0, 0, 1, 0.32, 0, 0, 0, 0];
const GLOSS: M = [9, 10, 12, 0, 0.12, 0, 0, 0, 0];
const TRIM: M = [24, 24, 26, 0, 0.78, 0, 0, 0, 0];
const UNDER: M = [16, 16, 17, 0, 0.9, 0, 0, 0, 0];
const GLASS: M = [14, 17, 20, 0, 0.04, 0, 0, 0, 1];
const FRIT: M = [8, 8, 9, 0, 0.35, 0, 0, 0, 0];
const SEAM: M = [40, 40, 42, 0, 0.7, 0, 0, 0, 0];
const COWL: M = [20, 20, 21, 0, 0.7, 0, 0, 0, 0];
const mat = (r: number, g: number, b: number, rough: number, metal = 0, er = 0, eg = 0, glass = 0): M => [r, g, b, 0, rough, metal, er, eg, glass];

/* ---------- o que tem em cada ponto ---------- */

const WS = WINDSHIELD;

function classify(x: number, h: number, z: number, nx: number, ny: number, nz: number): M {
  const az = Math.abs(z), anz = Math.abs(nz);
  const right = z > 0;

  // por baixo e teto das caixas de roda
  if (ny < -0.55) return UNDER;
  for (const a of ARCHES) {
    if (Math.abs(x - a.x) < a.r - 0.004 && h <= a.h + Math.sqrt(Math.max(0, (a.r - 0.004) ** 2 - (x - a.x) ** 2)) + 0.002) return UNDER;
  }

  /* ---- vidros e colunas pretas ---- */
  const belt = beltAt(x);
  if (h > belt - 0.012 && inBox(B_DLO, x, h, 0.01)) {
    if (anz > 0.55) {
      if (inPoly(GLASS_F, x, h) || inPoly(GLASS_R, x, h)) return GLASS;
      if (inPoly(DLO, x, h) || inPoly(MIRROR_SAIL, x, h)) return GLOSS;
    }
  }
  // para-brisa (com a faixa preta de serigrafia nas bordas) e a grade do capô embaixo dele
  if (x < WS.x0 + 0.002 && x > WS.x1 - 0.01 && ny > 0.2 && h > 0.85) {
    const t = (WS.x0 - x) / (WS.x0 - WS.x1);
    const edge = anz < 0.5;
    if (edge) {
      const dSide = (0.5 - anz) * 0.3, dTop = x - WS.x1, dBot = WS.x0 - x;
      if (Math.min(dSide, dTop, dBot) < 0.028 + 0.01 * t) return FRIT;
      return GLASS;
    }
  }
  if (x >= WS.x0 && x < WS.x0 + 0.065 && ny > 0.35 && anz < 0.5) return COWL;

  /* ---- faróis ---- */
  if (x > 1.15 && inBox(B_HS, x, h, 0.004) && inPoly(HEAD_SIDE, x, h) && inPoly(HEAD_FRONT, az, h) && nx > -0.3) {
    const e = Math.min(polyEdgeDist(HEAD_FRONT, az, h), polyEdgeDist(HEAD_SIDE, x, h));
    if (e < 0.004) return mat(12, 12, 14, 0.2);
    return headlamp(az, h);
  }
  /* ---- grade, logotipo fica por cima (peça) ---- */
  if (x > 1.55 && nx > 0.3 && inPoly(GRILLE, az, h)) return grille(az, h);
  // linha do capô sobre a grade e os faróis
  if (x > 1.45 && nx > 0.2 && Math.abs(h - hoodFront(az)) < 0.0022 && az < 0.79) return SEAM;
  // capô: frisos laterais e traseiro
  if (ny > 0.55 && x > WS.x0 + 0.06 && x < 1.75 && Math.abs(az - hoodSide(x)) < 0.0022) return SEAM;
  if (ny > 0.55 && Math.abs(x - (WS.x0 + 0.066)) < 0.0022 && az < hoodSide(x)) return SEAM;

  /* ---- para-choque dianteiro ---- */
  if (x > AXLE_F + ARCH_R - 0.02) {
    if (nx > 0.15 && inPoly(LOWER_GRILLE, az, h)) return honeycomb(az, h);
    if (h < 0.345) return TRIM;
    if (nx > 0.2 && az > FOG.z0 - 0.02) {
      const fog = fogHousing(az, h);
      if (fog) return fog;
    }
  }

  /* ---- traseira ---- */
  if (x < -1.25 && inBox(B_TS, x, h, 0.004) && inPoly(TAIL_SIDE, x, h) && inPoly(TAIL_REAR, az, h) && nx < 0.35) {
    const e = Math.min(polyEdgeDist(TAIL_REAR, az, h), polyEdgeDist(TAIL_SIDE, x, h));
    if (e < 0.009) return mat(12, 12, 13, 0.2);
    return taillamp(az, h);
  }
  if (x < -1.3 && nx < -0.15 && inPoly(TAILGATE, az, h)) {
    // terceira luz de freio no alto da tampa
    if (az < 0.115 && h > 1.385 && h < 1.405) return mat(150, 12, 18, 0.15, 0, 1);
    return GLOSS;
  }
  if (x < -1.3 && nx < -0.15 && Math.abs(polyEdgeDist(TAILGATE, az, h)) < 0.004 && h > 0.75) return SEAM;
  if (x < AXLE_R - ARCH_R + 0.02) {
    if (h < 0.37) return TRIM;
    // refletores no para-choque
    if (nx < -0.3 && az > 0.5 && az < 0.72 && Math.abs(h - 0.43) < 0.011) return mat(110, 8, 12, 0.2, 0, 0.25);
    // vinco do para-choque
    if (nx < -0.25 && Math.abs(h - 0.75) < 0.002) return SEAM;
  }

  /* ---- laterais: molduras das caixas de roda e soleira ---- */
  for (const a of ARCHES) {
    const d = Math.hypot(x - a.x, h - a.h);
    if (h > a.h - 0.06 && d < a.r + FLARE_W && d > a.r - 0.02) return TRIM;
  }
  if (x < AXLE_F - ARCH_R && x > AXLE_R + ARCH_R && h < 0.335 && anz > 0.15) return TRIM;

  /* ---- frisos ---- */
  if (anz > 0.35) {
    for (const s of SIDE_SEAMS) if (lineDist(s, x, h) < 0.0018) return SEAM;
    if (right && Math.abs(Math.hypot(x - FUEL.x, h - FUEL.h) - FUEL.r) < 0.0018) return SEAM;
  }
  return PAINT;
}

/** Altura da borda da frente do capô (vista de frente). */
const hoodFront = (az: number) => (az < 0.355 ? 0.826 + 0.012 * (az / 0.355) ** 2 : table(HOOD_EDGE, az));
const HOOD_EDGE: P2[] = [[0.355, 0.838], [0.45, 0.85], [0.55, 0.862], [0.65, 0.877], [0.73, 0.895], [0.79, 0.91]];
/** Meia largura do friso lateral do capô (vista de cima). */
const hoodSide = (x: number) => 0.672 + 0.05 * Math.max(0, Math.min(1, (x - 1.2) / 0.55));

function headlamp(az: number, h: number): M {
  // faixa escura embaixo, refletores cromados e dois "olhos" (o maior por fora)
  const bottom = table(HEAD_BOTTOM, Math.min(az, 0.83));
  if (h - bottom < 0.016 && az < 0.8) return mat(40, 41, 44, 0.15, 0.2);
  const c1 = Math.hypot((az - 0.66) / 1.2, h - 0.792);
  const c2 = Math.hypot(az - 0.49, h - 0.768);
  if (c1 < 0.016) return mat(245, 245, 240, 0.06, 0.1, 0, 1);
  if (c1 < 0.021) return mat(50, 50, 54, 0.2, 0.8);
  if (c1 < 0.05) {
    const k = 175 + 55 * Math.cos(c1 * 150);
    return mat(k, k, k + 3, 0.12, 0.35, 0, 0.75);
  }
  if (c1 < 0.054) return mat(70, 71, 75, 0.15, 0.9);
  if (c2 < 0.012) return mat(235, 235, 230, 0.06, 0.1, 0, 0.9);
  if (c2 < 0.03) {
    const k = 165 + 50 * Math.cos(c2 * 210);
    return mat(k, k, k + 3, 0.12, 0.35, 0, 0.6);
  }
  // seta âmbar discreta na ponta de dentro
  if (az < 0.4) return mat(176, 128, 52, 0.12, 0.3);
  // fundo cromado com degradê
  const k = 150 + 40 * Math.sin(az * 40) * 0.5 + 30 * ((h - bottom) / 0.15);
  return mat(k, k + 1, k + 4, 0.14, 0.3, 0, 0.35);
}

function grille(az: number, h: number): M {
  // moldura preta brilhante e duas lâminas horizontais em chevron (como a do Mobi 2017–2020)
  const e = polyEdgeDist(GRILLE, az, h);
  if (e < 0.008) return mat(22, 22, 24, 0.16);
  const wave = 0.008 * Math.abs(((az * 7 + 0.5) % 1) * 2 - 1);
  for (const s of [0.778, 0.722]) {
    const d = h - (s + wave);
    if (Math.abs(d) < 0.013) return d > 0.007 ? mat(70, 70, 74, 0.14) : mat(40, 40, 43, 0.18);
  }
  return mat(5, 5, 6, 0.6);
}

function honeycomb(az: number, h: number): M {
  const e = polyEdgeDist(LOWER_GRILLE, az, h);
  if (e < 0.007) return mat(22, 22, 24, 0.6);
  // colmeia
  const s = 0.024, r3 = Math.sqrt(3);
  const qx = az / s, qy = h / (s * r3 * 0.5);
  const row = Math.floor(qy);
  const ox = row % 2 ? 0.5 : 0;
  const fx = qx + ox - Math.floor(qx + ox) - 0.5, fy = qy - row - 0.5;
  const d = Math.max(Math.abs(fx) * 1.15, Math.abs(fy));
  return d > 0.38 ? mat(30, 30, 32, 0.55) : mat(4, 4, 5, 0.85);
}

function fogHousing(az: number, h: number): M | null {
  const { y, z0, z1, hh } = FOG;
  // trapézio arredondado, mais alto por fora
  const t = (az - z0) / (z1 - z0);
  if (t < 0 || t > 1) return null;
  const half = hh * (0.85 + 0.3 * t);
  const dy = Math.abs(h - y);
  if (dy > half) return null;
  const r = 0.025;
  const ex = Math.min(az - z0, z1 - az), ey = half - dy;
  if (ex < r && ey < r && Math.hypot(r - ex, r - ey) > r) return null;
  const c = Math.hypot(az - (z0 + (z1 - z0) * 0.6), h - y);
  if (c < 0.034) return mat(10, 10, 11, 0.25);
  if (c < 0.04) return mat(40, 40, 42, 0.3);
  return mat(20, 20, 22, 0.55);
}

function taillamp(az: number, h: number): M {
  // vermelho em cima e embaixo, faixa clara (ré) no meio, por dentro
  if (h > 1.0 && h < 1.03 && az < 0.72) return mat(215, 212, 208, 0.1, 0.4);
  const inner = Math.hypot(az - 0.67, h - 1.12);
  if (inner < 0.05 && h > 1.045) return mat(170, 18, 26, 0.12, 0, 1);
  if (h > 1.045) return mat(130, 12, 20, 0.12, 0, 0.85);
  return mat(92, 8, 14, 0.15, 0, 0.7);
}

/* ---------- varredura ---------- */

const g = bodyGrid();
const { nu, nv, pos, nor } = g;
const N = SIZE * SIZE;
const albedo = new Uint8Array(N * 3), orm = new Uint8Array(N * 3), fx = new Uint8Array(N * 3);
const acc = new Float64Array(9);
const t0 = Date.now();

for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    acc.fill(0);
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const u = (col + (sx + 0.5) / SS) / SIZE;
        const v = 1 - (row + (sy + 0.5) / SS) / SIZE;
        const fi = u * (nu - 1), fj = v * (nv - 1);
        const i = Math.min(nu - 2, Math.floor(fi)), j = Math.min(nv - 2, Math.floor(fj));
        const a = fi - i, b = fj - j;
        const o00 = (i * nv + j) * 3, o10 = ((i + 1) * nv + j) * 3, o01 = (i * nv + j + 1) * 3, o11 = ((i + 1) * nv + j + 1) * 3;
        const w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
        const P = (k: number, arr: Float32Array) => arr[o00 + k] * w00 + arr[o10 + k] * w10 + arr[o01 + k] * w01 + arr[o11 + k] * w11;
        let nx = P(0, nor), ny = P(1, nor), nz = P(2, nor);
        const L = Math.hypot(nx, ny, nz) || 1;
        nx /= L; ny /= L; nz /= L;
        const m = classify(P(0, pos), P(1, pos), P(2, pos), nx, ny, nz);
        for (let k = 0; k < 9; k++) acc[k] += m[k];
      }
    }
    const s = 1 / (SS * SS), o = (row * SIZE + col) * 3;
    albedo[o] = acc[0] * s; albedo[o + 1] = acc[1] * s; albedo[o + 2] = acc[2] * s;
    orm[o] = acc[3] * s * 255; orm[o + 1] = acc[4] * s * 255; orm[o + 2] = acc[5] * s * 255;
    fx[o] = acc[6] * s * 255; fx[o + 1] = acc[7] * s * 255; fx[o + 2] = acc[8] * s * 255;
  }
}

/* ---------- PNG ---------- */

function png(rgb: Uint8Array, w: number, h: number) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("albedo.png", OUT), png(albedo, SIZE, SIZE));
writeFileSync(new URL("orm.png", OUT), png(orm, SIZE, SIZE));
writeFileSync(new URL("fx.png", OUT), png(fx, SIZE, SIZE));
console.log(`texturas ${SIZE}px em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
