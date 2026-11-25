import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Fiat Mobi Like (linha atual) em 3D, feito à mão a partir das fotos do carro do João e das medidas
 * da ficha técnica da Stellantis: 3,596 m de comprimento, 1,666 m de largura, 1,553 m de altura,
 * 2,304 m de entre-eixos e pneus 175/65 R14. Unidade: metro. Frente em +x, lado direito em +z.
 *
 * A carroceria é o perfil lateral extrudado e entortado; faróis, grades, lanternas, vidros e frisos
 * são pintados no shader a partir da posição de cada ponto, para não precisar de textura.
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
  setSpin: (on: boolean) => void;
  setLights: (on: boolean) => void;
  setPaint: (hex: string) => void;
  dispose: () => void;
}

export { paintFor, WHITE } from "../paint";
import { WHITE } from "../paint";

// medidas
const FX = 1.115;
const RX = -1.189;
const WR = 0.29;
const AR = 0.37;
const TR = 0.7;

type P2 = [number, number];
const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function chaikin(p: P2[], n: number): P2[] {
  for (let k = 0; k < n; k++) {
    const q: P2[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
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

interface Shape3 {
  depth: number; bt: number; bs: number; steps: number;
  taper: (x: number, y: number) => number;
  kf: number; f0: number; f1: number; kr: number; r0: number; r1: number;
  crown: number; c0: number; c1: number;
}
function build(pts: THREE.Vector2[], o: Shape3) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: o.depth, bevelEnabled: true, bevelThickness: o.bt, bevelSize: o.bs, bevelSegments: 6, steps: o.steps, curveSegments: 4 });
  const p = g.getAttribute("position") as THREE.BufferAttribute, hw = o.depth / 2 + o.bt;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i), z = p.getZ(i) - o.depth / 2;
    const u = z / hw;
    z *= o.taper(x, y);
    const nx = x - o.kf * u * u * sm(o.f0, o.f1, x) + o.kr * u * u * sm(o.r0, o.r1, x);
    y += o.crown * (1 - u * u) * sm(o.c0, o.c1, y);
    p.setXYZ(i, nx, y, z);
  }
  g.clearGroups();
  crease(g, 34);
  return g;
}

const U = () => ({ uL: { value: 0 }, uPaint: { value: new THREE.Color(WHITE) } });
type Uniforms = ReturnType<typeof U>;

function mkMat(logic: string, u: Uniforms, key: string) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uL = u.uL;
    s.uniforms.uPaint = u.uPaint;
    s.vertexShader = "varying vec3 vP;varying vec3 vN;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvP=position;vN=normal;");
    s.fragmentShader =
      "varying vec3 vP;varying vec3 vN;uniform float uL;uniform vec3 uPaint;\n" +
      s.fragmentShader
        .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 kC=uPaint;float kR=0.26,kM=0.0,kK=1.0;vec3 kE=vec3(0.0);\n" + logic + "\ndiffuseColor.rgb=kC;")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor=kR;")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor=kM;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance+=kE;")
        .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\nmaterial.clearcoat*=kK;");
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// Carroceria abaixo da linha dos vidros. Pontos tirados da foto de lado, em metros.
const BODY: P2[] = [
  [-1.77, 0.34], [-1.66, 0.29],
  ...arc(RX, WR, AR, Math.PI + Math.asin(0.02 / AR), -Math.asin(0.02 / AR), 24),
  ...arc(FX, WR, AR, Math.PI + Math.asin(0.02 / AR), -Math.asin(0.02 / AR), 24),
  [1.62, 0.28], [1.74, 0.31], [1.795, 0.42], [1.815, 0.6], [1.805, 0.78], [1.765, 0.89], [1.68, 0.955], [1.55, 0.995], [1.25, 1.065], [0.92, 1.12],
  [0.7, 1.05], [0.2, 1.05], [-0.6, 1.07], [-1.15, 1.105], [-1.42, 1.15], [-1.56, 1.25], [-1.63, 1.235], [-1.7, 1.06], [-1.77, 0.86], [-1.805, 0.62],
];

const BODY_GLSL = /* glsl */ `
float az=abs(vP.z);
vec3 BL=vec3(0.012);
if(vP.x>1.2&&vN.x>0.15){
  float af=degrees(atan(az,max(vP.x-1.0,0.001)));
  float lo=0.815+0.11*smoothstep(28.0,84.0,af);
  float hi=0.965+0.06*smoothstep(48.0,84.0,af);
  if(af>23.0&&af<84.0&&vP.y>lo&&vP.y<hi&&vN.y<0.8){
    float e=min(min(vP.y-lo,hi-vP.y),min(af-23.0,84.0-af)*0.003);
    kC=vec3(0.01);kR=0.08;kM=0.0;
    float pr=length(vec2((af-36.0)*0.0055,vP.y-0.885));
    if(pr<0.042){kC=vec3(0.75,0.78,0.8);kM=1.0;kR=0.06;}
    if(pr<0.022){kC=vec3(0.9);kM=1.0;kR=0.02;}
    float drl=abs(vP.y-(lo+0.018));
    if(drl<0.006&&af>40.0){kC=vec3(0.6);kM=0.8;}
    if(e<0.006){kC=vec3(0.03);kM=0.0;}
    kE=vec3(1.0,0.96,0.88)*uL*2.4*(1.0-smoothstep(0.03,0.05,pr))+vec3(0.9,0.95,1.0)*uL*1.8*(1.0-step(0.006,drl))*step(40.0,af);
  } else if(af<=23.5&&vP.y>0.80&&vP.y<0.955-0.01*smoothstep(10.0,23.0,af)){
    kC=vec3(0.006);kR=0.15;
    float sl=fract(vP.y*48.0);
    kC=mix(kC,vec3(0.03),smoothstep(0.75,0.9,sl));
    if(abs(vP.y-0.80)<0.006||abs(vP.y-0.95)<0.008)kC=vec3(0.02);
  } else if(af<34.0&&vP.y>0.335&&vP.y<0.50-0.03*smoothstep(15.0,34.0,af)){
    vec2 hc=vec2(vP.z*34.0,vP.y*46.0);
    float hx=abs(fract(hc.x+0.5*floor(hc.y))-0.5)+abs(fract(hc.y)-0.5);
    kC=mix(vec3(0.003),vec3(0.035),smoothstep(0.32,0.46,hx));kR=0.55;kK=0.1;
  } else if(af>36.0&&af<52.0&&vP.y>0.43&&vP.y<0.57){
    kC=vec3(0.012);kR=0.5;kK=0.1;
    float fr=length(vec2((af-44.0)*0.006,vP.y-0.5));
    if(fr<0.032){kC=vec3(0.7,0.72,0.74);kM=1.0;kR=0.08;kE=vec3(1.0,0.97,0.9)*uL*1.2;}
  } else if(vP.y<0.315){kC=vec3(0.02);kR=0.7;kK=0.0;}
}
if(vP.x<-1.4&&vN.x<-0.1){
  float ar=degrees(atan(az,max(-vP.x-1.2,0.001)));
  if(az<0.5&&vP.y>0.62){kC=vec3(0.004);kR=0.05;}
  else if(az>=0.5&&ar<80.0&&vP.y>0.84&&vP.y<1.255){
    kC=vec3(0.42,0.008,0.01);kR=0.07;kE=vec3(1.0,0.03,0.02)*uL*1.5;
    float wb=abs(vP.y-0.985);
    if(wb<0.055&&ar<70.0){kC=vec3(0.75,0.76,0.78);kM=0.8;kR=0.08;kE=vec3(0.0);}
    if(az<0.52||vP.y<0.852||vP.y>1.245||ar>78.5){kC=vec3(0.01);kE=vec3(0.0);kM=0.0;}
  } else if(vP.y<0.38){kC=vec3(0.02);kR=0.7;kK=0.0;}
}
if(abs(vN.z)>0.4&&vP.y>0.3&&vP.y<1.06){
  float d=1.0;
  if(vP.y>0.36){
    if(vP.x<0.75) d=min(d,abs(vP.x-0.60-0.07*smoothstep(0.75,1.05,vP.y)));
    d=min(d,abs(vP.x+0.44));
  }
  if(vP.y>0.8) d=min(d,abs(vP.x+1.28));
  else if(vP.x>-1.19&&vP.x<-0.7) d=min(d,abs(length(vec2(vP.x-(${RX.toFixed(3)}),vP.y-0.29))-0.51));
  float w=0.0032;
  kC=mix(kC,vec3(0.05),(1.0-smoothstep(w*0.5,w*1.6,d))*0.85);
  float cy=0.80-0.025*vP.x;
  kC*=1.0-0.12*(1.0-smoothstep(0.0,0.014,vP.y-cy+0.007))*step(cy-0.03,vP.y)*smoothstep(1.3,1.05,vP.x)*smoothstep(-1.62,-1.42,vP.x);
}`;

const GH: P2[] = [
  [0.97, 1.0], [0.93, 1.1], [0.55, 1.33], [0.25, 1.49], [0.12, 1.535], [-0.1, 1.553], [-0.8, 1.553], [-1.3, 1.543], [-1.47, 1.52], [-1.55, 1.46], [-1.66, 1.12], [-1.68, 1.0],
];

const GH_GLSL = /* glsl */ `
float az=abs(vP.z);
float hh=clamp((vP.y-1.10)/0.46,0.0,1.0);
float hw=0.75*(1.0-0.17*hh);
float belt=1.045+0.065*smoothstep(0.2,-1.2,vP.x);
float gl=0.0,bk=0.0;
float xf=0.93-(vP.y-1.10)*1.82;
if(abs(vN.z)>0.5){
  float rearEdge=-1.265+(vP.y-1.1)*0.2;
  if(vP.y>belt+0.012&&vP.y<1.475&&vP.x<xf-0.13&&vP.x>rearEdge){
    gl=1.0;
    if(vP.x>-0.48&&vP.x<-0.40)bk=1.0;
    if(vP.x>xf-0.30&&vP.y<belt+0.10)bk=1.0;
    if(vP.x<rearEdge+0.004||vP.y>1.47)bk=1.0;
  }
}else if(vN.x>0.25&&vN.y<0.92){
  if(az<hw-0.075&&vP.y>1.10&&vP.y<1.51)gl=1.0;
}else if(vN.x<-0.2&&vN.y<0.92){
  if(az<hw-0.1&&vP.y<1.49)gl=1.0;
}
if(vP.y<belt-0.005){gl=1.0;bk=1.0;}
if(gl>0.5){kC=vec3(0.004,0.006,0.008);kR=0.03;}
if(bk>0.5){kC=vec3(0.006);kR=0.65;kK=0.0;}`;

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
/** Emblema novo da Fiat: as letras FIAT empilhadas num quadro cromado. */
const fiatBadge = () =>
  canvasTex(256, 256, (x, w) => {
    x.strokeStyle = "#d9dde2"; x.lineWidth = 10; x.strokeRect(38, 38, w - 76, w - 76);
    x.fillStyle = "#e6e9ec"; x.font = "700 70px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("FI", w / 2, 98); x.fillText("AT", w / 2, 164);
  });
const wordTex = (word: string, italic = false) =>
  canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = "#d7dade"; x.font = `${italic ? "italic " : ""}700 84px Arial, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(word, w / 2, h / 2 + 4);
  });

export function createMobiViewer(canvas: HTMLCanvasElement, opts: MobiOptions = {}, onUserMove?: () => void): MobiViewer {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  const envRT = pm.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(3, 6, 2);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.1));

  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const TGT = new THREE.Vector3(0, 0.7, 0);
  const ctl = new OrbitControls(cam, canvas);
  ctl.target.copy(TGT);
  ctl.enableDamping = true;
  ctl.enablePan = false;
  ctl.minDistance = 3;
  ctl.maxDistance = 18;
  ctl.maxPolarAngle = Math.PI * 0.495;
  ctl.autoRotate = true;
  ctl.autoRotateSpeed = 0.7;

  const u = U();
  u.uPaint.value.set(opts.paint ?? WHITE);
  const car = new THREE.Group();
  scene.add(car);

  // carroceria
  const body = new THREE.Mesh(
    build(dens(chaikin(BODY, 3), 0.06), {
      depth: 1.58, bt: 0.045, bs: 0.04, steps: 16,
      taper: (x, y) => (1 - 0.03 * sm(0.85, 1.12, y)) * (1 - 0.035 * sm(0.45, 0.28, y)) * (1 - 0.08 * sm(1.15, 1.85, x)) * (1 - 0.05 * sm(-1.35, -1.85, x)),
      kf: 0.2, f0: 1.0, f1: 1.78, kr: 0.08, r0: -1.3, r1: -1.8, crown: 0.02, c0: 0.85, c1: 1.0,
    }),
    mkMat(BODY_GLSL, u, "mobi-body"),
  );
  car.add(body);
  const gh = new THREE.Mesh(
    build(dens(chaikin(GH, 2), 0.05), {
      depth: 1.4, bt: 0.05, bs: 0.035, steps: 12,
      taper: (_x, y) => 1 - 0.17 * Math.min(1, Math.max(0, (y - 1.1) / 0.46)),
      kf: 0.05, f0: 0.1, f1: 1.0, kr: 0.05, r0: -1.2, r1: -1.7, crown: 0.03, c0: 1.4, c1: 1.54,
    }),
    mkMat(GH_GLSL, u, "mobi-gh"),
  );
  car.add(gh);
  car.updateMatrixWorld(true);

  const rc = new THREE.Raycaster();
  const hit = (m: THREE.Object3D, o: THREE.Vector3, d: THREE.Vector3) => {
    rc.set(o, d);
    return rc.intersectObject(m)[0];
  };
  const NX = new THREE.Vector3(-1, 0, 0), PX = new THREE.Vector3(1, 0, 0), NZ = new THREE.Vector3(0, 0, -1), NY = new THREE.Vector3(0, -1, 0);
  const sideZ = (x: number, y: number) => hit(body, new THREE.Vector3(x, y, 3), NZ)?.point.z ?? 0.82;

  const blackM = new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.55, metalness: 0.05 });
  const trimM = new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.75, metalness: 0, side: THREE.DoubleSide });

  // caixas de roda
  const wellM = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.95, side: THREE.DoubleSide });
  for (const x of [FX, RX]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(AR - 0.012, AR - 0.012, 1.5, 40, 1, true, Math.PI / 2 - 0.3, Math.PI + 0.6), wellM);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, WR, 0);
    car.add(w);
  }

  // para-lamas pretos alargados e friso da soleira
  const flareShape = new THREE.Shape([...arc(0, 0, AR + 0.075, -0.05, Math.PI + 0.05, 36), ...arc(0, 0, AR - 0.005, Math.PI + 0.05, -0.05, 36)].map(([a, b]) => new THREE.Vector2(a, b)));
  const flareG = new THREE.ExtrudeGeometry(flareShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 4 });
  for (const x of [FX, RX]) {
    for (const s of [1, -1]) {
      const z = sideZ(x, WR + AR + 0.03);
      const f = new THREE.Mesh(flareG, trimM);
      f.position.set(x, WR, s > 0 ? z - 0.035 : -z + 0.035);
      if (s < 0) f.scale.z = -1;
      car.add(f);
    }
  }
  const sillLen = FX - RX - 2 * (AR + 0.06);
  const sillG = new THREE.BoxGeometry(sillLen, 0.075, 0.05);
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(sillG, trimM);
    m.position.set((FX + RX) / 2, 0.325, s * (sideZ((FX + RX) / 2, 0.34) - 0.01));
    car.add(m);
  }

  // rodas de liga 14", cinco raios duplos
  const tyreG = new THREE.LatheGeometry(
    ([[0.19, -0.08], [0.24, -0.088], [0.27, -0.085], [0.285, -0.07], [0.292, -0.04], [0.293, 0], [0.292, 0.04], [0.285, 0.07], [0.27, 0.085], [0.24, 0.088], [0.19, 0.08]] as P2[]).map(([a, b]) => new THREE.Vector2(a, b)),
    64,
  );
  const tyreM = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.9, envMapIntensity: 0.45 });
  const alloyM = new THREE.MeshStandardMaterial({ color: 0xc8ccd1, metalness: 0.9, roughness: 0.25 });
  const barrelM = new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.5, roughness: 0.55 });
  const barrelG = new THREE.CylinderGeometry(0.178, 0.178, 0.11, 40);
  const lipG = new THREE.TorusGeometry(0.18, 0.012, 10, 64);
  const spokeG = new THREE.BoxGeometry(0.14, 0.012, 0.026);
  spokeG.translate(0.065, 0, 0);
  const hubG = new THREE.CylinderGeometry(0.05, 0.055, 0.03, 32);
  const capG = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 32);
  const capM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.6, roughness: 0.35 });
  const wheels: THREE.Group[] = [];
  for (const x of [FX, RX]) {
    for (const s of [1, -1]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(tyreG, tyreM), new THREE.Mesh(barrelG, barrelM));
      const lip = new THREE.Mesh(lipG, alloyM);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = 0.068;
      g.add(lip);
      for (let k = 0; k < 5; k++) {
        for (const off of [-0.11, 0.11]) {
          const a = (k / 5) * Math.PI * 2 + off;
          const sp = new THREE.Mesh(spokeG, alloyM);
          sp.position.set(Math.cos(a) * 0.035, 0.074, Math.sin(a) * 0.035);
          sp.rotation.y = -a;
          sp.rotation.z = -0.08;
          g.add(sp);
        }
      }
      const hub = new THREE.Mesh(hubG, alloyM);
      hub.position.y = 0.074;
      const cap = new THREE.Mesh(capG, capM);
      cap.position.y = 0.091;
      g.add(hub, cap);
      g.rotation.x = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      const w = new THREE.Group();
      w.add(g);
      w.position.set(x, WR, TR * s);
      car.add(w);
      wheels.push(w);
    }
  }

  // placas e emblemas
  const textures: THREE.Texture[] = [];
  function decal(tex: THREE.Texture, w: number, h: number, o: THREE.Vector3, d: THREE.Vector3, off = 0.004) {
    const k = hit(body, o, d);
    if (!k) return;
    textures.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.copy(k.point).addScaledVector(d, -off);
    m.lookAt(k.point.clone().addScaledVector(d, -1));
    car.add(m);
  }
  const plate = plateTex(opts.plate ?? "");
  decal(plate, 0.4, 0.13, new THREE.Vector3(3, 0.585, 0.06), NX, 0.008);
  decal(fiatBadge(), 0.09, 0.09, new THREE.Vector3(3, 0.875, 0), NX, 0.004);
  decal(plate, 0.4, 0.13, new THREE.Vector3(-3, 0.5, 0), PX, 0.008);
  decal(wordTex("MOBI", true), 0.22, 0.055, new THREE.Vector3(-3, 0.74, 0.3), PX);
  decal(fiatBadge(), 0.08, 0.08, new THREE.Vector3(-3, 0.86, 0), PX);

  // maçanetas, retrovisores e antena
  const handleG = new THREE.BoxGeometry(0.16, 0.034, 0.035);
  const mirrorG = new THREE.SphereGeometry(1, 28, 18);
  const mirrorGlassM = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 1, roughness: 0.05 });
  for (const s of [1, -1]) {
    for (const [x, y] of [[-0.2, 0.935], [-1.1, 0.985]]) {
      const z = sideZ(x, y);
      const m = new THREE.Mesh(handleG, blackM);
      m.position.set(x, y, s * (z + 0.005));
      car.add(m);
    }
    const zb = sideZ(0.52, 1.03);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.12), blackM);
    arm.position.set(0.54, 1.075, s * (zb + 0.04));
    const hs = new THREE.Mesh(mirrorG, blackM);
    hs.scale.set(0.055, 0.07, 0.105);
    hs.position.set(0.52, 1.13, s * (zb + 0.14));
    const gl = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mirrorGlassM);
    gl.scale.set(0.095, 0.06, 1);
    gl.rotation.y = -Math.PI / 2;
    gl.position.set(0.464, 1.13, s * (zb + 0.14));
    car.add(arm, hs, gl);
  }
  {
    const k = hit(gh, new THREE.Vector3(-1.3, 3, 0), NY);
    if (k) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.22, 8), blackM);
      a.position.copy(k.point).add(new THREE.Vector3(-0.045, 0.1, 0));
      a.rotation.z = 0.45;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), blackM);
      b.position.copy(k.point);
      car.add(a, b);
    }
  }

  // sombra de contato
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

  // câmera e vistas
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
  cam.position.copy(TGT).add(new THREE.Vector3(...VIEWS.tq).normalize().multiplyScalar(baseR));

  let tw: { s0: THREE.Spherical; s1: THREE.Spherical; dt: number; t0: number } | null = null;
  const onStart = () => {
    tw = null;
    ctl.autoRotate = false;
    onUserMove?.();
  };
  ctl.addEventListener("start", onStart);
  let lightT = 0;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let raf = 0;
  const loop = (now: number) => {
    if (tw) {
      const t = Math.min(1, (now - tw.t0) / 850), e = ease(t);
      const s = new THREE.Spherical(tw.s0.radius + (tw.s1.radius - tw.s0.radius) * e, tw.s0.phi + (tw.s1.phi - tw.s0.phi) * e, tw.s0.theta + tw.dt * e);
      cam.position.copy(TGT).add(new THREE.Vector3().setFromSpherical(s));
      if (t >= 1) tw = null;
    }
    u.uL.value += (lightT - u.uL.value) * 0.12;
    ctl.update();
    R.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    setView(v) {
      const s0 = new THREE.Spherical().setFromVector3(cam.position.clone().sub(TGT));
      const s1 = new THREE.Spherical().setFromVector3(new THREE.Vector3(...VIEWS[v]).normalize().multiplyScalar(baseR));
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
      u.uPaint.value.set(hex);
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
