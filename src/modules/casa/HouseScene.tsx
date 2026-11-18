import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/cn";
import { CATS, buildGrid, createCats, regrid, restCats, stepCats, type Cat, type CatInfo, type Grid } from "./cats";
import { buildFixture } from "./fixtures";
import { homeBox, pieceTop, roomBox, type Box } from "./logic";
import { paletteFor, type Palette } from "./palette";
import type { Home, Room, ViewMode } from "./types";

/** Altura das paredes: cheia no 3D, baixa com um cômodo em foco (para ver dentro), e mínima na planta. */
const WALL_3D = 1.35;
const WALL_FOCUS = 0.3;
const WALL_PLAN = 0.45;
const WALL_THICKNESS = 0.1;
/** Móveis no chão não passam desta altura, para não esconder o resto da casa. */
const FURNITURE_CAP_3D = 1.25;
const FURNITURE_CAP_PLAN = 0.42;

const DIR_OVERVIEW = new THREE.Vector3(5.8, 12, 11.2).normalize();
const DIR_FOCUS = new THREE.Vector3(2.6, 7.6, 5.2).normalize();
const DIR_PLAN = new THREE.Vector3(0, 1, 0.0001).normalize();
const FOV = 36;

export interface HouseSceneProps {
  home: Home;
  mode: ViewMode;
  dark: boolean;
  focusId: string | null;
  selectedPieceId: string | null;
  /** Mostra as cotas (largura e profundidade) dos cômodos. */
  dims?: boolean;
  onPickRoom: (roomId: string) => void;
  onPickPiece: (pieceId: string) => void;
  className?: string;
}

interface Label {
  id: string;
  text: string;
  pos: THREE.Vector3;
  active: boolean;
  /** Cota: texto pequeno, sem clique, e some primeiro quando encosta em outra etiqueta. */
  dim?: boolean;
  /** Gato: nome no 3D e rosto na planta. A etiqueta fica `lift` metros acima de `pos`. */
  cat?: CatInfo;
  lift?: number;
  onClick?: () => void;
}

interface Engine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  group: THREE.Group;
  persp: THREE.PerspectiveCamera;
  ortho: THREE.OrthographicCamera;
  perspControls: OrbitControls;
  orthoControls: OrbitControls;
  mode: ViewMode;
  /** Metade da altura visível da câmera da planta, com zoom 1. */
  orthoHalf: number;
  anim: number;
  render: () => void;
  catGroup: THREE.Group;
  cats: Cat[];
  grid: Grid | null;
}

export default function HouseScene(props: HouseSceneProps) {
  const { home, mode, dark, focusId, selectedPieceId, dims = false, className } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const labelEls = useRef(new Map<string, HTMLButtonElement>());
  const labelsRef = useRef<Label[]>([]);
  // Vetores que os gatos atualizam a cada passo; as etiquetas com o nome seguem esses vetores.
  const catPositions = useRef(CATS.map((c) => new THREE.Vector3(c.start[0], 0, c.start[1])));
  const propsRef = useRef(props);
  propsRef.current = props;

  const box = useMemo(() => homeBox(home), [home]);

  const labels = useMemo<Label[]>(() => {
    const dimLabels = dims ? roomDims(home.rooms, focusId).map((d) => d.label) : [];
    const catLabels: Label[] = CATS.map((info, i) => ({
      id: `g-${info.id}`,
      text: info.name,
      pos: catPositions.current[i],
      lift: mode === "planta" ? 0.5 : 0.62,
      active: false,
      cat: info,
    }));
    return [...nameLabels(), ...dimLabels, ...catLabels];
  }, [home, mode, focusId, selectedPieceId, dims]);

  function nameLabels(): Label[] {
    const wall = mode === "planta" ? 0 : WALL_3D + 0.35;
    if (!focusId) {
      return home.rooms
        .filter((r) => r.id !== "circ")
        .map((r) => ({
          id: `r-${r.id}`,
          text: r.name,
          pos: new THREE.Vector3(r.label[0], wall, r.label[1]),
          active: false,
          onClick: () => propsRef.current.onPickRoom(r.id),
        }));
    }
    const cap = mode === "planta" ? FURNITURE_CAP_PLAN : FURNITURE_CAP_3D;
    return home.pieces
      .filter((p) => p.roomId === focusId && !p.fixed && !p.parts.every((part) => part.m === "tapete"))
      .map((p) => {
        const [x, y, z] = pieceTop(p, cap);
        return {
          id: `p-${p.id}`,
          text: p.name,
          pos: new THREE.Vector3(x, y + 0.18, z),
          active: p.id === selectedPieceId,
          onClick: () => propsRef.current.onPickPiece(p.id),
        };
      });
  }
  labelsRef.current = labels;

  // Cria o renderizador, as câmeras e os controles uma vez só.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "absolute inset-0 size-full touch-none";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const catGroup = new THREE.Group();
    scene.add(group, catGroup);
    const persp = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    const perspControls = new OrbitControls(persp, renderer.domElement);
    perspControls.maxPolarAngle = 1.25;
    perspControls.minDistance = 2.5;
    perspControls.maxDistance = 45;
    perspControls.zoomSpeed = 0.8;

    const orthoControls = new OrbitControls(ortho, renderer.domElement);
    orthoControls.enableRotate = false;
    orthoControls.screenSpacePanning = true;
    orthoControls.minZoom = 0.6;
    orthoControls.maxZoom = 8;
    orthoControls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    orthoControls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };

    const engine: Engine = {
      renderer,
      scene,
      group,
      persp,
      ortho,
      perspControls,
      orthoControls,
      mode: propsRef.current.mode,
      orthoHalf: 5,
      anim: 0,
      catGroup,
      cats: [],
      grid: null,
      render: () => {
        const cam = engine.mode === "planta" ? ortho : persp;
        renderer.render(scene, cam);
        placeLabels(cam, renderer.domElement, labelsRef.current, labelEls.current);
      },
    };
    engineRef.current = engine;
    perspControls.addEventListener("change", engine.render);
    orthoControls.addEventListener("change", engine.render);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      persp.aspect = w / h;
      persp.updateProjectionMatrix();
      setOrthoFrustum(engine, w / h);
      engine.render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // Clique (sem arrastar) escolhe cômodo ou móvel.
    const raycaster = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const pick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, engine.mode === "planta" ? ortho : persp);
      const hit = raycaster
        .intersectObjects(group.children, false)
        .find((i) => i.object.userData.roomId && !i.object.userData.dimmed);
      return hit?.object.userData as { roomId: string; pieceId?: string } | undefined;
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      down = null;
      const hit = pick(e);
      if (!hit) return;
      const { focusId: focus, onPickPiece, onPickRoom } = propsRef.current;
      if (hit.pieceId && focus === hit.roomId) onPickPiece(hit.pieceId);
      else onPickRoom(hit.roomId);
    };
    let hoverFrame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return;
      cancelAnimationFrame(hoverFrame);
      hoverFrame = requestAnimationFrame(() => {
        renderer.domElement.style.cursor = pick(e) ? "pointer" : "";
      });
    };
    // Os gatos andam a 30 quadros por segundo, só no 3D, com a casa na tela e a aba aberta.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    io.observe(host);
    let catFrame = 0;
    let last = 0;
    const tick = (now: number) => {
      catFrame = requestAnimationFrame(tick);
      const live = engine.grid && engine.cats.length && engine.mode === "3d" && onScreen && !document.hidden && !reduced.matches;
      if (!live) {
        last = now;
        return;
      }
      if (now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      stepCats(engine.cats, engine.grid!, dt);
      engine.render();
    };
    catFrame = requestAnimationFrame(tick);

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    return () => {
      observer.disconnect();
      io.disconnect();
      cancelAnimationFrame(catFrame);
      clearGroup(catGroup);
      cancelAnimationFrame(engine.anim);
      cancelAnimationFrame(hoverFrame);
      perspControls.dispose();
      orthoControls.dispose();
      clearGroup(group);
      renderer.dispose();
      renderer.domElement.remove();
      engineRef.current = null;
    };
  }, []);

  // Monta a casa de novo sempre que os dados, a vista ou o foco mudam.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.mode = mode;
    engine.perspControls.enabled = mode === "3d";
    engine.orthoControls.enabled = mode === "planta";
    const pal = paletteFor(mode, dark);
    engine.renderer.shadowMap.enabled = pal.shadows;
    engine.scene.background = new THREE.Color(pal.background);
    buildHouse(engine.group, home, pal, mode, focusId, selectedPieceId, box, dims);
    // Na planta (e com movimento reduzido) os gatos ficam sentados onde estão.
    if (mode === "planta" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) restCats(engine.cats);
    engine.render();
  }, [home, mode, dark, focusId, selectedPieceId, box, dims]);

  // A grade de onde os gatos podem andar muda junto com a casa.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.grid = buildGrid(home);
    if (engine.cats.length) regrid(engine.cats, engine.grid);
    else engine.cats = createCats(engine.catGroup, engine.grid, catPositions.current);
    if (engine.mode === "planta") restCats(engine.cats);
    engine.render();
  }, [home]);

  // Leva a câmera até a casa inteira ou até o cômodo em foco.
  const homeKey = `${box.minX},${box.maxX},${box.minZ},${box.maxZ}`;
  const firstMove = useRef(true);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const room = focusId ? home.rooms.find((r) => r.id === focusId) : undefined;
    const target = room ? roomBox(room) : box;
    const instant =
      firstMove.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    firstMove.current = false;
    moveCamera(engine, target, !!room, instant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, focusId, homeKey]);

  // As etiquetas mudam de lugar quando a lista muda.
  useEffect(() => {
    engineRef.current?.render();
  }, [labels]);

  return (
    <div ref={hostRef} className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0">
        {labels.map((l) => (
          <button
            key={l.id}
            type="button"
            ref={(el) => {
              if (el) labelEls.current.set(l.id, el);
              else labelEls.current.delete(l.id);
            }}
            onClick={l.onClick}
            tabIndex={l.dim || l.cat ? -1 : undefined}
            style={{ visibility: "hidden" }}
            className={cn(
              "absolute top-0 left-0 whitespace-nowrap",
              l.cat
                ? mode === "planta"
                  ? "flex flex-col items-center gap-0.5 text-[11px] leading-none font-semibold text-foreground"
                  : "rounded-full bg-surface/90 px-1.5 text-[11px] leading-4 font-medium text-foreground shadow-xs"
                : l.dim
                ? "rounded-sm bg-surface/85 px-1 text-[11px] leading-4 font-semibold text-primary tabular-nums"
                : "pointer-events-auto rounded-md border px-2 py-0.5 text-xs font-medium shadow-xs transition-colors duration-(--motion-fast)",
              !l.dim &&
                !l.cat &&
                (l.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong bg-surface/95 text-foreground hover:border-primary hover:text-primary"),
            )}
          >
            {l.cat && mode === "planta" && <CatFace cat={l.cat} />}
            {l.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function setOrthoFrustum(engine: Engine, aspect: number) {
  const half = engine.orthoHalf;
  engine.ortho.left = -half * aspect;
  engine.ortho.right = half * aspect;
  engine.ortho.top = half;
  engine.ortho.bottom = -half;
  engine.ortho.updateProjectionMatrix();
}

function placeLabels(
  cam: THREE.Camera,
  canvas: HTMLCanvasElement,
  labels: Label[],
  els: Map<string, HTMLButtonElement>,
) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const v = new THREE.Vector3();
  // A etiqueta ativa entra primeiro; as outras somem quando encostam numa já colocada.
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const rank = (l: Label) => (l.active || l.cat ? 2 : l.dim ? 0 : 1);
  const ordered = [...labels].sort((a, b) => rank(b) - rank(a));
  for (const l of ordered) {
    const el = els.get(l.id);
    if (!el) continue;
    v.copy(l.pos);
    v.y += l.lift ?? 0;
    v.project(cam);
    const x = ((v.x + 1) / 2) * w;
    const y = ((1 - v.y) / 2) * h;
    const lw = el.offsetWidth + 4;
    const lh = el.offsetHeight + 2;
    const inside = v.z < 1 && x > 24 && x < w - 24 && y > 16 && y < h - 16;
    const clash = placed.some((r) => Math.abs(r.x - x) < (r.w + lw) / 2 && Math.abs(r.y - y) < (r.h + lh) / 2);
    const show = inside && !clash;
    if (show) placed.push({ x, y, w: lw, h: lh });
    el.style.visibility = show ? "visible" : "hidden";
    el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }
}

function moveCamera(engine: Engine, box: Box, focused: boolean, instant: boolean) {
  cancelAnimationFrame(engine.anim);
  const center = new THREE.Vector3((box.minX + box.maxX) / 2, focused ? 0.3 : 0, (box.minZ + box.maxZ) / 2);
  const width = box.maxX - box.minX;
  const depth = box.maxZ - box.minZ;
  const aspect = engine.persp.aspect || 1.5;

  if (engine.mode === "planta") {
    const { ortho, orthoControls } = engine;
    // A câmera da planta usa a casa inteira como referência; o foco só aumenta o zoom.
    if (!focused) {
      engine.orthoHalf = (Math.max(width / aspect, depth) / 2) * 1.12;
      setOrthoFrustum(engine, aspect);
    }
    const need = (Math.max(width / aspect, depth) / 2) * (focused ? 1.7 : 1.12);
    const zoomTo = engine.orthoHalf / need;
    const fromTarget = orthoControls.target.clone();
    const fromZoom = ortho.zoom;
    animate(engine, instant, (t) => {
      orthoControls.target.lerpVectors(fromTarget, center, t);
      ortho.zoom = fromZoom + (zoomTo - fromZoom) * t;
      ortho.position.copy(orthoControls.target).addScaledVector(DIR_PLAN, 50);
      ortho.updateProjectionMatrix();
      orthoControls.update();
    });
    return;
  }

  const { persp, perspControls } = engine;
  const dir = focused ? DIR_FOCUS : DIR_OVERVIEW;
  const fovV = THREE.MathUtils.degToRad(FOV);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
  const radius = Math.hypot(width, depth) / 2 + (focused ? 0.4 : 0.2);
  const distTo = (radius / Math.sin(Math.min(fovV, fovH) / 2)) * (focused ? 1.3 : 0.74);
  const fromTarget = perspControls.target.clone();
  const fromOffset = persp.position.clone().sub(fromTarget);
  const fromDist = fromOffset.length() || distTo;
  const fromDir = fromOffset.lengthSq() ? fromOffset.normalize() : dir.clone();
  animate(engine, instant, (t) => {
    perspControls.target.lerpVectors(fromTarget, center, t);
    const d = fromDist + (distTo - fromDist) * t;
    const v = fromDir.clone().lerp(dir, t).normalize();
    persp.position.copy(perspControls.target).addScaledVector(v, d);
    perspControls.update();
  });
}

function animate(engine: Engine, instant: boolean, step: (t: number) => void) {
  if (instant) {
    step(1);
    engine.render();
    return;
  }
  const start = performance.now();
  const duration = 520;
  const tick = (now: number) => {
    const raw = Math.min(1, (now - start) / duration);
    const t = 1 - Math.pow(1 - raw, 3);
    step(t);
    engine.render();
    if (raw < 1) engine.anim = requestAnimationFrame(tick);
  };
  engine.anim = requestAnimationFrame(tick);
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }
}

function buildHouse(
  group: THREE.Group,
  home: Home,
  pal: Palette,
  mode: ViewMode,
  focusId: string | null,
  selectedPieceId: string | null,
  box: Box,
  dims: boolean,
) {
  clearGroup(group);
  const cache = new Map<string, THREE.Material>();
  const material = (color: string, opacity = 1, roughness = 0.9, metalness = 0) => {
    const key = `${color}-${opacity}-${roughness}-${metalness}`;
    let m = cache.get(key);
    if (!m) {
      const base = { color, transparent: opacity < 1, opacity, depthWrite: opacity >= 0.6 };
      m =
        pal.shading === "standard"
          ? new THREE.MeshStandardMaterial({ ...base, roughness, metalness })
          : new THREE.MeshLambertMaterial(base);
      cache.set(key, m);
    }
    return m;
  };
  const addBox = (
    x: number, y: number, z: number, w: number, h: number, d: number,
    mat: THREE.Material, data: Record<string, unknown> = {}, cast = true,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
    mesh.castShadow = cast && pal.shadows;
    mesh.receiveShadow = pal.shadows;
    mesh.userData = data;
    group.add(mesh);
    return mesh;
  };

  // Luz
  group.add(new THREE.HemisphereLight("#ffffff", "#cfc8ba", pal.hemisphere));
  const sun = new THREE.DirectionalLight("#fff4e2", pal.sun);
  const cx = (box.minX + box.maxX) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  if (mode === "planta") sun.position.set(cx - 0.4, 16, cz + 2.8);
  else sun.position.set(box.maxX + 3, 13, box.minZ - 2);
  sun.target.position.set(cx, 0, cz);
  group.add(sun, sun.target);
  if (pal.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const span = Math.max(box.maxX - box.minX, box.maxZ - box.minZ) * 0.75 + 2;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 50 });
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
  }

  const dimOther = (roomId: string) => !!focusId && roomId !== focusId;

  // Pisos
  for (const room of home.rooms) {
    const focused = room.id === focusId;
    const color = focused && pal.focusFloor ? pal.focusFloor : pal.floor[room.floor];
    const mat = material(color, dimOther(room.id) && mode === "3d" ? 0.55 : 1);
    for (const [x, z, w, d] of room.rects) {
      addBox(x, -0.1, z, w, 0.1, d, mat, { roomId: room.id }, false);
      // O piso continua por baixo das paredes e das portas, um pouco abaixo, para não deixar frestas.
      if (!room.outdoor) addBox(x - WALL_THICKNESS / 2, -0.106, z - WALL_THICKNESS / 2, w + WALL_THICKNESS, 0.1, d + WALL_THICKNESS, mat, {}, false);
    }
  }

  // Paredes
  const wallH = mode === "planta" ? WALL_PLAN : focusId ? WALL_FOCUS : WALL_3D;
  const wallMat = material(pal.wall);
  const topMat = material(pal.wallTop);
  const T = WALL_THICKNESS;
  /** Um pedaço de parede de `a` a `b`, entre as alturas y0 e y1, com espessura t. */
  const slab = (axis: "x" | "z", at: number, a: number, b: number, y0: number, y1: number, t: number, mat: THREE.Material, top = true) => {
    if (b - a < 0.01 || y1 - y0 < 0.005) return;
    if (axis === "x") addBox(a, y0, at - t / 2, b - a, y1 - y0, t, mat);
    else addBox(at - t / 2, y0, a, t, y1 - y0, b - a, mat);
    if (top && pal.wallTop !== pal.wall) {
      if (axis === "x") addBox(a, y1, at - t / 2, b - a, 0.02, t, topMat, {}, false);
      else addBox(at - t / 2, y1, a, t, 0.02, b - a, topMat, {}, false);
    }
  };
  // Janela: peitoril baixo e vidro até o alto da parede. Na planta, o vão fica claro com uma
  // linha de vidro no meio, como no desenho da construtora.
  const sillMat = mode === "planta" ? material(pal.windowSill) : wallMat;
  const paneMat = mode === "planta" ? material(pal.highlight) : material(pal.material.vidro, 0.45, 0.1);
  const windowAt = (axis: "x" | "z", at: number, a: number, b: number) => {
    if (mode === "planta") {
      slab(axis, at, a, b, 0, wallH * 0.5, T, sillMat, false);
      slab(axis, at, a, b, 0, wallH * 0.55, 0.018, paneMat, false);
      for (const end of [a, b]) slab(axis, at, end - 0.02, end + 0.02, 0, wallH, T, wallMat, false);
      return;
    }
    const sill = wallH * 0.62;
    slab(axis, at, a, b, 0, sill, T, wallMat);
    slab(axis, at, a, b, sill, wallH, 0.02, paneMat, false);
  };
  for (const wall of home.walls) {
    const cuts = [
      ...(wall.gaps ?? []).map(([a, b]) => ({ a, b, window: false })),
      ...(wall.windows ?? []).map(([a, b]) => ({ a, b, window: true })),
    ].sort((p, q) => p.a - q.a);
    let start = wall.from;
    for (const cut of cuts) {
      slab(wall.axis, wall.at, start, cut.a, 0, wallH, T, wallMat);
      if (cut.window) windowAt(wall.axis, wall.at, cut.a, cut.b);
      start = cut.b;
    }
    slab(wall.axis, wall.at, start, wall.to, 0, wallH, T, wallMat);
  }

  // Portas: folha aberta a 90° a partir da dobradiça e, na planta, o arco de abertura.
  const doorMat = material(mode === "planta" ? pal.wall : "#f1efe9", 1, 0.6);
  const knobMat = material(pal.material.metal, 1, 0.3, 0.6);
  const swingMat = new THREE.LineBasicMaterial({ color: pal.wall, transparent: true, opacity: 0.55 });
  for (const door of home.doors ?? []) {
    const len = door.b - door.a - 0.02;
    const hinge = door.hinge === "a" ? door.a + 0.01 : door.b - 0.01;
    const away = door.hinge === "a" ? 1 : -1; // da dobradiça para a ponta solta, ao longo da parede
    const leafH = mode === "planta" ? WALL_PLAN * 0.9 : Math.min(2.1, wallH);
    const t = 0.04;
    const face = door.at + door.into * (T / 2);
    const lo = door.into > 0 ? face : face - len;
    if (door.axis === "x") {
      addBox(hinge - (away > 0 ? 0 : t), 0, lo, t, leafH, len, doorMat, {}, mode === "3d");
      if (mode === "3d") addBox(hinge - (away > 0 ? 0 : t) + (away > 0 ? t : -0.02), 0.95, lo + (door.into > 0 ? len - 0.08 : 0.04), 0.02, 0.03, 0.04, knobMat, {}, false);
    } else {
      addBox(lo, 0, hinge - (away > 0 ? 0 : t), len, leafH, t, doorMat, {}, mode === "3d");
      if (mode === "3d") addBox(lo + (door.into > 0 ? len - 0.08 : 0.04), 0.95, hinge - (away > 0 ? 0 : t) + (away > 0 ? t : -0.02), 0.04, 0.03, 0.02, knobMat, {}, false);
    }
    if (mode === "planta") {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const ang = (i / 24) * (Math.PI / 2);
        const along = hinge + away * len * Math.sin(ang);
        const out = face + door.into * len * Math.cos(ang);
        pts.push(door.axis === "x" ? new THREE.Vector3(along, 0.02, out) : new THREE.Vector3(out, 0.02, along));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), swingMat));
    }
  }

  // Móveis
  const cap = mode === "planta" ? FURNITURE_CAP_PLAN : FURNITURE_CAP_3D;
  const lineMat = new THREE.LineBasicMaterial({ color: pal.highlight });
  for (const piece of home.pieces) {
    const dim = dimOther(piece.roomId);
    const selected = piece.id === selectedPieceId;
    if (piece.fixture) {
      const fade = dim && mode === "3d" ? 0.3 : 1;
      const fixture = buildFixture(
        piece.fixture,
        {
          porcelain: material(pal.material.branco, fade, 0.35),
          basin: material(pal.basin, fade, 0.4),
          stone: material((mode === "3d" && piece.fixture.colors?.stone) || pal.material.pedra, fade, 0.55),
          cabinet: material((mode === "3d" && piece.fixture.colors?.cabinet) || pal.cabinet, fade, 0.7),
          seam: material(pal.seam, fade),
          // Na planta, metais escuros para o chuveiro e as torneiras aparecerem vistos de cima.
          metal: material(mode === "planta" ? pal.material.escuro : pal.material.metal, fade, 0.3, 0.5),
          glass: material(pal.material.vidro, 0.35, 0.1),
        },
        {
          maxHeight: mode === "planta" ? 1.9 : focusId ? WALL_FOCUS + 0.2 : WALL_3D,
          shadows: pal.shadows && !dim,
        },
      );
      // Na planta, as louças ficam achatadas: só a forma vista de cima importa.
      if (mode === "planta") fixture.scale.y = FURNITURE_CAP_PLAN / 1.9;
      fixture.traverse((o) => {
        o.userData = { roomId: piece.roomId, dimmed: dim && mode === "3d" };
      });
      group.add(fixture);
      continue;
    }
    for (const part of piece.parts) {
      let y = part.y ?? 0;
      let h = part.h;
      const glass = part.m === "vidro";
      const screen = part.m === "tela";
      const roof = part.m === "cobertura";
      const masonry = part.m === "parede";
      // O que fica no alto (pergolado, cobertura, a partir de 2 m) desce para logo acima das
      // paredes cortadas, e some com um cômodo em foco para não tampar a vista.
      if (y >= 2) {
        if (focusId) continue;
        y = (mode === "planta" ? WALL_PLAN + 0.04 : WALL_3D + 0.08) + (y - 2.4) * 0.5;
      } else if (masonry) h = wallH;
      else if (screen) h = Math.max(0.02, Math.min(y + h, mode === "planta" ? WALL_PLAN : focusId ? WALL_FOCUS + 0.3 : WALL_3D + 0.2) - y);
      // Tudo o que é baixo é cortado na mesma altura, mesmo o que começa acima do chão
      // (puxadores, TV, prateleiras), para nada atravessar o corte.
      // Com `full`, o 3D mostra a peça inteira (armário planejado, TV).
      else if (!glass && !(part.full && mode === "3d")) h = Math.max(Math.min(y + h, cap) - y, Math.min(h, 0.04));
      if (glass && mode === "planta") h = Math.min(h, WALL_PLAN);
      if (glass && focusId && !part.full) h = Math.min(h, WALL_FOCUS + 0.2);
      const see = glass ? 0.4 : screen ? 0.22 : roof ? 0.32 : dim && mode === "3d" ? 0.3 : 1;
      const color = mode === "3d" && part.c ? part.c : pal.material[part.m];
      const mesh = addBox(
        part.x, y, part.z, part.w, h, part.d,
        masonry ? wallMat : material(color, see),
        { roomId: piece.roomId, pieceId: piece.fixed ? undefined : piece.id, dimmed: dim && mode === "3d" },
        !glass && !screen && !roof && part.m !== "tapete" && !dim,
      );
      if (selected) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), lineMat);
        edges.position.copy(mesh.position);
        group.add(edges);
      }
    }
  }

  // Cotas: linha com traços nas pontas, de face a face das paredes.
  if (dims) {
    const dimMat = new THREE.LineBasicMaterial({ color: pal.highlight });
    const y = mode === "planta" ? FURNITURE_CAP_PLAN + 0.05 : 0.03;
    const pts: THREE.Vector3[] = [];
    for (const d of roomDims(home.rooms, focusId)) {
      const [a, b] = d.line;
      pts.push(new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(b[0], y, b[1]));
      const tick = 0.07;
      for (const [px, pz] of [a, b]) {
        if (d.axis === "x") pts.push(new THREE.Vector3(px, y, pz - tick), new THREE.Vector3(px, y, pz + tick));
        else pts.push(new THREE.Vector3(px - tick, y, pz), new THREE.Vector3(px + tick, y, pz));
      }
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), dimMat));
  }
}

interface RoomDim {
  axis: "x" | "z";
  line: [[number, number], [number, number]];
  label: Label;
}

const cm = (m: number) => String(Math.round(m * 100));

/** Largura e profundidade de cada retângulo dos cômodos internos, como as cotas da planta. */
function roomDims(rooms: Room[], focusId: string | null): RoomDim[] {
  const out: RoomDim[] = [];
  for (const room of rooms) {
    if (room.outdoor || (focusId && room.id !== focusId)) continue;
    room.rects.forEach(([x, z, w, d], i) => {
      const inset = Math.min(0.22, d / 4);
      const zLine = z + d - inset;
      const xLine = x + w - Math.min(0.22, w / 4);
      out.push({
        axis: "x",
        line: [[x, zLine], [x + w, zLine]],
        label: { id: `d-${room.id}-${i}-w`, text: cm(w), pos: new THREE.Vector3(x + w / 2, 0, zLine), active: false, dim: true },
      });
      out.push({
        axis: "z",
        line: [[xLine, z], [xLine, z + d]],
        label: { id: `d-${room.id}-${i}-d`, text: cm(d), pos: new THREE.Vector3(xLine, 0, z + d / 2), active: false, dim: true },
      });
    });
  }
  return out;
}

/** Rosto do gato na planta, com as cores dele. */
function CatFace({ cat }: { cat: CatInfo }) {
  const id = `face-${cat.id}`;
  return (
    <svg viewBox="0 0 44 40" className="size-10 drop-shadow-sm" aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d="M6 6 L15 14 Q22 11 29 14 L38 6 L38 22 Q38 36 22 36 Q6 36 6 22 Z" />
        </clipPath>
      </defs>
      <path d="M6 6 L15 14 Q22 11 29 14 L38 6 L38 22 Q38 36 22 36 Q6 36 6 22 Z" fill={cat.fur} stroke="#9a948a" strokeWidth="1.2" strokeLinejoin="round" />
      <g clipPath={`url(#${id})`}>
        {cat.pattern === "costas" ? (
          <path d="M0 0 H44 V11 L36 11 L38 6 L30 12 L14 12 L6 6 L8 11 L0 11 Z" fill={cat.patch} />
        ) : (
          <>
            <path d="M24 0 H44 V20 Q36 24 30 18 Q26 12 24 0 Z" fill={cat.patch} />
            <circle cx="12" cy="31" r="3" fill={cat.patch} />
          </>
        )}
      </g>
      <path d="M6 6 L15 14 Q22 11 29 14 L38 6 L38 22 Q38 36 22 36 Q6 36 6 22 Z" fill="none" stroke="#9a948a" strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="15.5" cy="22" rx="2.2" ry="2.8" fill="#2b2b2b" />
      <ellipse cx="28.5" cy="22" rx="2.2" ry="2.8" fill="#2b2b2b" />
      <circle cx="16.2" cy="21" r="0.8" fill="#fff" />
      <circle cx="29.2" cy="21" r="0.8" fill="#fff" />
      <path d="M20.5 27 L23.5 27 L22 28.8 Z" fill="#e8a3a3" />
      <path d="M22 28.8 Q20 31 18.5 30 M22 28.8 Q24 31 25.5 30" fill="none" stroke="#6b655c" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4 26 L13 27 M4 30 L13 28.5 M40 26 L31 27 M40 30 L31 28.5" stroke="#8a847a" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}
