import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Fixture } from "./types";

/**
 * Louças com forma de verdade, em vez de blocos: vaso com caixa acoplada, pia com cuba oval,
 * bancada com cuba de inox, tanque e box com vidro e chuveiro. Tudo é montado de frente,
 * com as costas na parede, e depois girado para a parede indicada na peça.
 */
export interface FixtureMaterials {
  porcelain: THREE.Material;
  basin: THREE.Material;
  stone: THREE.Material;
  cabinet: THREE.Material;
  seam: THREE.Material;
  metal: THREE.Material;
  glass: THREE.Material;
}

export interface FixtureOptions {
  /** Altura máxima de vidro e chuveiro, para não esconder o resto da casa. */
  maxHeight: number;
  shadows: boolean;
}

type Add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => THREE.Mesh;

export function buildFixture(f: Fixture, mats: FixtureMaterials, opts: FixtureOptions): THREE.Group {
  const group = new THREE.Group();
  const add: Add = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = opts.shadows && mat !== mats.glass;
    mesh.receiveShadow = opts.shadows;
    group.add(mesh);
    return mesh;
  };

  if (f.kind === "box") {
    buildShower(f, mats, opts, add);
    return group;
  }

  // Largura (W) ao longo da parede e fundo (D) saindo dela, com as costas em z = -D/2.
  const sideways = f.wall === "w" || f.wall === "e";
  const W = sideways ? f.d : f.w;
  const D = sideways ? f.w : f.d;
  if (f.kind === "vaso") buildToilet(W, D, mats, add);
  else if (f.kind === "lavatorio") buildVanity(W, D, mats, add);
  else if (f.kind === "tanque") buildLaundrySink(W, D, mats, add);
  else buildCounter(W, D, mats, add);

  group.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[f.wall];
  group.position.set(f.x + f.w / 2, 0, f.z + f.d / 2);
  return group;
}

/** Elipse (cilindro achatado no fundo). */
function oval(rx: number, rz: number, h: number, segments = 40) {
  const geo = new THREE.CylinderGeometry(rx, rx, h, segments);
  geo.scale(1, 1, rz / rx);
  return geo;
}

function faucet(mats: FixtureMaterials, add: Add, x: number, top: number, z: number, reach: number) {
  add(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 16), mats.metal, x, top + 0.08, z);
  const spout = add(new THREE.CylinderGeometry(0.012, 0.012, reach, 12), mats.metal, x, top + 0.155, z + reach / 2);
  spout.rotation.x = Math.PI / 2;
}

function buildToilet(W: number, D: number, mats: FixtureMaterials, add: Add) {
  const back = -D / 2;
  // Caixa acoplada
  add(new RoundedBoxGeometry(W * 0.92, 0.36, 0.17, 3, 0.03), mats.porcelain, 0, 0.6, back + 0.1);
  add(new RoundedBoxGeometry(W * 0.96, 0.03, 0.19, 2, 0.012), mats.porcelain, 0, 0.795, back + 0.1);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 20), mats.metal, 0, 0.815, back + 0.1);
  // Pé e bacia ovais
  const bowlZ = back + 0.19 + (D - 0.19) / 2;
  const bowlRz = (D - 0.19) / 2;
  const foot = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 32);
  foot.scale(1, 1, 1.3);
  add(foot, mats.porcelain, 0, 0.15, bowlZ - 0.03);
  add(oval(W / 2 - 0.01, bowlRz, 0.1), mats.porcelain, 0, 0.35, bowlZ);
  // Assento e tampa
  add(oval(W / 2 - 0.02, bowlRz - 0.01, 0.025), mats.porcelain, 0, 0.415, bowlZ);
  add(oval(W / 2 - 0.07, bowlRz - 0.07, 0.003), mats.basin, 0, 0.429, bowlZ + 0.01);
}

function buildVanity(W: number, D: number, mats: FixtureMaterials, add: Add) {
  const back = -D / 2;
  // Gabinete recuado e tampo de granito
  add(new THREE.BoxGeometry(W - 0.04, 0.62, D - 0.06), mats.cabinet, 0, 0.47, back + (D - 0.06) / 2);
  add(new THREE.BoxGeometry(0.006, 0.56, 0.004), mats.seam, 0, 0.47, back + D - 0.058);
  add(new THREE.BoxGeometry(W, 0.03, D), mats.stone, 0, 0.795, 0);
  // Cuba oval de sobrepor
  const cz = back + D * 0.55;
  add(oval(Math.min(0.22, W / 2 - 0.06), 0.16, 0.05), mats.porcelain, 0, 0.835, cz);
  add(oval(Math.min(0.19, W / 2 - 0.09), 0.13, 0.004), mats.basin, 0, 0.861, cz);
  faucet(mats, add, 0, 0.81, back + 0.07, 0.11);
}

function buildLaundrySink(W: number, D: number, mats: FixtureMaterials, add: Add) {
  const back = -D / 2;
  // Coluna e tanque
  add(new RoundedBoxGeometry(W * 0.36, 0.58, D * 0.5, 2, 0.03), mats.porcelain, 0, 0.29, back + D * 0.3);
  add(new RoundedBoxGeometry(W, 0.28, D, 3, 0.025), mats.porcelain, 0, 0.72, 0);
  // Cuba funda e esfregador com frisos
  add(new THREE.BoxGeometry(W - 0.1, 0.004, D * 0.48), mats.basin, 0, 0.862, back + D * 0.3);
  for (let i = 0; i < 5; i++) {
    add(new THREE.BoxGeometry(W - 0.12, 0.008, 0.012), mats.basin, 0, 0.862, back + D * 0.62 + i * 0.03);
  }
  faucet(mats, add, 0, 0.86, back + 0.02, 0.1);
}

function buildCounter(W: number, D: number, mats: FixtureMaterials, add: Add) {
  const back = -D / 2;
  // Rodapé recuado, armário com portas e tampo de pedra
  add(new THREE.BoxGeometry(W - 0.02, 0.1, D - 0.1), mats.seam, 0, 0.05, back + (D - 0.1) / 2);
  add(new THREE.BoxGeometry(W - 0.02, 0.74, D - 0.04), mats.cabinet, 0, 0.47, back + (D - 0.04) / 2);
  const doors = Math.max(2, Math.round(W / 0.4));
  for (let i = 1; i < doors; i++) {
    const x = -W / 2 + (W / doors) * i;
    add(new THREE.BoxGeometry(0.006, 0.7, 0.004), mats.seam, x, 0.47, back + D - 0.038);
  }
  add(new THREE.BoxGeometry(W, 0.04, D), mats.stone, 0, 0.86, 0);
  // Cuba de inox no meio
  const sinkW = Math.min(0.5, W * 0.6);
  add(new THREE.BoxGeometry(sinkW, 0.006, 0.38), mats.metal, 0, 0.881, back + 0.3);
  add(new THREE.BoxGeometry(sinkW - 0.04, 0.006, 0.34), mats.basin, 0, 0.883, back + 0.3);
  faucet(mats, add, 0, 0.88, back + 0.06, 0.16);
}

/** Box: piso do box, vidro nos lados abertos e chuveiro na parede. Montado direto na planta. */
function buildShower(f: Fixture, mats: FixtureMaterials, opts: FixtureOptions, add: Add) {
  const cx = f.x + f.w / 2;
  const cz = f.z + f.d / 2;
  add(new THREE.BoxGeometry(f.w, 0.03, f.d), mats.porcelain, cx, 0.015, cz);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 20), mats.metal, cx, 0.032, cz);

  const h = Math.min(1.9, opts.maxHeight);
  const t = 0.012;
  const panel = (horizontal: boolean, at: number) => {
    const len = horizontal ? f.w : f.d;
    const g = add(new THREE.BoxGeometry(horizontal ? len : t, h, horizontal ? t : len), mats.glass, 0, h / 2, 0);
    const rail = add(new THREE.BoxGeometry(horizontal ? len : 0.02, 0.02, horizontal ? 0.02 : len), mats.metal, 0, h, 0);
    for (const m of [g, rail]) {
      if (horizontal) m.position.set(cx, m.position.y, at);
      else m.position.set(at, m.position.y, cz);
    }
  };
  for (const side of f.glass ?? []) {
    if (side === "n") panel(true, f.z + t / 2);
    if (side === "s") panel(true, f.z + f.d - t / 2);
    if (side === "w") panel(false, f.x + t / 2);
    if (side === "e") panel(false, f.x + f.w - t / 2);
  }

  // Chuveiro: cano na parede e ducha redonda. Some quando as paredes estão baixas (foco).
  const top = Math.min(2.05, opts.maxHeight + 0.05);
  if (top < 1.2) return;
  const inset = 0.03;
  const [hx, hz, dx, dz] = {
    n: [cx, f.z + inset, 0, 1],
    s: [cx, f.z + f.d - inset, 0, -1],
    w: [f.x + inset, cz, 1, 0],
    e: [f.x + f.w - inset, cz, -1, 0],
  }[f.wall];
  add(new THREE.CylinderGeometry(0.012, 0.012, top - 1.0, 12), mats.metal, hx, 1.0 + (top - 1.0) / 2, hz);
  const arm = add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12), mats.metal, hx + dx * 0.11, top, hz + dz * 0.11);
  arm.rotation.set(dz ? Math.PI / 2 : 0, 0, dx ? Math.PI / 2 : 0);
  add(new THREE.CylinderGeometry(0.1, 0.08, 0.025, 28), mats.metal, hx + dx * 0.22, top - 0.02, hz + dz * 0.22);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16), mats.metal, hx + dx * 0.02, 1.1, hz + dz * 0.02);
}
