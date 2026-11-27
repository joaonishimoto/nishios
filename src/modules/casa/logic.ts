import { warranty } from "@/modules/bens/logic";
import type { Asset } from "@/modules/bens/types";
import type { Home, Piece, Rect, Room } from "./types";

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function roomArea(room: Room): number {
  return room.rects.reduce((sum, [, , w, d]) => sum + w * d, 0);
}

/** "4,11 × 2,31 m, 9,5 m²", ou só a área quando o cômodo tem formato em L. */
export function roomSize(room: Room): string {
  const area = `${oneDecimal.format(roomArea(room))} m²`;
  if (room.rects.length !== 1) return area;
  const [, , w, d] = room.rects[0];
  return `${decimal.format(w)} × ${decimal.format(d)} m, ${area}`;
}

export function indoorArea(home: Home): number {
  return home.rooms.filter((r) => !r.outdoor).reduce((sum, r) => sum + roomArea(r), 0);
}

/** Área de fora (quintal, área coberta e corredor do lado), sem as paredes. */
export function outdoorArea(home: Home): number {
  return home.rooms.filter((r) => r.outdoor).reduce((sum, r) => sum + roomArea(r), 0);
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function rectsBox(rects: Rect[]): Box {
  return {
    minX: Math.min(...rects.map(([x]) => x)),
    maxX: Math.max(...rects.map(([x, , w]) => x + w)),
    minZ: Math.min(...rects.map(([, z]) => z)),
    maxZ: Math.max(...rects.map(([, z, , d]) => z + d)),
  };
}

export function homeBox(home: Home): Box {
  return rectsBox(home.rooms.flatMap((r) => r.rects));
}

export function roomBox(room: Room): Box {
  return rectsBox(room.rects);
}

/** Centro do topo do móvel, para a etiqueta. */
export function pieceTop(piece: Piece, cap: number): [number, number, number] {
  const box = rectsBox(piece.parts.map((p) => [p.x, p.z, p.w, p.d]));
  const top = Math.max(...piece.parts.map((p) => Math.min((p.y ?? 0) + p.h, cap)));
  return [(box.minX + box.maxX) / 2, top, (box.minZ + box.maxZ) / 2];
}

/** Móveis de verdade: tira muro, porta e outras partes da construção. */
export function furniture(home: Home, roomId?: string): Piece[] {
  return home.pieces.filter((p) => !p.fixed && (!roomId || p.roomId === roomId));
}

export interface RoomSummary {
  pieces: Piece[];
  linked: { piece: Piece; asset: Asset }[];
  value: number;
  activeWarranties: number;
  /** Bens com "Onde fica" igual ao nome do cômodo que ainda não estão na planta. */
  outsidePlan: Asset[];
}

export function summarize(home: Home, assets: Asset[], room?: Room): RoomSummary {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const pieces = furniture(home, room?.id);
  const linked = pieces.flatMap((piece) => {
    const asset = piece.assetId ? byId.get(piece.assetId) : undefined;
    return asset ? [{ piece, asset }] : [];
  });
  const linkedIds = new Set(home.pieces.map((p) => p.assetId).filter(Boolean));
  const outsidePlan = room
    ? assets.filter((a) => !linkedIds.has(a.id) && sameName(a.location, room.name))
    : [];
  return {
    pieces,
    linked,
    value: linked.reduce((sum, l) => sum + l.asset.value, 0),
    activeWarranties: linked.filter((l) => warranty(l.asset)?.state !== "expired" && l.asset.warrantyUntil).length,
    outsidePlan,
  };
}

function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  return norm(a) === norm(b);
}

/** As sugestões do cômodo: as escritas para ele e as que saem dos dados de Bens. */
export function suggestions(room: Room, summary: RoomSummary): string[] {
  const out: string[] = [];
  for (const { asset } of summary.linked) {
    const w = warranty(asset);
    if (w?.state === "ending") out.push(`A garantia de ${asset.name} ${w.label.toLowerCase()}. Vale revisar o aparelho antes.`);
  }
  const loose = summary.pieces.filter((p) => !p.assetId).length;
  if (loose > 0 && summary.pieces.length > 0) {
    out.push(
      loose === 1
        ? "1 móvel está só na planta. Ligue a um bem para entrar no seu patrimônio."
        : `${loose} móveis estão só na planta. Ligue cada um a um bem para entrarem no seu patrimônio.`,
    );
  }
  return [...(room.tips ?? []), ...out];
}
