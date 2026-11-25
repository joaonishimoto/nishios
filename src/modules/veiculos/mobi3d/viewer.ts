import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { WHITE } from "../paint";

export { paintFor, WHITE } from "../paint";

/**
 * Fiat Mobi (linha 2017 em diante) em 3D, feito à mão a partir de fotos de frente, de trás, de lado
 * e de cima, e das medidas da ficha técnica: 3,6 m de comprimento, 1,67 m de largura, 1,55 m de
 * altura, 2,3 m de entre-eixos e pneus 175/65 R14. Unidade: metro. Frente em +x, lado direito em +z.
 *
 * A carroceria é o perfil lateral (tirado da foto de lado) extrudado e entortado: estreita na frente
 * e na traseira e afina para cima nos vidros. Vidros, faróis, grades, lanternas, frisos e emblemas são
 * "adesivos" de verdade: polígonos desenhados num plano e projetados sobre a lataria, para seguirem
 * as curvas dela.
 */

export type MobiView = "tq" | "fr" | "sd" | "bk" | "tp";

export interface MobiOptions {
  /** Cor da pintura, em hex. */
  paint?: string;
  /** Texto da placa Mercosul. Vazio mostra a placa sem letras. */
  plate?: string;
}

export interface MobiViewer {
  setView: (v: MobiView) => void;
  /** Põe a câmera numa direção exata (usado para comparar com fotos). */
  look: (dir: [number, number, number], fov?: number) => void;
  setSpin: (on: boolean) => void;
  setLights: (on: boolean) => void;
  setPaint: (hex: string) => void;
  dispose: () => void;
}

// medidas
const FX = 1.13; // eixo dianteiro
const RX = -1.24; // eixo traseiro, bem perto da traseira como na foto
const WR = 0.3; // raio do pneu 175/65 R14 (um pouco cheio, como na foto)
const AR = 0.37; // raio da caixa de roda
const TR = 0.715; // meia bitola

type P2 = [number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function chaikin(p: P2[], n: number, closed = true): P2[] {
  for (let k = 0; k < n; k++) {
    const q: P2[] = [];
    const last = closed ? p.length : p.length - 1;
    if (!closed) q.push(p[0]);
    for (let i = 0; i < last; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
function dens(p: P2[], st: number): THREE.Vector2[] {
  const o: THREE.Vector2[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / st));
    for (let j = 0; j < k; j++) o.push(new THREE.Vector2(a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k));
  }
  return o;
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P2[] {
  const o: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return o;
}
/** Retângulo de cantos arredondados (cantos de baixo e de cima podem ter raios diferentes). */
function rrect(x0: number, y0: number, x1: number, y1: number, rb: number, rt = rb): P2[] {
  return [
    ...arc(x1 - rb, y0 + rb, rb, -Math.PI / 2, 0, 6),
    ...arc(x1 - rt, y1 - rt, rt, 0, Math.PI / 2, 6),
    ...arc(x0 + rt, y1 - rt, rt, Math.PI / 2, Math.PI, 6),
    ...arc(x0 + rb, y0 + rb, rb, Math.PI, (3 * Math.PI) / 2, 6),
  ];
}
const circle = (cx: number, cy: number, r: number, n = 28): P2[] => arc(cx, cy, r, 0, Math.PI * 2 * (1 - 1 / n), n - 1);
const mirrorX = (p: P2[]): P2[] => p.map(([a, b]) => [-a, b] as P2).reverse();

/** Normais suaves, mas mantendo quinas vivas acima de `deg` graus. */
function crease(g: THREE.BufferGeometry, deg: number) {
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const n = p.count, c = Math.cos((deg * Math.PI) / 180);
  const FN: (THREE.Vector3 | null)[] = [], FW: THREE.Vector3[] = [], map = new Map<string, number[]>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  const key = (i: number) => `${Math.round(p.getX(i) * 2e4)},${Math.round(p.getY(i) * 2e4)},${Math.round(p.getZ(i) * 2e4)}`;
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    const f = b.clone().sub(a).cross(d.clone().sub(a));
    const L = f.length();
    FW.push(f);
    FN.push(L > 1e-12 ? f.clone().divideScalar(L) : null);
    for (let k = 0; k < 3; k++) {
      const kk = key(i + k);
      let l = map.get(kk);
      if (!l) map.set(kk, (l = []));
      l.push(i / 3);
    }
  }
  const nr = new Float32Array(n * 3), s = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const me = FN[Math.floor(i / 3)];
    s.set(0, 0, 0);
    if (me) {
      for (const j of map.get(key(i)) ?? []) { const f = FN[j]; if (f && f.dot(me) > c) s.add(FW[j]); }
      s.normalize();
    } else s.set(0, 1, 0);
    nr[i * 3] = s.x; nr[i * 3 + 1] = s.y; nr[i * 3 + 2] = s.z;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(nr, 3));
}

/* ---------------- carroceria ---------------- */

/**
 * Silhueta lateral inteira (lataria + vidros), em metros, tirada da foto de lado.
 * Vai de trás por baixo até a frente, sobe pelo para-choque, capô, para-brisa, teto e desce pela tampa.
 */
const SILHOUETTE: P2[] = [
  [-1.7, 0.335],
  ...arc(RX, WR, AR, Math.PI + 0.05, -0.05, 26),
  ...arc(FX, WR, AR, Math.PI + 0.05, -0.05, 26),
  [1.56, 0.33], [1.7, 0.36], [1.775, 0.45], [1.795, 0.6], [1.79, 0.76], [1.765, 0.87], [1.7, 0.95], [1.56, 1.0], [1.15, 1.1], [0.8, 1.2],
  [0.42, 1.385], [0.08, 1.54], [-0.12, 1.57], [-0.7, 1.578], [-1.2, 1.565], [-1.4, 1.535], [-1.475, 1.49], [-1.5, 1.435], [-1.53, 1.3],
  [-1.585, 1.08], [-1.63, 0.95], [-1.715, 0.84], [-1.765, 0.66], [-1.765, 0.46], [-1.74, 0.37],
];

/** Meia largura relativa: afina nos vidros (tumblehome), embaixo e nas pontas. */
const taper = (x: number, y: number) =>
  (1 - 0.2 * sm(1.08, 1.58, y)) * (1 - 0.035 * sm(0.45, 0.32, y)) * (1 - 0.03 * sm(1.3, 1.8, x)) * (1 - 0.04 * sm(-1.3, -1.78, x));

function bodyGeometry() {
  const depth = 1.56, bt = 0.05;
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(dens(chaikin(SILHOUETTE, 2), 0.045)), {
    depth, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.05, bevelSegments: 8, steps: 18, curveSegments: 4,
  });
  const p = g.getAttribute("position") as THREE.BufferAttribute, hw = depth / 2 + bt;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i), z = p.getZ(i) - depth / 2;
    const u = z / hw;
    z *= taper(x, y);
    // cantos arredondados vistos de cima: a frente e a traseira recuam nas laterais
    const nx = x - 0.06 * u * u * u * u * sm(1.2, 1.8, x) + 0.04 * u * u * u * u * sm(-1.4, -1.78, x);
    // para-lamas estufados em volta das rodas
    for (const ax of [FX, RX]) {
      const dd = Math.hypot(x - ax, y - WR);
      z *= 1 + 0.03 * sm(AR + 0.26, AR + 0.03, dd) * sm(1.0, 0.8, y);
    }
    // capô e teto abaulados
    y += 0.028 * (1 - u * u) * sm(0.95, 1.05, y) * (1 - 0.6 * sm(1.3, 1.6, y));
    p.setXYZ(i, nx, y, z);
  }
  g.clearGroups();
  crease(g, 40);
  return g;
}

/* ---------------- projeção dos adesivos ---------------- */

interface Hit { point: THREE.Vector3; normal: THREE.Vector3 }

/** Lança raios contra a carroceria, com uma grade por direção para não testar todos os triângulos. */
class Projector {
  private pos: Float32Array;
  private nor: Float32Array;
  private grids = new Map<string, { u: THREE.Vector3; v: THREE.Vector3; cell: number; cells: Map<number, number[]> }>();
  constructor(g: THREE.BufferGeometry) {
    this.pos = (g.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    this.nor = (g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array;
  }
  private grid(d: THREE.Vector3) {
    const k = `${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)}`;
    let gr = this.grids.get(k);
    if (gr) return gr;
    const a = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(d, a).normalize();
    const v = new THREE.Vector3().crossVectors(u, d).normalize();
    const cell = 0.05, cells = new Map<number, number[]>(), P = this.pos;
    for (let t = 0; t < P.length / 9; t++) {
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (let j = 0; j < 3; j++) {
        const o = t * 9 + j * 3;
        const pu = P[o] * u.x + P[o + 1] * u.y + P[o + 2] * u.z, pv = P[o] * v.x + P[o + 1] * v.y + P[o + 2] * v.z;
        u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv);
      }
      for (let i = Math.floor(u0 / cell); i <= Math.floor(u1 / cell); i++)
        for (let j = Math.floor(v0 / cell); j <= Math.floor(v1 / cell); j++) {
          const key = (i + 512) * 1024 + (j + 512);
          let l = cells.get(key);
          if (!l) cells.set(key, (l = []));
          l.push(t);
        }
    }
    gr = { u, v, cell, cells };
    this.grids.set(k, gr);
    return gr;
  }
  cast(o: THREE.Vector3, d: THREE.Vector3): Hit | null {
    const g = this.grid(d), P = this.pos, N = this.nor;
    const key = (Math.floor(o.dot(g.u) / g.cell) + 512) * 1024 + (Math.floor(o.dot(g.v) / g.cell) + 512);
    let best = Infinity, bt = -1, bu = 0, bv = 0;
    for (const t of g.cells.get(key) ?? []) {
      const i = t * 9;
      const e1x = P[i + 3] - P[i], e1y = P[i + 4] - P[i + 1], e1z = P[i + 5] - P[i + 2];
      const e2x = P[i + 6] - P[i], e2y = P[i + 7] - P[i + 1], e2z = P[i + 8] - P[i + 2];
      const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const sx = o.x - P[i], sy = o.y - P[i + 1], sz = o.z - P[i + 2];
      const uu = (sx * px + sy * py + sz * pz) * inv;
      if (uu < 0 || uu > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const vv = (d.x * qx + d.y * qy + d.z * qz) * inv;
      if (vv < 0 || uu + vv > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 0 && tt < best) { best = tt; bt = t; bu = uu; bv = vv; }
    }
    if (bt < 0) return null;
    const i = bt * 9, w = 1 - bu - bv;
    const normal = V(
      N[i] * w + N[i + 3] * bu + N[i + 6] * bv,
      N[i + 1] * w + N[i + 4] * bu + N[i + 7] * bv,
      N[i + 2] * w + N[i + 5] * bu + N[i + 8] * bv,
    ).normalize();
    return { point: o.clone().addScaledVector(d, best), normal };
  }
}

/** Plano de onde os adesivos são lançados: origem fora do carro, eixos do desenho e direção do raio. */
interface Frame { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; d: THREE.Vector3 }
const RIGHT: Frame = { o: V(0, 0, 3), u: V(1, 0, 0), v: V(0, 1, 0), d: V(0, 0, -1) };
const LEFT: Frame = { o: V(0, 0, -3), u: V(1, 0, 0), v: V(0, 1, 0), d: V(0, 0, 1) };
const FRONT: Frame = { o: V(4, 0, 0), u: V(0, 0, 1), v: V(0, 1, 0), d: V(-1, 0, 0) };
const REAR: Frame = { o: V(-4, 0, 0), u: V(0, 0, 1), v: V(0, 1, 0), d: V(1, 0, 0) };
const TOP: Frame = { o: V(0, 4, 0), u: V(1, 0, 0), v: V(0, 0, 1), d: V(0, -1, 0) };
/** Para-brisa: olhando de frente para o vidro inclinado. */
const WS_N = V(0.43, 0.9, 0).normalize();
const WINDSHIELD: Frame = { o: V(0.44, 1.375, 0).addScaledVector(WS_N, 2), u: V(0, 0, 1), v: V(-0.9, 0.43, 0).normalize(), d: WS_N.clone().negate() };

const tess = new TessellateModifier(0.03, 8);

/* ---------------- texturas ---------------- */

function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function plateTex(text: string) {
  return canvasTex(800, 260, (x, w, h) => {
    x.fillStyle = "#fff"; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 18); x.fill();
    x.lineWidth = 6; x.strokeStyle = "#222"; x.stroke();
    x.fillStyle = "#1d3f9b"; x.beginPath(); x.roundRect(7, 7, w - 14, 52, [14, 14, 0, 0]); x.fill();
    x.fillStyle = "#fff"; x.font = "700 34px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("BRASIL", w / 2, 34);
    x.fillStyle = "#009c3b"; x.fillRect(w - 90, 18, 56, 32);
    x.fillStyle = "#ffdf00"; x.beginPath(); x.moveTo(w - 62, 21); x.lineTo(w - 38, 34); x.lineTo(w - 62, 47); x.lineTo(w - 86, 34); x.fill();
    x.fillStyle = "#1d3f9b"; x.beginPath(); x.arc(w - 62, 34, 7, 0, 7); x.fill();
    x.fillStyle = "#111"; x.font = "700 150px 'Arial Narrow', Arial, sans-serif"; x.fillText(text.toUpperCase().slice(0, 8), w / 2, 162, w - 60);
  });
}
/** Emblema da Fiat: escudo vermelho com as letras FIAT, num aro cromado. */
const fiatBadge = () =>
  canvasTex(256, 256, (x, w) => {
    const c = w / 2;
    const g = x.createLinearGradient(0, 0, 0, w);
    g.addColorStop(0, "#f4f5f6"); g.addColorStop(0.5, "#9da3aa"); g.addColorStop(1, "#e9ebee");
    x.fillStyle = g; x.beginPath(); x.arc(c, c, 120, 0, 7); x.fill();
    const r = x.createLinearGradient(0, 40, 0, 216);
    r.addColorStop(0, "#d4202c"); r.addColorStop(1, "#7c0c14");
    x.fillStyle = r; x.beginPath(); x.arc(c, c, 100, 0, 7); x.fill();
    x.fillStyle = "#f2f3f4"; x.font = "700 74px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("FIAT", c, c + 4);
  });
/** Letreiros cromados da tampa traseira. */
const wordTex = (word: string, opts: { italic?: boolean; size?: number; color?: string } = {}) =>
  canvasTex(512, 160, (x, w, h) => {
    x.fillStyle = opts.color ?? "#d7dade";
    x.font = `${opts.italic ? "italic " : ""}700 ${opts.size ?? 96}px Arial, sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(word, w / 2, h / 2 + 4);
  });

/* ---------------- cena ---------------- */

export function createMobiViewer(canvas: HTMLCanvasElement, opts: MobiOptions = {}, onUserMove?: () => void): MobiViewer {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  const envRT = pm.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(3, 6, 2);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.0));

  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const TGT = V(0, 0.72, 0);
  const ctl = new OrbitControls(cam, canvas);
  ctl.target.copy(TGT);
  ctl.enableDamping = true;
  ctl.enablePan = false;
  ctl.minDistance = 3;
  ctl.maxDistance = 18;
  ctl.maxPolarAngle = Math.PI * 0.495;
  ctl.autoRotate = true;
  ctl.autoRotateSpeed = 0.7;

  const car = new THREE.Group();
  scene.add(car);
  const textures: THREE.Texture[] = [];

  /* materiais */
  const paintM = new THREE.MeshPhysicalMaterial({ color: opts.paint ?? WHITE, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 });
  const deco = (p: THREE.MeshPhysicalMaterialParameters) =>
    // envMap explícito: sem ele o three ignora o envMapIntensity e o preto brilhante vira cinza
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMap: envRT.texture, ...p });
  const glassM = deco({ color: 0x020304, roughness: 0.05, metalness: 0, envMapIntensity: 0.06 });
  const pianoM = deco({ color: 0x050606, roughness: 0.1, metalness: 0, envMapIntensity: 0.08 });
  const trimM = deco({ color: 0x111213, roughness: 0.7, metalness: 0, envMapIntensity: 0.4 });
  const seamM = deco({ color: 0x202224, roughness: 0.8, envMapIntensity: 0.2 });
  const chromeM = deco({ color: 0xd9dde2, roughness: 0.12, metalness: 1 });
  const lensM = deco({ color: 0xc8d0d8, roughness: 0.05, metalness: 0.9, emissive: 0xfff3dc, emissiveIntensity: 0 });
  const drlM = deco({ color: 0x9aa2aa, roughness: 0.2, metalness: 0.6, emissive: 0xeaf2ff, emissiveIntensity: 0 });
  const tailM = deco({ color: 0x7a0610, roughness: 0.08, metalness: 0.1, clearcoat: 1, emissive: 0xff1a12, emissiveIntensity: 0 });
  const tailDarkM = deco({ color: 0x220205, roughness: 0.08, clearcoat: 1 });
  const clearM = deco({ color: 0xd8dadc, roughness: 0.1, metalness: 0.6 });
  const amberM = deco({ color: 0xc66a0a, roughness: 0.15, clearcoat: 1 });
  const shadowM = deco({ color: 0x000000, transparent: true, opacity: 0.08, roughness: 1 });
  const solid = (c: number, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const blackM = solid(0x0f1011, 0.55);

  /* carroceria */
  const bodyG = bodyGeometry();
  const body = new THREE.Mesh(bodyG, paintM);
  car.add(body);
  const proj = new Projector(bodyG);

  /** Projeta um polígono (coordenadas do plano `f`) sobre a lataria, `off` metros acima dela. */
  function decal(outline: P2[], f: Frame, mat: THREE.Material, off = 0.003, depth = 0.3) {
    const shape = new THREE.Shape(dens(outline, 0.02));
    let g: THREE.BufferGeometry = new THREE.ShapeGeometry(shape);
    g = tess.modify(g);
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    const o = new THREE.Vector3();
    const hits: (Hit | null)[] = [];
    let near = Infinity;
    for (let i = 0; i < p.count; i++) {
      o.copy(f.o).addScaledVector(f.u, p.getX(i)).addScaledVector(f.v, p.getY(i));
      const h = proj.cast(o, f.d);
      hits.push(h);
      if (h) near = Math.min(near, h.point.distanceTo(o));
    }
    // Um raio que escapou da peça e foi bater longe (do outro lado de uma quina) esticaria o adesivo.
    let missed = 0;
    const nr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      o.copy(f.o).addScaledVector(f.u, p.getX(i)).addScaledVector(f.v, p.getY(i));
      const h = hits[i];
      if (!h || h.point.distanceTo(o) > near + depth) {
        missed++;
        continue;
      }
      const q = h.point.addScaledVector(h.normal, off);
      p.setXYZ(i, q.x, q.y, q.z);
      // normal puxada para a do plano: vidros e pretos brilhantes refletem por igual, sem manchas
      const n = h.normal.multiplyScalar(0.35).addScaledVector(f.d, -0.65).normalize();
      nr[i * 3] = n.x; nr[i * 3 + 1] = n.y; nr[i * 3 + 2] = n.z;
    }
    if (missed > 0) {
      // um adesivo que escapou da lataria ficaria solto no ar: melhor não desenhar
      if (import.meta.env.DEV) console.warn(`Mobi: adesivo fora da lataria (${missed}/${p.count})`, outline[0]);
      g.dispose();
      return null;
    }
    g.setAttribute("normal", new THREE.BufferAttribute(nr, 3));
    g.deleteAttribute("uv");
    const m = new THREE.Mesh(g, mat);
    car.add(m);
    return m;
  }
  /** O mesmo adesivo dos dois lados do carro (desenho em x,y). */
  const sides = (outline: P2[], mat: THREE.Material, off?: number) => {
    decal(outline, RIGHT, mat, off);
    decal(outline, LEFT, mat, off);
  };
  /** Na frente ou atrás, espelhado no meio (desenho em z,y do lado direito). */
  const pair = (outline: P2[], f: Frame, mat: THREE.Material, off?: number, depth?: number) => {
    decal(outline, f, mat, off, depth);
    decal(mirrorX(outline), f, mat, off, depth);
  };
  /** Faixa fina (friso de porta) ao longo de uma polilinha. */
  function line(pts: P2[], w: number): P2[] {
    const a: P2[] = [], b: P2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
      a.push([pts[i][0] + nx, pts[i][1] + ny]);
      b.push([pts[i][0] - nx, pts[i][1] - ny]);
    }
    return [...a, ...b.reverse()];
  }

  /* vidros laterais, com a moldura preta e a coluna B preta */
  sides([[0.635, 1.04], [0.15, 1.505], [-1.08, 1.505], [-1.3, 1.395], [-1.33, 1.1], [-1.24, 1.055]], trimM, 0.003);
  sides(chaikin([[0.57, 1.075], [0.12, 1.462], [-0.355, 1.468], [-0.355, 1.07]], 1), glassM, 0.005);
  sides(chaikin([[-0.5, 1.08], [-0.5, 1.468], [-1.07, 1.468], [-1.255, 1.375], [-1.27, 1.13], [-1.2, 1.095]], 1), glassM, 0.005);
  // canto fixo do vidro dianteiro, onde fica o retrovisor
  sides([[0.57, 1.075], [0.47, 1.16], [0.47, 1.075]], trimM, 0.0055);

  /* para-brisa com a faixa preta em volta e as palhetas */
  decal(chaikin([[-0.76, -0.44], [0.76, -0.44], [0.65, 0.43], [-0.65, 0.43]], 1), WINDSHIELD, pianoM, 0.003, 0.6);
  decal(chaikin([[-0.71, -0.39], [0.71, -0.39], [0.61, 0.39], [-0.61, 0.39]], 1), WINDSHIELD, glassM, 0.005, 0.6);
  for (const zc of [-0.36, 0.22]) {
    const h = proj.cast(V(4, 1.235, zc), V(-1, 0, 0));
    if (!h) continue;
    const wp = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.55), blackM);
    wp.position.copy(h.point).add(V(-0.03, 0.012, 0));
    wp.rotation.y = 0.18;
    car.add(wp);
  }

  /* friso preto do teto (calhas), visto de cima */
  for (const s of [1, -1]) decal(line([[0.02, s * 0.6], [-0.6, s * 0.615], [-1.3, s * 0.6]], 0.02), TOP, trimM, 0.003);

  /* frente: faróis alongados e puxados para os lados, grade de cima ligando os dois com o emblema,
     e embaixo a abertura reta do para-choque, emendada nos nichos dos faróis de neblina */
  const FD = 0.55;
  // faixa preta da grade de cima, que vai de um farol ao outro
  decal(chaikin([[-0.46, 0.83], [0.46, 0.83], [0.5, 0.935], [-0.5, 0.935]], 1), FRONT, pianoM, 0.004, FD);
  for (const y of [0.858, 0.903]) pair(line([[0.17, y], [0.42, y]], 0.012), FRONT, trimM, 0.006, FD);
  // faróis: corpo preto, largo e subindo para fora
  pair(chaikin([[0.4, 0.83], [0.4, 0.93], [0.55, 0.965], [0.7, 0.99], [0.75, 0.965], [0.755, 0.88], [0.7, 0.83], [0.55, 0.815]], 1), FRONT, pianoM, 0.005);
  sides(chaikin([[1.73, 0.84], [1.7, 0.95], [1.56, 1.0], [1.36, 1.055], [1.27, 1.06], [1.3, 1.025], [1.46, 0.96], [1.62, 0.875]], 1), pianoM, 0.005);
  // refletor do farol (lente clara) e o projetor
  pair(chaikin([[0.47, 0.85], [0.47, 0.915], [0.6, 0.945], [0.7, 0.96], [0.72, 0.9], [0.68, 0.85]], 1), FRONT, lensM, 0.007);
  pair(circle(0.6, 0.893, 0.04), FRONT, chromeM, 0.009);
  pair(circle(0.6, 0.893, 0.025), FRONT, glassM, 0.011);
  pair(line([[0.44, 0.84], [0.6, 0.832], [0.73, 0.85]], 0.012), FRONT, drlM, 0.009);
  pair(circle(0.705, 0.93, 0.018), FRONT, amberM, 0.009);
  sides(line(chaikin([[1.66, 0.89], [1.5, 0.96], [1.34, 1.03]], 1, false), 0.018), lensM, 0.007);
  // abertura reta de baixo, de ponta a ponta, que sobe nas pontas para os faróis de neblina
  decal(
    chaikin([[-0.6, 0.355], [0.6, 0.355], [0.74, 0.37], [0.79, 0.43], [0.8, 0.57], [0.64, 0.57], [0.6, 0.48], [-0.6, 0.48], [-0.64, 0.57], [-0.8, 0.57], [-0.79, 0.43], [-0.74, 0.37]], 1),
    FRONT, pianoM, 0.004, FD,
  );
  for (let k = 0; k < 3; k++) {
    const y = 0.385 + k * 0.03;
    decal(line([[-0.58, y], [0.58, y]], 0.008), FRONT, seamM, 0.007, FD);
  }
  pair(circle(0.705, 0.5, 0.042), FRONT, chromeM, 0.007);
  pair(circle(0.705, 0.5, 0.028), FRONT, lensM, 0.009);
  // saia preta embaixo
  decal([[-0.8, 0.31], [0.8, 0.31], [0.8, 0.345], [-0.8, 0.345]], FRONT, trimM, 0.003, FD);

  /* traseira: vidro e tampa formam um painel preto brilhante só, do teto ao para-choque,
     com as lanternas verticais nos cantos de baixo, dobrando para as laterais */
  const RD = 0.6;
  decal(
    chaikin([[-0.58, 0.8], [0.58, 0.8], [0.63, 0.86], [0.645, 1.15], [0.6, 1.38], [0.55, 1.47], [-0.55, 1.47], [-0.6, 1.38], [-0.645, 1.15], [-0.63, 0.86]], 2),
    REAR, pianoM, 0.004, RD,
  );
  // o vidro, um tom mais claro dentro do painel
  decal(rrect(-0.47, 1.06, 0.47, 1.41, 0.07), REAR, glassM, 0.006, RD);
  // lanternas
  pair(chaikin([[0.5, 0.84], [0.49, 1.0], [0.54, 1.2], [0.62, 1.25], [0.69, 1.22], [0.735, 1.05], [0.72, 0.86], [0.66, 0.82]], 1), REAR, tailM, 0.008);
  sides(chaikin([[-1.62, 0.86], [-1.58, 1.05], [-1.54, 1.24], [-1.46, 1.22], [-1.48, 1.04], [-1.53, 0.86]], 1), tailM, 0.008);
  pair(chaikin([[0.53, 1.08], [0.56, 1.19], [0.62, 1.22], [0.68, 1.19], [0.7, 1.08]], 1), REAR, tailDarkM, 0.01);
  pair(rrect(0.53, 0.92, 0.7, 0.97, 0.012), REAR, clearM, 0.01);
  sides(chaikin([[-1.6, 0.92], [-1.59, 0.97], [-1.5, 0.97], [-1.51, 0.92]], 1), clearM, 0.01);
  decal(rrect(-0.17, 1.44, 0.17, 1.462, 0.01), REAR, tailM, 0.008, RD);
  // para-choque: rebaixo da placa, refletores e difusor preto
  decal(rrect(-0.24, 0.46, 0.24, 0.63, 0.03), REAR, trimM, 0.003);
  pair(rrect(0.6, 0.48, 0.72, 0.51, 0.012), REAR, tailM, 0.005);
  decal(chaikin([[-0.72, 0.33], [0.72, 0.33], [0.68, 0.4], [-0.68, 0.4]], 1), REAR, trimM, 0.003);

  /* frisos das portas, tampa do tanque, vinco lateral e soleira */
  const seam = 0.004;
  sides(line(chaikin([[0.64, 1.03], [0.66, 0.8], [0.7, 0.6], [0.72, 0.55]], 1, false), seam), seamM, 0.002);
  sides(line(chaikin([[-0.43, 1.06], [-0.43, 0.7], [-0.45, 0.4], [-0.47, 0.37]], 1, false), seam), seamM, 0.002);
  sides(line(chaikin([[-1.27, 1.08], [-1.27, 0.92], [-1.2, 0.8], ...arc(RX, WR, AR + 0.06, 1.1, 0.2, 6)], 1, false), seam), seamM, 0.002);
  decal(line([...circle(-1.36, 0.98, 0.075, 30), [-1.36 + 0.075, 0.98]], seam), RIGHT, seamM, 0.002);
  sides(line(chaikin([[1.25, 0.86], [0.4, 0.84], [-0.6, 0.85], [-1.45, 0.9]], 2, false), 0.012), shadowM, 0.0015);
  // moldura preta das caixas de roda e da soleira (o Mobi Like tem o contorno todo preto)
  for (const x of [FX, RX]) sides([...arc(x, WR, AR + 0.075, 0.12, Math.PI - 0.12, 20), ...arc(x, WR, AR + 0.008, Math.PI - 0.06, 0.06, 20)], trimM, 0.003);
  sides(chaikin([[FX - AR - 0.04, 0.325], [RX + AR + 0.04, 0.325], [RX + AR + 0.06, 0.4], [FX - AR - 0.06, 0.41]], 1), trimM, 0.003);

  /* caixas de roda escuras por dentro */
  const wellM = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.95, side: THREE.DoubleSide });
  for (const x of [FX, RX]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(AR - 0.01, AR - 0.01, 1.52, 40, 1, true, Math.PI / 2 - 0.3, Math.PI + 0.6), wellM);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, WR, 0);
    car.add(w);
  }

  /* rodas de liga 14", cinco raios duplos e calota central vermelha */
  const tyreG = new THREE.LatheGeometry(
    ([[0.19, -0.085], [0.24, -0.09], [0.27, -0.088], [0.285, -0.072], [0.292, -0.04], [0.293, 0], [0.292, 0.04], [0.285, 0.072], [0.27, 0.088], [0.24, 0.09], [0.19, 0.085]] as P2[]).map(([a, b]) => new THREE.Vector2(a, b)),
    64,
  );
  const tyreM = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.9, envMap: envRT.texture, envMapIntensity: 0.45 });
  const alloyM = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.85, roughness: 0.22 });
  const darkAlloyM = new THREE.MeshStandardMaterial({ color: 0x3b3e43, metalness: 0.6, roughness: 0.4 });
  const nutM = new THREE.MeshStandardMaterial({ color: 0xe0e3e6, metalness: 1, roughness: 0.15 });
  const barrelG = new THREE.CylinderGeometry(0.178, 0.178, 0.12, 40);
  const lipG = new THREE.TorusGeometry(0.182, 0.013, 10, 64);
  const spokeG = new THREE.BoxGeometry(0.14, 0.016, 0.03);
  spokeG.translate(0.065, 0, 0);
  const hubG = new THREE.CylinderGeometry(0.055, 0.06, 0.03, 32);
  const capG = new THREE.CylinderGeometry(0.032, 0.032, 0.008, 32);
  const capM = new THREE.MeshStandardMaterial({ color: 0xb1121c, metalness: 0.3, roughness: 0.3 });
  const nutG = new THREE.CylinderGeometry(0.007, 0.007, 0.012, 8);
  const wheels: THREE.Group[] = [];
  for (const x of [FX, RX]) {
    for (const s of [1, -1]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(tyreG, tyreM), new THREE.Mesh(barrelG, darkAlloyM));
      const lip = new THREE.Mesh(lipG, alloyM);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = 0.072;
      g.add(lip);
      for (let k = 0; k < 5; k++) {
        for (const off of [-0.12, 0.12]) {
          const a = (k / 5) * Math.PI * 2 + off;
          const sp = new THREE.Mesh(spokeG, alloyM);
          sp.position.set(Math.cos(a) * 0.035, 0.078, Math.sin(a) * 0.035);
          sp.rotation.y = -a;
          sp.rotation.z = -0.1;
          g.add(sp);
        }
        const a = ((k + 0.5) / 5) * Math.PI * 2;
        const nut = new THREE.Mesh(nutG, nutM);
        nut.position.set(Math.cos(a) * 0.04, 0.094, Math.sin(a) * 0.04);
        g.add(nut);
      }
      const hub = new THREE.Mesh(hubG, alloyM);
      hub.position.y = 0.08;
      const cap = new THREE.Mesh(capG, capM);
      cap.position.y = 0.098;
      g.add(hub, cap);
      g.rotation.x = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      const w = new THREE.Group();
      w.add(g);
      w.position.set(x, WR, TR * s);
      car.add(w);
      wheels.push(w);
    }
  }

  /* placas e emblemas */
  function sticker(tex: THREE.Texture, w: number, h: number, o: THREE.Vector3, d: THREE.Vector3, off = 0.006) {
    textures.push(tex);
    const k = proj.cast(o, d);
    if (!k) return;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    );
    m.position.copy(k.point).addScaledVector(k.normal, off);
    m.lookAt(k.point.clone().addScaledVector(k.normal, 1));
    car.add(m);
  }
  const plate = plateTex(opts.plate ?? "");
  sticker(plate, 0.4, 0.13, V(4, 0.555, 0), V(-1, 0, 0), 0.008);
  sticker(wordTex("FIAT", { size: 110, color: "#dfe3e8" }), 0.24, 0.075, V(4, 0.882, 0), V(-1, 0, 0), 0.008);
  sticker(plate, 0.4, 0.13, V(-4, 0.545, 0), V(1, 0, 0), 0.008);
  sticker(wordTex("FIAT", { size: 110 }), 0.22, 0.07, V(-4, 0.98, 0), V(1, 0, 0), 0.008);
  sticker(wordTex("MOBI", { size: 80 }), 0.16, 0.05, V(-4, 0.9, -0.33), V(1, 0, 0), 0.008);
  sticker(wordTex("like on", { italic: true, size: 70 }), 0.15, 0.047, V(-4, 0.9, 0.33), V(1, 0, 0), 0.008);
  sticker(fiatBadge(), 0.04, 0.04, V(-4, 0.88, 0), V(1, 0, 0), 0.008);

  /* maçanetas, retrovisores e antena */
  const handleG = new THREE.BoxGeometry(0.15, 0.03, 0.03);
  handleG.translate(0, 0, 0.012);
  const mirrorG = new THREE.SphereGeometry(1, 28, 18);
  const mirrorGlassM = new THREE.MeshStandardMaterial({ color: 0x8d969f, metalness: 1, roughness: 0.05 });
  for (const s of [1, -1]) {
    for (const [x, y] of [[-0.2, 0.93], [-1.1, 0.985]] as P2[]) {
      decal(rrect(x - 0.09, y - 0.028, x + 0.09, y + 0.028, 0.02), s > 0 ? RIGHT : LEFT, trimM, 0.002);
      const h = proj.cast(V(x, y, s * 3), V(0, 0, -s));
      if (!h) continue;
      const m = new THREE.Mesh(handleG, paintM);
      m.position.copy(h.point);
      m.scale.z = s;
      car.add(m);
    }
    const h = proj.cast(V(0.5, 1.1, s * 3), V(0, 0, -s));
    if (h) {
      const zb = Math.abs(h.point.z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), blackM);
      base.position.set(0.5, 1.1, s * (zb + 0.02));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.1), blackM);
      arm.position.set(0.48, 1.11, s * (zb + 0.08));
      const cap = new THREE.Mesh(mirrorG, paintM);
      cap.scale.set(0.06, 0.068, 0.11);
      cap.position.set(0.475, 1.14, s * (zb + 0.15));
      const rim = new THREE.Mesh(mirrorG, blackM);
      rim.scale.set(0.012, 0.064, 0.106);
      rim.position.set(0.416, 1.14, s * (zb + 0.15));
      const gl = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mirrorGlassM);
      gl.scale.set(0.1, 0.058, 1);
      gl.rotation.y = -Math.PI / 2;
      gl.position.set(0.41, 1.14, s * (zb + 0.15));
      car.add(base, arm, cap, rim, gl);
    }
  }
  {
    const k = proj.cast(V(-1.12, 4, 0), V(0, -1, 0));
    if (k) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.42, 8), blackM);
      a.position.copy(k.point).add(V(-0.1, 0.19, 0));
      a.rotation.z = 0.5;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.02, 16), blackM);
      b.position.copy(k.point).add(V(0, 0.008, 0));
      car.add(a, b);
    }
  }
  // limpador traseiro
  {
    const k = proj.cast(V(-4, 1.0, 0), V(1, 0, 0));
    if (k) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.36), blackM);
      arm.position.copy(k.point).add(V(-0.02, 0.12, -0.12));
      arm.rotation.x = -0.75;
      car.add(arm);
    }
  }

  /* sombra de contato */
  const shTex = canvasTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  textures.push(shTex);
  const shM = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.5), shM);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.001;
  car.add(sh);
  for (const w of wheels) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.35), shM);
    s.rotation.x = -Math.PI / 2;
    s.position.set(w.position.x, 0.002, w.position.z);
    car.add(s);
  }

  /* câmera e vistas */
  const VIEWS: Record<MobiView, [number, number, number]> = { tq: [4.6, 1.7, 4.3], fr: [1, 0.12, 0], sd: [0, 0.12, 1], bk: [-1, 0.18, 0.0001], tp: [0.15, 1, 0.06] };
  let baseR = 7;
  function fit() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = cam.aspect < 0.8 ? 40 : 32;
    cam.updateProjectionMatrix();
    const t = Math.tan((cam.fov * Math.PI) / 360);
    baseR = Math.max((cam.aspect < 0.8 ? 4.1 : 4.6) / (2 * t * cam.aspect), 2.5 / (2 * t)) * 1.05;
  }
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  fit();
  cam.position.copy(TGT).add(V(...VIEWS.tq).normalize().multiplyScalar(baseR));

  let tw: { s0: THREE.Spherical; s1: THREE.Spherical; dt: number; t0: number } | null = null;
  const onStart = () => {
    tw = null;
    ctl.autoRotate = false;
    onUserMove?.();
  };
  ctl.addEventListener("start", onStart);
  let lightT = 0, lightV = 0;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let raf = 0;
  const loop = (now: number) => {
    if (tw) {
      const t = Math.min(1, (now - tw.t0) / 850), e = ease(t);
      const s = new THREE.Spherical(tw.s0.radius + (tw.s1.radius - tw.s0.radius) * e, tw.s0.phi + (tw.s1.phi - tw.s0.phi) * e, tw.s0.theta + tw.dt * e);
      cam.position.copy(TGT).add(new THREE.Vector3().setFromSpherical(s));
      if (t >= 1) tw = null;
    }
    lightV += (lightT - lightV) * 0.12;
    lensM.emissiveIntensity = lightV * 2.2;
    drlM.emissiveIntensity = lightV * 1.8;
    tailM.emissiveIntensity = lightV * 1.2;
    ctl.update();
    R.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    look(dir, fov) {
      tw = null;
      ctl.autoRotate = false;
      if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      const t = Math.tan((cam.fov * Math.PI) / 360);
      cam.position.copy(TGT).add(V(...dir).normalize().multiplyScalar(4.3 / (2 * t)));
      ctl.update();
    },
    setView(v) {
      const s0 = new THREE.Spherical().setFromVector3(cam.position.clone().sub(TGT));
      const s1 = new THREE.Spherical().setFromVector3(V(...VIEWS[v]).normalize().multiplyScalar(baseR));
      if (v === "tp") s1.phi = 0.08;
      let dt = s1.theta - s0.theta;
      dt = Math.atan2(Math.sin(dt), Math.cos(dt));
      tw = { s0, s1, dt, t0: performance.now() };
      ctl.autoRotate = false;
    },
    setSpin(on) {
      ctl.autoRotate = on;
    },
    setLights(on) {
      lightT = on ? 1 : 0;
    },
    setPaint(hex) {
      paintM.color.set(hex);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctl.removeEventListener("start", onStart);
      ctl.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      pm.dispose();
      R.dispose();
    },
  };
}
