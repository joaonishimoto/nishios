import * as THREE from "three";
import type { Home } from "./types";

/**
 * Os gatos da casa: Maki e Gojo. Cada um é feito de formas simples (algumas centenas de
 * triângulos) e anda sozinho pelos cômodos, desviando de paredes, louças e móveis.
 */
export interface CatInfo {
  id: string;
  name: string;
  /** Pelo, manchas e onde ele começa. */
  fur: string;
  patch: string;
  /** Maki tem as costas cinza; Gojo, manchas soltas cinza-alaranjadas. */
  pattern: "costas" | "manchas";
  start: [number, number];
}

export const CATS: CatInfo[] = [
  { id: "maki", name: "Maki", fur: "#f4f2ee", patch: "#a7a6a4", pattern: "costas", start: [3.4, 4.4] },
  { id: "gojo", name: "Gojo", fur: "#f6f3ee", patch: "#b8916b", pattern: "manchas", start: [8.2, 1.6] },
];

const SCALE = 1.25;
const SPEED = 0.38;
const CELL = 0.08;

// ---------- Modelo ----------

interface CatRig {
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Object3D[];
  tail: THREE.Group;
  head: THREE.Group;
}

function buildCat(info: CatInfo, shadows: boolean): CatRig {
  const fur = new THREE.MeshStandardMaterial({ color: info.fur, roughness: 0.95 });
  const patch = new THREE.MeshStandardMaterial({ color: info.patch, roughness: 0.95 });
  const pink = new THREE.MeshStandardMaterial({ color: "#e8a3a3", roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: "#2b2b2b", roughness: 0.5 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadows;
    parent.add(m);
    return m;
  };
  const ellipsoid = (rx: number, ry: number, rz: number) => {
    const g = new THREE.SphereGeometry(1, 16, 12);
    g.scale(rx, ry, rz);
    return g;
  };

  // Corpo (o gato olha para +z)
  mesh(ellipsoid(0.085, 0.075, 0.16), fur, body, 0, 0.16, 0);
  if (info.pattern === "costas") {
    mesh(ellipsoid(0.055, 0.03, 0.12), patch, body, 0, 0.212, -0.025);
  } else {
    mesh(ellipsoid(0.05, 0.035, 0.06), patch, body, 0.035, 0.205, -0.05);
    mesh(ellipsoid(0.04, 0.03, 0.045), patch, body, -0.05, 0.18, 0.06);
  }

  // Cabeça
  const head = new THREE.Group();
  head.position.set(0, 0.23, 0.15);
  body.add(head);
  mesh(ellipsoid(0.065, 0.058, 0.06), fur, head);
  mesh(ellipsoid(0.03, 0.022, 0.025), fur, head, 0, -0.018, 0.05);
  mesh(new THREE.SphereGeometry(0.007, 8, 6), pink, head, 0, -0.008, 0.073);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.022, 0.045, 4), s > 0 && info.pattern === "manchas" ? patch : fur, head, s * 0.035, 0.055, -0.005);
    ear.rotation.z = -s * 0.25;
    mesh(new THREE.SphereGeometry(0.008, 8, 6), dark, head, s * 0.024, 0.01, 0.052);
  }
  if (info.pattern === "manchas") mesh(ellipsoid(0.03, 0.022, 0.03), patch, head, 0.03, 0.03, 0.025);

  // Patas, com o pivô no ombro para balançar
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[0.045, 0.09], [-0.045, 0.09], [0.045, -0.09], [-0.045, -0.09]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.13, z);
    body.add(pivot);
    mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.13, 8), fur, pivot, 0, -0.065, 0);
    legs.push(pivot);
  }

  // Rabo em três gomos
  const tail = new THREE.Group();
  tail.position.set(0, 0.19, -0.15);
  body.add(tail);
  let joint: THREE.Object3D = tail;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.set(0, 0, -0.07);
    joint.add(seg);
    const m = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.075, 8), i === 2 && info.pattern === "manchas" ? patch : fur, seg, 0, 0, -0.035);
    m.rotation.x = Math.PI / 2;
    seg.rotation.x = -0.35;
    joint = seg;
  }

  root.scale.setScalar(SCALE);
  return { root, body, legs, tail, head };
}

// ---------- Onde dá para andar ----------

export interface Grid {
  minX: number;
  minZ: number;
  cols: number;
  rows: number;
  free: Uint8Array;
}

export function buildGrid(home: Home): Grid {
  const rects = home.rooms.filter((r) => !r.outdoor).flatMap((r) => r.rects);
  const minX = Math.min(...rects.map(([x]) => x)) - 0.1;
  const minZ = Math.min(...rects.map(([, z]) => z)) - 0.1;
  const maxX = Math.max(...rects.map(([x, , w]) => x + w)) + 0.1;
  const maxZ = Math.max(...rects.map(([, z, , d]) => z + d)) + 0.1;
  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxZ - minZ) / CELL);
  const free = new Uint8Array(cols * rows);

  // Paredes cheias (janelas também), sem as portas, com a folga do corpo do gato.
  const blocks: [number, number, number, number][] = [];
  const clear = 0.12;
  for (const wall of home.walls) {
    const cuts = [...(wall.gaps ?? [])].sort((a, b) => a[0] - b[0]);
    let start = wall.from;
    const seg = (a: number, b: number) => {
      if (b - a <= 0) return;
      if (wall.axis === "x") blocks.push([a - clear, wall.at - clear, b + clear, wall.at + clear]);
      else blocks.push([wall.at - clear, a - clear, wall.at + clear, b + clear]);
    };
    for (const [a, b] of cuts) {
      seg(start, a);
      start = b;
    }
    seg(start, wall.to);
  }
  for (const piece of home.pieces) {
    if (piece.roomId === "externa") continue;
    for (const p of piece.parts) blocks.push([p.x - 0.08, p.z - 0.08, p.x + p.w + 0.08, p.z + p.d + 0.08]);
  }

  const inRoom = (x: number, z: number) =>
    rects.some(([rx, rz, w, d]) => x > rx - 0.07 && x < rx + w + 0.07 && z > rz - 0.07 && z < rz + d + 0.07);
  const blocked = (x: number, z: number) => blocks.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * CELL;
      const z = minZ + (r + 0.5) * CELL;
      free[r * cols + c] = inRoom(x, z) && !blocked(x, z) ? 1 : 0;
    }
  }
  return { minX, minZ, cols, rows, free };
}

const cellOf = (g: Grid, x: number, z: number) => {
  const c = Math.min(g.cols - 1, Math.max(0, Math.floor((x - g.minX) / CELL)));
  const r = Math.min(g.rows - 1, Math.max(0, Math.floor((z - g.minZ) / CELL)));
  return r * g.cols + c;
};
const centerOf = (g: Grid, i: number): [number, number] => [
  g.minX + ((i % g.cols) + 0.5) * CELL,
  g.minZ + (Math.floor(i / g.cols) + 0.5) * CELL,
];

/** Caminho mais curto (busca em largura, 8 vizinhos) até cada célula alcançável. */
function bfs(g: Grid, from: number): Int32Array {
  const prev = new Int32Array(g.free.length).fill(-2);
  prev[from] = -1;
  const queue = [from];
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const c = i % g.cols;
    const r = Math.floor(i / g.cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
        const n = nr * g.cols + nc;
        // Diagonal só quando os dois lados estão livres, para não cortar quina de parede.
        if (prev[n] !== -2 || !g.free[n] || (dr && dc && (!g.free[r * g.cols + nc] || !g.free[nr * g.cols + c]))) continue;
        prev[n] = i;
        queue.push(n);
      }
    }
  }
  return prev;
}

/** A célula livre mais perto de um ponto, para quando o gato fica fora da grade. */
function nearestFree(g: Grid, x: number, z: number): number {
  const start = cellOf(g, x, z);
  if (g.free[start]) return start;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < g.free.length; i++) {
    if (!g.free[i]) continue;
    const [cx, cz] = centerOf(g, i);
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// ---------- Comportamento ----------

type Pose = "andando" | "parado" | "sentado" | "deitado";

export interface Cat {
  info: CatInfo;
  rig: CatRig;
  /** Posição no chão, usada também pela etiqueta com o nome. */
  pos: THREE.Vector3;
  heading: number;
  path: [number, number][];
  pose: Pose;
  wait: number;
  phase: number;
}

/** `positions` são os vetores que as etiquetas com o nome acompanham. */
export function createCats(group: THREE.Group, grid: Grid, positions: THREE.Vector3[], rand = Math.random): Cat[] {
  return CATS.map((info, i) => {
    const rig = buildCat(info, true);
    group.add(rig.root);
    const [x, z] = centerOf(grid, nearestFree(grid, info.start[0], info.start[1]));
    const cat: Cat = {
      info, rig, pos: positions[i].set(x, 0, z), heading: rand() * Math.PI * 2,
      path: [], pose: "sentado", wait: 1 + rand() * 3, phase: rand() * 10,
    };
    applyPose(cat);
    return cat;
  });
}

/** Põe o gato em outra grade (a casa mudou) sem perder o lugar dele. */
export function regrid(cats: Cat[], grid: Grid) {
  for (const cat of cats) {
    const [x, z] = centerOf(grid, nearestFree(grid, cat.pos.x, cat.pos.z));
    cat.pos.set(x, 0, z);
    cat.path = [];
    cat.pose = "sentado";
    cat.wait = 1;
    applyPose(cat);
  }
}

function pickTarget(cat: Cat, grid: Grid, rand: () => number) {
  const from = cellOf(grid, cat.pos.x, cat.pos.z);
  const prev = bfs(grid, grid.free[from] ? from : nearestFree(grid, cat.pos.x, cat.pos.z));
  const reachable: number[] = [];
  for (let i = 0; i < prev.length; i++) if (prev[i] !== -2) reachable.push(i);
  // Prefere ir longe, para atravessar cômodos.
  let target = reachable[Math.floor(rand() * reachable.length)];
  for (let k = 0; k < 3; k++) {
    const t = reachable[Math.floor(rand() * reachable.length)];
    const [tx, tz] = centerOf(grid, t);
    const [bx, bz] = centerOf(grid, target);
    if (Math.hypot(tx - cat.pos.x, tz - cat.pos.z) > Math.hypot(bx - cat.pos.x, bz - cat.pos.z)) target = t;
  }
  const path: [number, number][] = [];
  for (let i = target; i >= 0 && prev[i] !== -1; i = prev[i]) path.push(centerOf(grid, i));
  path.reverse();
  // Pula células em linha reta para o caminho ficar suave.
  cat.path = path.filter((_, i) => i % 3 === 2 || i === path.length - 1);
}

export function stepCats(cats: Cat[], grid: Grid, dt: number, rand = Math.random) {
  for (const cat of cats) {
    cat.phase += dt;
    if (cat.pose !== "andando") {
      cat.wait -= dt;
      if (cat.wait <= 0) {
        pickTarget(cat, grid, rand);
        cat.pose = cat.path.length ? "andando" : "sentado";
        cat.wait = 2;
      }
    } else {
      const next = cat.path[0];
      if (!next) {
        const roll = rand();
        cat.pose = roll < 0.4 ? "sentado" : roll < 0.75 ? "deitado" : "parado";
        cat.wait = cat.pose === "deitado" ? 6 + rand() * 8 : 2 + rand() * 4;
      } else {
        const dx = next[0] - cat.pos.x;
        const dz = next[1] - cat.pos.z;
        const dist = Math.hypot(dx, dz);
        const step = SPEED * dt;
        if (dist <= step) {
          cat.pos.x = next[0];
          cat.pos.z = next[1];
          cat.path.shift();
        } else {
          cat.pos.x += (dx / dist) * step;
          cat.pos.z += (dz / dist) * step;
        }
        // Vira aos poucos para o lado em que anda.
        const want = Math.atan2(dx, dz);
        let diff = want - cat.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        cat.heading += diff * Math.min(1, dt * 8);
      }
    }
    applyPose(cat);
  }
}

/** Gatos parados (planta, movimento reduzido): sentados no lugar onde estão. */
export function restCats(cats: Cat[]) {
  for (const cat of cats) {
    if (cat.pose === "andando") cat.pose = "sentado";
    cat.path = [];
    applyPose(cat, true);
  }
}

function applyPose(cat: Cat, still = false) {
  const { rig, pose } = cat;
  const t = still ? 0 : cat.phase;
  rig.root.position.set(cat.pos.x, 0, cat.pos.z);
  rig.root.rotation.y = cat.heading;
  rig.body.position.y = 0;
  rig.body.rotation.x = 0;
  rig.head.rotation.set(0, 0, 0);
  const walking = pose === "andando";
  rig.legs.forEach((leg, i) => {
    leg.visible = pose !== "deitado";
    leg.rotation.x = walking ? Math.sin(t * 11 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 : 0;
  });
  if (walking) rig.body.position.y = Math.abs(Math.sin(t * 11)) * 0.006;
  if (pose === "sentado") {
    rig.body.rotation.x = -0.45;
    rig.body.position.y = 0.02;
    rig.legs[2].visible = rig.legs[3].visible = false;
  }
  if (pose === "deitado") rig.body.position.y = -0.09;
  if (pose === "parado" || pose === "deitado") rig.head.rotation.y = Math.sin(t * 0.7) * 0.5;
  rig.tail.rotation.y = Math.sin(t * (walking ? 3 : 1.4)) * (pose === "deitado" ? 0.2 : 0.45);
  rig.tail.rotation.x = walking ? 0.25 : pose === "deitado" ? -0.6 : 0;
}
