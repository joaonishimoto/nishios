import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  AXLE_F, AXLE_R, PLATE_F, PLATE_R, RIM_R, TIRE_R, TIRE_W, TRACK, WINDSHIELD, bodyGrid, gridIndex, mapH, mapX,
} from "./shape";
import albedoUrl from "./tex/albedo.webp";
import ormUrl from "./tex/orm.png";
import fxUrl from "./tex/fx.png";

export { paintFor, WHITE } from "../paint";

/**
 * Fiat Mobi Like 2018 em 3D. A lataria vem de `shape.ts` (fatias tiradas da foto de lado) e as
 * texturas dela (vidros, faróis, lanternas, grades, plásticos pretos e frisos) são pintadas pelo
 * script `scripts/mobi/bake.ts`. Aqui entram as peças soltas: rodas com calota, retrovisores,
 * maçanetas, limpadores, antena, placas, emblemas e um interior simples que aparece pelos vidros.
 * Unidade: metro. Frente em +x, lado direito em +z.
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
  look: (dir: [number, number, number], fov?: number, dist?: number) => void;
  setSpin: (on: boolean) => void;
  setLights: (on: boolean) => void;
  setPaint: (hex: string) => void;
  /** Resolve quando as texturas chegaram e o carro já aparece completo. */
  ready: Promise<void>;
  dispose: () => void;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ---------------- texturas desenhadas no canvas ---------------- */

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
/** Emblema da Fiat (2017–2020): escudo vermelho com as letras FIAT num aro cromado. */
const fiatBadge = () =>
  canvasTex(256, 256, (x, w) => {
    const c = w / 2;
    const g = x.createLinearGradient(0, 0, 0, w);
    g.addColorStop(0, "#f7f8f9"); g.addColorStop(0.5, "#8f959c"); g.addColorStop(1, "#eceef0");
    x.fillStyle = g; x.beginPath(); x.arc(c, c, 126, 0, 7); x.fill();
    const r = x.createRadialGradient(c, c - 30, 10, c, c, 104);
    r.addColorStop(0, "#e3303b"); r.addColorStop(1, "#8a0d17");
    x.fillStyle = r; x.beginPath(); x.arc(c, c, 102, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 5; x.beginPath(); x.arc(c, c, 78, 0, 7); x.stroke();
    x.fillStyle = "#f4f5f6"; x.font = "700 64px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("FIAT", c, c + 3);
  });
/** Letreiros cromados. */
const wordTex = (word: string, opts: { italic?: boolean; size?: number; weight?: number; spacing?: number } = {}) =>
  canvasTex(512, 160, (x, w, h) => {
    const g = x.createLinearGradient(0, 30, 0, 130);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#c3c8ce"); g.addColorStop(1, "#f4f5f7");
    x.fillStyle = g;
    x.font = `${opts.italic ? "italic " : ""}${opts.weight ?? 700} ${opts.size ?? 96}px Arial, sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    if (opts.spacing) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${opts.spacing}px`;
    x.fillText(word, w / 2, h / 2 + 4);
  });

/* ---------------- peças ---------------- */

/** Pneu 175/65 R14: perfil girado em volta do eixo. */
function tireGeometry() {
  const hw = TIRE_W / 2, R = TIRE_R, r = RIM_R + 0.004;
  const pts: THREE.Vector2[] = [];
  const push = (rad: number, y: number) => pts.push(new THREE.Vector2(rad, y));
  push(r, -hw * 0.82);
  // flanco de dentro, estufado
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    push(r + (R - 0.02 - r) * t, -hw * (0.82 + 0.18 * Math.sin(Math.PI * t * 0.9)));
  }
  // ombro e banda de rodagem
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 10;
    const s = Math.sin(a);
    push(R - 0.02 + 0.02 * Math.cos(a), hw * 0.92 * s);
  }
  for (let i = 7; i >= 0; i--) {
    const t = i / 8;
    push(r + (R - 0.02 - r) * t, hw * (0.82 + 0.18 * Math.sin(Math.PI * t * 0.9)));
  }
  const g = new THREE.LatheGeometry(pts, 72);
  g.rotateX(Math.PI / 2); // eixo em z
  return g;
}

/** Calota do Mobi Like 2017–2020: prata, cinco raios largos com vazados escuros entre eles. */
function hubcapGeometry() {
  const R = 0.172;
  const s = new THREE.Shape();
  s.absarc(0, 0, R, 0, Math.PI * 2, false);
  for (let k = 0; k < 5; k++) {
    const a0 = (k * 2 * Math.PI) / 5 + 0.2;
    const a1 = a0 + 0.82;
    const h = new THREE.Path();
    const r0 = 0.072, r1 = 0.148;
    h.moveTo(Math.cos(a0 + 0.12) * r0, Math.sin(a0 + 0.12) * r0);
    h.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
    h.absarc(0, 0, r1, a0, a1, false);
    h.lineTo(Math.cos(a1 - 0.3) * (r0 + 0.012), Math.sin(a1 - 0.3) * (r0 + 0.012));
    h.closePath();
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2, curveSegments: 40 });
  // abaulada: mais alta no meio
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const rr = Math.hypot(p.getX(i), p.getY(i)) / R;
    p.setZ(i, p.getZ(i) + 0.032 * (1 - rr * rr) - 0.008 * Math.max(0, rr - 0.85) * 8);
  }
  g.computeVertexNormals();
  return g;
}

/** Concha do retrovisor: esfera deformada, achatada atrás onde fica o espelho. */
function mirrorShellGeometry() {
  const g = new THREE.SphereGeometry(1, 40, 24);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i), z = p.getZ(i);
    if (x < 0) x *= 0.25; // traseira reta
    // mais largo por fora, como uma gota deitada
    const w = 1 + 0.12 * z;
    p.setXYZ(i, x * 0.06, y * 0.056 * w, z * 0.1);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------------- cena ---------------- */

export function createMobiViewer(canvas: HTMLCanvasElement, opts: MobiOptions = {}, onUserMove?: () => void): MobiViewer {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  R.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  R.toneMapping = THREE.NeutralToneMapping;
  R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  const envRT = pm.fromScene(new RoomEnvironment(), 0.03);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.75;

  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(2.5, 7, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3; sun.shadow.camera.right = 3; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 15;
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0004;
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.55));

  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const TGT = V(0.05, 0.68, 0);
  const ctl = new OrbitControls(cam, canvas);
  ctl.target.copy(TGT);
  ctl.enableDamping = true;
  ctl.enablePan = false;
  ctl.minDistance = 3;
  ctl.maxDistance = 18;
  ctl.maxPolarAngle = Math.PI * 0.495;
  ctl.autoRotate = true;
  ctl.autoRotateSpeed = 0.9;

  const car = new THREE.Group();
  scene.add(car);
  const textures: THREE.Texture[] = [];

  /* materiais */
  const paint = new THREE.Color(opts.paint ?? "#f1f1ee");
  const lightsU = { value: 0 };
  const paintU = { value: paint };
  const loader = new THREE.TextureLoader();
  const load = (url: string, srgb: boolean) =>
    new Promise<THREE.Texture>((res, rej) => {
      loader.load(url, (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = R.capabilities.getMaxAnisotropy();
        textures.push(t);
        res(t);
      }, undefined, rej);
    });

  const bodyM = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 1, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide,
    emissive: 0xffffff, envMapIntensity: 1,
  });
  bodyM.onBeforeCompile = (sh) => {
    sh.uniforms.paint = paintU;
    sh.uniforms.lightsOn = lightsU;
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", "uniform vec3 paint;\nuniform float lightsOn;\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec4 ormT = texture2D( roughnessMap, vRoughnessMapUv );
        vec4 fxT = texture2D( emissiveMap, vEmissiveMapUv );
        if ( fxT.b > 0.5 ) discard;
        diffuseColor.rgb += paint * 0.9 * ormT.r;
        if ( !gl_FrontFacing ) diffuseColor.rgb = vec3( 0.035 );`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        "totalEmissiveRadiance = ( vec3( 1.0, 0.04, 0.03 ) * fxT.r * 2.2 + vec3( 1.0, 0.97, 0.9 ) * fxT.g * 2.6 ) * lightsOn;",
      );
  };
  const glassM = new THREE.MeshPhysicalMaterial({
    color: 0x0c1014, roughness: 0.02, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.6,
    specularIntensity: 1,
  });
  glassM.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <alphamap_fragment>",
      "diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).b * 0.8;",
    );
  };

  const blackM = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.6 });
  const rubberM = new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.92 });
  const capM = new THREE.MeshPhysicalMaterial({ color: 0xc3c7cc, metalness: 0.75, roughness: 0.32, clearcoat: 0.5 });
  const steelM = new THREE.MeshStandardMaterial({ color: 0x232426, metalness: 0.4, roughness: 0.6 });
  const chromeM = new THREE.MeshStandardMaterial({ color: 0xdfe3e7, metalness: 1, roughness: 0.12 });
  const fabricM = new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.95 });
  const dashM = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8 });

  /* lataria */
  const grid = bodyGrid();
  const bodyG = new THREE.BufferGeometry();
  bodyG.setAttribute("position", new THREE.BufferAttribute(grid.pos, 3));
  bodyG.setAttribute("normal", new THREE.BufferAttribute(grid.nor, 3));
  {
    const uv = new Float32Array(grid.nu * grid.nv * 2);
    for (let i = 0; i < grid.nu; i++)
      for (let j = 0; j < grid.nv; j++) {
        const o = (i * grid.nv + j) * 2;
        uv[o] = i / (grid.nu - 1);
        uv[o + 1] = j / (grid.nv - 1);
      }
    bodyG.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  bodyG.setIndex(new THREE.BufferAttribute(gridIndex(grid), 1));
  bodyG.computeBoundingSphere();
  const body = new THREE.Mesh(bodyG, bodyM);
  body.castShadow = true;
  body.receiveShadow = false;
  body.visible = false;
  const glass = new THREE.Mesh(bodyG, glassM);
  glass.renderOrder = 2;
  glass.visible = false;
  car.add(body, glass);

  const ready = Promise.all([load(albedoUrl, true), load(ormUrl, false), load(fxUrl, false)]).then(([al, orm, fx]) => {
    bodyM.map = al;
    bodyM.roughnessMap = orm;
    bodyM.metalnessMap = orm;
    bodyM.clearcoatMap = orm;
    bodyM.emissiveMap = fx;
    bodyM.needsUpdate = true;
    glassM.alphaMap = fx;
    glassM.needsUpdate = true;
    body.visible = glass.visible = true;
  });

  /* utilidades para encostar peças na lataria */
  const ray = new THREE.Raycaster();
  const hit = (o: THREE.Vector3, d: THREE.Vector3) => {
    ray.set(o, d.clone().normalize());
    const h = ray.intersectObject(body, false)[0];
    if (!h || !h.face) return null;
    const n = h.face.normal.clone();
    if (n.dot(d) > 0) n.negate();
    return { p: h.point, n };
  };
  /** Orienta um objeto com o eixo z local na normal da superfície. */
  const stick = (o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3, off = 0, up = V(0, 1, 0)) => {
    o.position.copy(p).addScaledVector(n, off);
    const m = new THREE.Matrix4().lookAt(V(0, 0, 0), n.clone().negate(), up);
    o.quaternion.setFromRotationMatrix(m);
    car.add(o);
  };
  const decalM = (tex: THREE.Texture, rough = 0.3, metal = 0.2) =>
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

  /* rodas */
  const tireG = tireGeometry(), hubG = hubcapGeometry();
  const steelG = new THREE.CylinderGeometry(RIM_R, RIM_R, 0.14, 48, 1, true);
  steelG.rotateX(Math.PI / 2);
  const steelFaceG = new THREE.CircleGeometry(RIM_R, 48);
  const nutG = new THREE.CylinderGeometry(0.011, 0.011, 0.02, 6);
  nutG.rotateX(Math.PI / 2);
  const centerG = new THREE.CylinderGeometry(0.026, 0.028, 0.012, 32);
  centerG.rotateX(Math.PI / 2);
  const badge = fiatBadge();
  textures.push(badge);
  const centerFaceM = new THREE.MeshStandardMaterial({ map: badge, roughness: 0.3, metalness: 0.3 });
  const wheels: THREE.Object3D[] = [];
  for (const x of [AXLE_F, AXLE_R]) {
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      const spin = new THREE.Group();
      const tire = new THREE.Mesh(tireG, rubberM);
      tire.castShadow = true;
      const steel = new THREE.Mesh(steelG, steelM);
      const face = new THREE.Mesh(steelFaceG, steelM);
      face.position.z = 0.01;
      spin.add(tire, steel, face);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        const n = new THREE.Mesh(nutG, chromeM);
        n.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.02);
        spin.add(n);
      }
      const hub = new THREE.Mesh(hubG, capM);
      hub.position.z = TIRE_W / 2 - 0.035;
      hub.castShadow = true;
      const center = new THREE.Mesh(centerG, blackM);
      center.position.z = TIRE_W / 2 + 0.003;
      const cf = new THREE.Mesh(new THREE.CircleGeometry(0.022, 32), centerFaceM);
      cf.position.z = TIRE_W / 2 + 0.0095;
      spin.add(hub, center, cf);
      w.add(spin);
      if (s < 0) w.rotation.y = Math.PI;
      w.position.set(x, TIRE_R, TRACK * s);
      car.add(w);
      wheels.push(spin);
    }
  }

  const ready2 = ready.then(() => {
    /* retrovisores (pretos no Like) */
    const shellG = mirrorShellGeometry();
    const mirrorGlassM = new THREE.MeshStandardMaterial({ color: 0x9aa3ac, metalness: 1, roughness: 0.04 });
    for (const s of [1, -1]) {
      const base = hit(V(mapX(212), mapH(272), s * 2), V(0, 0, -s));
      if (!base) continue;
      const g = new THREE.Group();
      // braço que sai do cavalete
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.04, 0.08, 3, 0.014), blackM);
      arm.position.set(-0.01, 0.01, s * 0.03);
      const shell = new THREE.Mesh(shellG, blackM);
      shell.position.set(-0.02, 0.045, s * 0.115);
      shell.rotation.y = s * 0.06;
      shell.castShadow = true;
      if (s < 0) shell.scale.z = -1;
      const gl = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mirrorGlassM);
      gl.scale.set(0.088, 0.047, 1);
      gl.rotation.y = -Math.PI / 2;
      gl.position.set(-0.0335, 0.045, s * 0.117);
      g.add(arm, shell, gl);
      g.position.copy(base.p);
      car.add(g);
    }

    /* maçanetas: puxadores pretos com a concha escura atrás */
    const handleG = new RoundedBoxGeometry(0.16, 0.03, 0.026, 3, 0.012);
    const cupG = new THREE.CircleGeometry(1, 32);
    const cupM = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const s of [1, -1]) {
      for (const [px, py] of [[330, 293], [469, 280]]) {
        const h = hit(V(mapX(px), mapH(py), s * 2), V(0, 0, -s));
        if (!h) continue;
        const cup = new THREE.Mesh(cupG, cupM);
        cup.scale.set(0.07, 0.022, 1);
        stick(cup, h.p, h.n, 0.0015);
        const m = new THREE.Mesh(handleG, blackM);
        stick(m, h.p, h.n, 0.012);
        m.rotateZ(s * 0.03);
      }
    }

    /* limpadores do para-brisa, deitados no pé do vidro */
    const wiperPath = (x0: number, z0: number, z1: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const z = z0 + ((z1 - z0) * i) / 12;
        const x = x0 - 0.06 * Math.sin((Math.PI * i) / 12) - 0.03 * (i / 12);
        const h = hit(V(x, 3, z), V(0, -1, 0));
        if (h) pts.push(h.p.clone().add(V(0, 0.012, 0)));
      }
      return pts;
    };
    const wx = WINDSHIELD.x0 - 0.04;
    for (const [z0, z1] of [[-0.56, -0.05], [0.0, 0.5]]) {
      const pts = wiperPath(wx, z0, z1);
      if (pts.length < 4) continue;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 6), blackM);
      const blade = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(V(0.012, -0.004, 0)))), 40, 0.0045, 4), rubberM);
      car.add(tube, blade);
    }
    // limpador traseiro
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const h = hit(V(-4, 1.12 + 0.035 * t, -0.42 * t), V(1, 0, 0));
        if (h) pts.push(h.p.clone().add(V(-0.012, 0, 0)));
      }
      if (pts.length > 3) car.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.006, 6), blackM));
      const p0 = hit(V(-4, 1.12, 0), V(1, 0, 0));
      if (p0) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 20), blackM);
        cap.rotation.z = Math.PI / 2;
        cap.position.copy(p0.p).add(V(-0.012, 0, 0));
        car.add(cap);
      }
    }

    /* antena no começo do teto */
    {
      const h = hit(V(mapX(291), 3, 0), V(0, -1, 0));
      if (h) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), blackM);
        b.scale.set(1.6, 0.8, 1);
        b.position.copy(h.p);
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.004, 0.36, 8), blackM);
        a.position.copy(h.p).add(V(-0.1, 0.15, 0));
        a.rotation.z = 0.6;
        car.add(b, a);
      }
    }

    /* placas */
    const plate = plateTex(opts.plate ?? "");
    textures.push(plate);
    const plateM = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4, metalness: 0.1 });
    const plateG = new RoundedBoxGeometry(0.4, 0.13, 0.006, 2, 0.003);
    {
      const f = hit(V(4, PLATE_F.h, 0), V(-1, 0, 0));
      if (f) {
        const m = new THREE.Mesh(plateG, [blackM, blackM, blackM, blackM, plateM, blackM]);
        stick(m, f.p, f.n, 0.006);
      }
      const r = hit(V(-4, PLATE_R.h, 0), V(1, 0, 0));
      if (r) {
        const m = new THREE.Mesh(plateG, [blackM, blackM, blackM, blackM, plateM, blackM]);
        stick(m, r.p, r.n, 0.006);
      }
    }

    /* emblemas */
    {
      const f = hit(V(4, 0.76, 0), V(-1, 0, 0));
      if (f) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.012, 40), chromeM);
        disc.rotation.x = Math.PI / 2;
        const g = new THREE.Group();
        g.add(disc);
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.04, 40), new THREE.MeshStandardMaterial({ map: badge, roughness: 0.25, metalness: 0.2 }));
        face.position.z = 0.0065;
        g.add(face);
        stick(g, f.p, f.n, 0.008);
      }
      const words: [string, number, number, number, number, Parameters<typeof wordTex>[1]][] = [
        ["FIAT", 0, 0.94, 0.26, 0.081, { size: 104, weight: 700, spacing: 8 }],
        ["MOBI", -0.34, 0.9, 0.15, 0.047, { size: 92, weight: 700, spacing: 10 }],
        ["Like", 0.34, 0.9, 0.12, 0.0375, { size: 100, weight: 600, italic: true }],
      ];
      for (const [w, z, y, sw, sh, o] of words) {
        const h = hit(V(-4, y, z), V(1, 0, 0));
        if (!h) continue;
        const tex = wordTex(w, o);
        textures.push(tex);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), decalM(tex, 0.25, 0.15));
        stick(m, h.p, h.n, 0.003);
      }
    }

    /* interior: painel, volante, bancos (aparecem pelos vidros) */
    {
      const dash = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.22, 1.32, 3, 0.05), dashM);
      dash.position.set(0.62, 0.92, 0);
      dash.rotation.z = -0.25;
      const top = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 1.3, 2, 0.025), dashM);
      top.position.set(0.55, 1.03, 0);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.016, 10, 40), blackM);
      wheel.position.set(0.36, 1.0, -0.36);
      wheel.rotation.y = Math.PI / 2;
      wheel.rotation.x = 0.0;
      wheel.rotateX(-0.45);
      const hubW = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 20), blackM);
      hubW.position.copy(wheel.position);
      hubW.rotation.z = Math.PI / 2 - 0.45;
      car.add(dash, top, wheel, hubW);
      const seat = (x: number, z: number, w: number) => {
        const g = new THREE.Group();
        const c = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.13, w, 3, 0.05), fabricM);
        c.position.set(0, 0.5, 0);
        const b = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.58, w, 3, 0.05), fabricM);
        b.position.set(-0.24, 0.8, 0);
        b.rotation.z = 0.2;
        g.add(c, b);
        const heads = w > 0.7 ? [-w / 3, 0, w / 3] : [0];
        for (const hz of heads) {
          const hr = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.16, 0.24, 3, 0.04), fabricM);
          hr.position.set(-0.33, 1.16, hz);
          hr.rotation.z = 0.2;
          g.add(hr);
        }
        g.position.set(x, 0, z);
        car.add(g);
      };
      seat(0.12, -0.36, 0.5);
      seat(0.12, 0.36, 0.5);
      seat(-0.72, 0, 1.18);
    }
  });

  /* sombra no chão */
  const shadowM = new THREE.ShadowMaterial({ opacity: 0.22 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), shadowM);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  car.add(ground);
  const blob = canvasTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,.6)"); g.addColorStop(0.6, "rgba(0,0,0,.3)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  textures.push(blob);
  const blobM = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false });
  const under = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.95), blobM);
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.002;
  car.add(under);
  for (const x of [AXLE_F, AXLE_R])
    for (const s of [1, -1]) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), blobM);
      c.rotation.x = -Math.PI / 2;
      c.position.set(x, 0.003, TRACK * s);
      car.add(c);
    }

  /* câmera e vistas */
  const VIEWS: Record<MobiView, [number, number, number]> = { tq: [4.6, 1.55, 4.3], fr: [1, 0.12, 0], sd: [0, 0.1, 1], bk: [-1, 0.16, 0.0001], tp: [0.15, 1, 0.06] };
  let baseR = 7;
  function fit() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = cam.aspect < 0.8 ? 38 : 30;
    cam.updateProjectionMatrix();
    const t = Math.tan((cam.fov * Math.PI) / 360);
    baseR = Math.max((cam.aspect < 0.8 ? 4.0 : 4.5) / (2 * t * cam.aspect), 2.4 / (2 * t)) * 1.05;
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
    lightsU.value += (lightT - lightsU.value) * 0.12;
    ctl.update();
    R.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    ready: ready2,
    look(dir, fov, dist) {
      tw = null;
      ctl.autoRotate = false;
      if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      const t = Math.tan((cam.fov * Math.PI) / 360);
      cam.position.copy(TGT).add(V(...dir).normalize().multiplyScalar(dist ?? 4.4 / (2 * t)));
      ctl.update();
      R.render(scene, cam);
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
      paint.set(hex);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctl.removeEventListener("start", onStart);
      ctl.dispose();
      const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geos.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => mats.add(m));
        }
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      pm.dispose();
      R.dispose();
    },
  };
}
