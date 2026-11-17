import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/cn";
import { homeBox, pieceTop, roomBox, type Box } from "./logic";
import { paletteFor, type Palette } from "./palette";
import type { Home, ViewMode } from "./types";

/** Altura das paredes: cheia no 3D, baixa com um cômodo em foco (para ver dentro), e mínima na planta. */
const WALL_3D = 1.35;
const WALL_FOCUS = 0.3;
const WALL_PLAN = 0.45;
const WALL_THICKNESS = 0.12;
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
  onPickRoom: (roomId: string) => void;
  onPickPiece: (pieceId: string) => void;
  className?: string;
}

interface Label {
  id: string;
  text: string;
  pos: THREE.Vector3;
  active: boolean;
  onClick: () => void;
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
}

export default function HouseScene(props: HouseSceneProps) {
  const { home, mode, dark, focusId, selectedPieceId, className } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const labelEls = useRef(new Map<string, HTMLButtonElement>());
  const labelsRef = useRef<Label[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;

  const box = useMemo(() => homeBox(home), [home]);

  const labels = useMemo<Label[]>(() => {
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
  }, [home, mode, focusId, selectedPieceId]);
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
    scene.add(group);
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
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    return () => {
      observer.disconnect();
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
    buildHouse(engine.group, home, pal, mode, focusId, selectedPieceId, box);
    engine.render();
  }, [home, mode, dark, focusId, selectedPieceId, box]);

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
            style={{ visibility: "hidden" }}
            className={cn(
              "pointer-events-auto absolute top-0 left-0 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs transition-colors duration-(--motion-fast)",
              l.active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border-strong bg-surface/95 text-foreground hover:border-primary hover:text-primary",
            )}
          >
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
  const ordered = [...labels].sort((a, b) => Number(b.active) - Number(a.active));
  for (const l of ordered) {
    const el = els.get(l.id);
    if (!el) continue;
    v.copy(l.pos).project(cam);
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
) {
  clearGroup(group);
  const cache = new Map<string, THREE.Material>();
  const material = (color: string, opacity = 1) => {
    const key = `${color}-${opacity}`;
    let m = cache.get(key);
    if (!m) {
      const base = { color, transparent: opacity < 1, opacity, depthWrite: opacity >= 0.6 };
      m =
        pal.shading === "standard"
          ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
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
    }
  }

  // Paredes
  const wallH = mode === "planta" ? WALL_PLAN : focusId ? WALL_FOCUS : WALL_3D;
  const wallMat = material(pal.wall);
  const topMat = material(pal.wallTop);
  const T = WALL_THICKNESS;
  const segment = (axis: "x" | "z", at: number, a: number, b: number) => {
    if (b - a < 0.01) return;
    if (axis === "x") {
      addBox(a, 0, at - T / 2, b - a, wallH, T, wallMat);
      if (pal.wallTop !== pal.wall) addBox(a, wallH, at - T / 2, b - a, 0.02, T, topMat, {}, false);
    } else {
      addBox(at - T / 2, 0, a, T, wallH, b - a, wallMat);
      if (pal.wallTop !== pal.wall) addBox(at - T / 2, wallH, a, T, 0.02, b - a, topMat, {}, false);
    }
  };
  for (const wall of home.walls) {
    let start = wall.from;
    for (const [g1, g2] of wall.gaps ?? []) {
      segment(wall.axis, wall.at, start, g1);
      start = g2;
    }
    segment(wall.axis, wall.at, start, wall.to);
  }

  // Móveis
  const cap = mode === "planta" ? FURNITURE_CAP_PLAN : FURNITURE_CAP_3D;
  const lineMat = new THREE.LineBasicMaterial({ color: pal.highlight });
  for (const piece of home.pieces) {
    const dim = dimOther(piece.roomId);
    const selected = piece.id === selectedPieceId;
    for (const part of piece.parts) {
      const y = part.y ?? 0;
      const glass = part.m === "vidro";
      let h = part.h;
      const masonry = part.m === "parede";
      if (masonry) h = wallH;
      else if (y === 0 && !glass) h = Math.min(h, cap);
      if (glass && mode === "planta") h = Math.min(h, WALL_PLAN);
      if (glass && focusId) h = Math.min(h, WALL_FOCUS + 0.2);
      const opacity = glass ? 0.4 : dim && mode === "3d" ? 0.3 : 1;
      const mesh = addBox(
        part.x, y, part.z, part.w, h, part.d,
        masonry ? wallMat : material(pal.material[part.m], opacity),
        { roomId: piece.roomId, pieceId: piece.fixed ? undefined : piece.id, dimmed: dim && mode === "3d" },
        !glass && part.m !== "tapete" && !dim,
      );
      if (selected) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), lineMat);
        edges.position.copy(mesh.position);
        group.add(edges);
      }
    }
  }
}
