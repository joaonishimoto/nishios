import type { FloorKind, Home, Material, Part, Piece, Room, Side } from "./types";

/**
 * Três propostas de como mobiliar o apartamento, pensadas para o João, a Maki e o Gojo:
 * suíte para ele, segundo quarto como escritório e quarto de hóspedes (sem guarda-roupa),
 * e a área externa repensada. A planta vazia continua sendo a casa de verdade; a proposta
 * só muda o que se vê.
 */
export interface Proposal {
  id: string;
  name: string;
  tagline: string;
  /** O que muda, em frases curtas, para o painel. */
  highlights: string[];
  /** Por que cada cômodo ficou assim. */
  notes: Record<string, string[]>;
  /** A área externa vira estes cômodos. */
  outdoor: Room[];
  /** Pisos trocados (por exemplo, a varanda no mesmo piso da área gourmet). */
  floors?: Record<string, FloorKind>;
  pieces: Piece[];
}

// ---------- Peças ----------

type Rect = { x: number; z: number; w: number; d: number };

let seq = 0;
const piece = (roomId: string, name: string, icon: string, category: string, parts: Part[]): Piece => ({
  id: `p${++seq}`, roomId, name, icon, category, parts,
});

const part = (x: number, z: number, w: number, d: number, h: number, m: Material, y = 0, c?: string): Part => ({
  x, z, w, d, h, m, y, c,
});

/**
 * Monta uma peça em coordenadas próprias: u corre ao longo da parede (largura) e v sai dela
 * (fundo). `back` é a parede em que a peça encosta; a função gira tudo para o lugar certo.
 */
function placer(r: Rect, back: Side) {
  const along = back === "n" || back === "s" ? r.w : r.d;
  const depth = back === "n" || back === "s" ? r.d : r.w;
  const at = (u: number, v: number, lw: number, ld: number, h: number, m: Material, y = 0, c?: string): Part => {
    switch (back) {
      case "n": return part(r.x + u, r.z + v, lw, ld, h, m, y, c);
      case "s": return part(r.x + along - u - lw, r.z + depth - v - ld, lw, ld, h, m, y, c);
      case "w": return part(r.x + v, r.z + u, ld, lw, h, m, y, c);
      case "e": return part(r.x + depth - v - ld, r.z + u, ld, lw, h, m, y, c);
    }
  };
  return { W: along, D: depth, at };
}

const R = (x: number, z: number, w: number, d: number): Rect => ({ x, z, w, d });

function bed(r: Rect, back: Side, duvet: string, frame = "#9a6b45"): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    at(0, 0, W, D, 0.28, "madeira", 0, frame),
    at(0, 0, W, 0.07, 1.0, "madeira", 0, frame),
    at(0.04, 0.08, W - 0.08, D - 0.12, 0.2, "branco", 0.28),
    at(0.02, 0.62, W - 0.04, D - 0.66, 0.05, "tecido", 0.48, duvet),
    at(0.1, 0.14, W / 2 - 0.15, 0.36, 0.1, "branco", 0.48),
    at(W / 2 + 0.05, 0.14, W / 2 - 0.15, 0.36, 0.1, "branco", 0.48),
  ];
}

function nightstand(r: Rect, back: Side, wood = "#9a6b45"): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    at(0, 0, W, D, 0.5, "madeira", 0, wood),
    at(W / 2 - 0.08, D / 2 - 0.08, 0.16, 0.16, 0.06, "metal", 0.5),
    at(W / 2 - 0.1, D / 2 - 0.1, 0.2, 0.2, 0.18, "branco", 0.56, "#f3ead8"),
  ];
}

function wardrobe(r: Rect, back: Side, color = "#efe9df"): Part[] {
  const { W, D, at } = placer(r, back);
  const out = [at(0, 0, W, D, 2.1, "branco", 0, color)];
  const doors = Math.max(2, Math.round(W / 0.5));
  for (let i = 1; i < doors; i++) out.push(at((W / doors) * i - 0.004, D, 0.008, 0.006, 2.0, "escuro", 0.05, "#8a8278"));
  return out;
}

function sofa(r: Rect, back: Side, fabric: string, seats = 3): Part[] {
  const { W, D, at } = placer(r, back);
  const arm = 0.16;
  const out = [
    at(0, 0, W, D, 0.12, "escuro", 0.04, "#4a443d"),
    at(0, 0, W, 0.2, 0.78, "tecido", 0.12, fabric),
    at(0, 0, arm, D, 0.6, "tecido", 0.12, fabric),
    at(W - arm, 0, arm, D, 0.6, "tecido", 0.12, fabric),
  ];
  const seatW = (W - 2 * arm) / seats;
  for (let i = 0; i < seats; i++) out.push(at(arm + i * seatW + 0.01, 0.2, seatW - 0.02, D - 0.22, 0.16, "tecido", 0.28, fabric));
  for (let i = 0; i < seats; i++) out.push(at(arm + i * seatW + 0.03, 0.2, seatW - 0.06, 0.14, 0.38, "tecido", 0.44, fabric));
  return out;
}

function table(r: Rect, top: string, legs = "#3d3833", height = 0.75): Part[] {
  const l = 0.05;
  return [
    part(r.x, r.z, r.w, r.d, 0.04, "madeira", height - 0.04, top),
    part(r.x + 0.05, r.z + 0.05, l, l, height - 0.04, "escuro", 0, legs),
    part(r.x + r.w - 0.05 - l, r.z + 0.05, l, l, height - 0.04, "escuro", 0, legs),
    part(r.x + 0.05, r.z + r.d - 0.05 - l, l, l, height - 0.04, "escuro", 0, legs),
    part(r.x + r.w - 0.05 - l, r.z + r.d - 0.05 - l, l, l, height - 0.04, "escuro", 0, legs),
  ];
}

/** Cadeira de 44 cm com o encosto do lado `back`. */
function chair(x: number, z: number, back: Side, color: string, size = 0.44): Part[] {
  const { W, at } = placer(R(x, z, size, size), back);
  return [
    at(0, 0, W, size, 0.04, "madeira", 0.44, color),
    at(0, 0, W, 0.04, 0.42, "madeira", 0.48, color),
    at(0.03, 0.03, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(W - 0.065, 0.03, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(0.03, size - 0.065, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(W - 0.065, size - 0.065, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
  ];
}

function stool(x: number, z: number, color: string): Part[] {
  return [part(x, z, 0.36, 0.36, 0.04, "madeira", 0.64, color), part(x + 0.16, z + 0.16, 0.05, 0.05, 0.64, "metal")];
}

function rug(r: Rect, color: string): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.012, "tapete", 0, color)];
}

function coffeeTable(r: Rect, top: string): Part[] {
  return table(r, top, "#3d3833", 0.4);
}

function rackTv(r: Rect, back: Side, wood: string): Part[] {
  const { W, D, at } = placer(r, back);
  const tvW = Math.min(1.25, W - 0.2);
  return [
    at(0, 0, W, D, 0.45, "madeira", 0.05, wood),
    at(W / 2 - 0.15, 0.05, 0.3, 0.18, 0.03, "escuro", 0.5),
    at(W / 2 - tvW / 2, 0.12, tvW, 0.04, 0.7, "escuro", 0.53, "#1c1f24"),
  ];
}

function desk(r: Rect, back: Side, top: string): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    at(0, 0, W, D, 0.03, "madeira", 0.72, top),
    at(0.02, 0.02, 0.04, D - 0.04, 0.72, "escuro", 0, "#3d3833"),
    at(W - 0.06, 0.02, 0.04, D - 0.04, 0.72, "escuro", 0, "#3d3833"),
    at(W / 2 - 0.3, 0.05, 0.6, 0.04, 0.38, "escuro", 0.76, "#1c1f24"),
  ];
}

function officeChair(x: number, z: number, color: string): Part[] {
  return [
    part(x + 0.22, z + 0.22, 0.06, 0.06, 0.45, "metal"),
    part(x, z, 0.5, 0.5, 0.06, "tecido", 0.45, color),
    part(x, z + 0.42, 0.5, 0.08, 0.5, "tecido", 0.5, color),
  ];
}

function bookshelf(r: Rect, back: Side, wood: string, height = 1.8): Part[] {
  const { W, D, at } = placer(r, back);
  const out = [at(0, 0, 0.03, D, height, "madeira", 0, wood), at(W - 0.03, 0, 0.03, D, height, "madeira", 0, wood), at(0, 0, W, 0.02, height, "madeira", 0, wood)];
  for (let y = 0; y <= height; y += height / 4) out.push(at(0, 0, W, D, 0.025, "madeira", Math.min(y, height - 0.025), wood));
  // Livros
  for (let k = 0; k < 3; k++) out.push(at(0.06 + k * 0.05, 0.04, 0.3, D - 0.08, 0.24, "tecido", height / 4 + 0.03, ["#b5654a", "#5a7d9a", "#d0b06a"][k]));
  return out;
}

function plant(x: number, z: number, size = 0.4, pot = "#c27b55"): Part[] {
  return [
    part(x, z, size * 0.7, size * 0.7, size * 0.8, "pedra", 0, pot),
    part(x - size * 0.15, z - size * 0.15, size, size, size * 1.1, "planta", size * 0.8),
  ];
}

function fridge(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  return [at(0, 0, W, D, 1.85, "metal", 0, "#d9dcdf"), at(W - 0.08, D, 0.03, 0.03, 0.6, "escuro", 0.9)];
}

function stove(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  return [at(0, 0, W, D, 0.88, "branco", 0, "#f0f0ee"), at(0.03, 0.03, W - 0.06, D - 0.06, 0.02, "escuro", 0.88, "#202326"), at(0, 0, W, 0.06, 0.12, "branco", 0.9, "#e5e5e3")];
}

function washer(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  return [at(0, 0, W, D, 0.85, "branco", 0, "#f4f4f2"), at(W / 2 - 0.15, D, 0.3, 0.01, 0.3, "vidro", 0.35)];
}

function peninsula(r: Rect): Part[] {
  return [part(r.x, r.z, r.w, r.d, 1.0, "madeira", 0, "#6b4a33"), part(r.x - 0.03, r.z - 0.03, r.w + 0.18, r.d + 0.06, 0.04, "pedra", 1.0, "#e8e3da")];
}

function tallCabinet(r: Rect, back: Side, color = "#efe9df"): Part[] {
  return wardrobe(r, back, color).map((p) => ({ ...p, h: Math.min(p.h, 1.9) }));
}

function armchair(r: Rect, back: Side, fabric: string): Part[] {
  return sofa(r, back, fabric, 1);
}

// Gatos

function litterBox(x: number, z: number, back: Side = "n"): Part[] {
  const { at } = placer(R(x, z, 0.55, 0.42), back);
  return [at(0, 0, 0.55, 0.42, 0.16, "branco", 0, "#d8dcd6"), at(0.02, 0.02, 0.51, 0.38, 0.2, "branco", 0.16, "#eef0ec"), at(0.18, 0.4, 0.2, 0.02, 0.16, "escuro", 0.08, "#9aa29b")];
}

function feeder(x: number, z: number): Part[] {
  return [
    part(x, z, 0.5, 0.26, 0.05, "madeira", 0, "#b08a5f"),
    part(x + 0.04, z + 0.04, 0.16, 0.16, 0.05, "metal", 0.05),
    part(x + 0.3, z + 0.03, 0.18, 0.18, 0.16, "branco", 0.05, "#eaf2f6"),
  ];
}

function catTree(x: number, z: number, tall = 1.6, plush = "#b9b3aa"): Part[] {
  const sisal = "#cdb68a";
  return [
    part(x, z, 0.5, 0.5, 0.06, "madeira", 0, plush),
    part(x + 0.06, z + 0.06, 0.09, 0.09, tall, "madeira", 0, sisal),
    part(x + 0.33, z + 0.33, 0.09, 0.09, tall * 0.62, "madeira", 0, sisal),
    part(x + 0.18, z + 0.1, 0.3, 0.3, 0.12, "tecido", tall * 0.35, plush),
    part(x - 0.02, z + 0.02, 0.36, 0.36, 0.05, "tecido", tall * 0.62, plush),
    part(x + 0.05, z + 0.05, 0.4, 0.4, 0.1, "tecido", tall, plush),
  ];
}

function catShelves(points: [number, number, number][], back: Side, wood = "#b08a5f"): Part[] {
  return points.map(([x, z, y]) => {
    const wide = back === "n" || back === "s";
    return part(x, z, wide ? 0.4 : 0.25, wide ? 0.25 : 0.4, 0.04, "madeira", y, wood);
  });
}

function catBed(x: number, z: number, color: string): Part[] {
  return [part(x, z, 0.5, 0.5, 0.08, "tecido", 0, color), part(x + 0.06, z + 0.06, 0.38, 0.38, 0.03, "tecido", 0.08, "#efe7da")];
}

/** Rede de janela: plataforma presa logo abaixo do peitoril. */
function windowPerch(r: Rect, color: string): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.04, "tecido", 0.85, color)];
}

function scratcher(x: number, z: number): Part[] {
  return [part(x, z, 0.38, 0.38, 0.04, "tecido", 0, "#b9b3aa"), part(x + 0.14, z + 0.14, 0.1, 0.1, 0.75, "madeira", 0.04, "#cdb68a")];
}

// Área externa

/** Tela de proteção sobre o muro, em volta de toda a área externa. */
function catNet(): Part[] {
  return [
    part(-0.16, -1.66, 10.18, 0.03, 1.7, "tela", 0.6),
    part(-0.16, -1.66, 0.03, 1.55, 1.7, "tela", 0.6),
    part(9.99, -1.66, 0.03, 1.55, 1.7, "tela", 0.6),
  ];
}

function pergola(r: Rect, wood: string): Part[] {
  const out: Part[] = [];
  for (const [x, z] of [[r.x, r.z], [r.x + r.w - 0.1, r.z], [r.x, r.z + r.d - 0.1], [r.x + r.w - 0.1, r.z + r.d - 0.1]]) {
    out.push(part(x, z, 0.1, 0.1, 2.4, "madeira", 0, wood));
  }
  out.push(part(r.x, r.z, r.w, 0.08, 0.12, "madeira", 2.4, wood), part(r.x, r.z + r.d - 0.08, r.w, 0.08, 0.12, "madeira", 2.4, wood));
  for (let x = r.x + 0.1; x < r.x + r.w - 0.05; x += 0.35) out.push(part(x, r.z, 0.05, r.d, 0.08, "madeira", 2.52, wood));
  return out;
}

function roof(r: Rect): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.03, "cobertura", 2.6)];
}

function raisedBed(r: Rect): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.4, "madeira", 0, "#8d6748"), part(r.x + 0.04, r.z + 0.04, r.w - 0.08, r.d - 0.08, 0.18, "planta", 0.4)];
}

function lounger(x: number, z: number, fabric: string): Part[] {
  return [part(x, z, 0.62, 1.8, 0.3, "madeira", 0, "#8d6748"), part(x + 0.04, z + 0.05, 0.54, 1.25, 0.08, "tecido", 0.3, fabric), part(x + 0.04, z + 1.25, 0.54, 0.5, 0.35, "tecido", 0.3, fabric)];
}

function bbq(r: Rect): Part[] {
  return [
    part(r.x, r.z, r.w, r.d, 0.9, "pedra", 0, "#b7aea2"),
    part(r.x + 0.05, r.z + 0.05, 0.7, r.d - 0.1, 0.03, "escuro", 0.9, "#2a2a2a"),
    part(r.x + r.w - 0.6, r.z + 0.08, 0.45, 0.35, 0.02, "metal", 0.9),
  ];
}

function clothesline(r: Rect): Part[] {
  return [part(r.x, r.z, 0.06, 0.06, 1.8, "metal"), part(r.x + r.w - 0.06, r.z, 0.06, 0.06, 1.8, "metal"), part(r.x, r.z, r.w, 0.02, 0.02, "metal", 1.75)];
}

function hammock(r: Rect, fabric: string): Part[] {
  return [part(r.x, r.z, 0.08, 0.08, 1.6, "madeira", 0, "#8d6748"), part(r.x + r.w - 0.08, r.z, 0.08, 0.08, 1.6, "madeira", 0, "#8d6748"), part(r.x + 0.3, r.z - 0.3, r.w - 0.6, 0.7, 0.05, "tecido", 0.6, fabric)];
}

// ---------- Cozinha e serviço (iguais nas três) ----------

function kitchenAndLaundry(wood: string, stoolColor: string): Piece[] {
  return [
    piece("cozinha", "Fogão", "🍳", "Eletrodomésticos", stove(R(-0.01, 1.62, 0.6, 0.56), "w")),
    piece("cozinha", "Geladeira", "🧊", "Eletrodomésticos", fridge(R(-0.01, 3.42, 0.7, 0.66), "w")),
    piece("cozinha", "Bancada de refeição", "🍽️", "Móveis", peninsula(R(1.55, 2.25, 0.4, 0.95))),
    piece("jantar", "Banquetas", "🪑", "Móveis", [...stool(2.06, 2.36, stoolColor), ...stool(2.06, 2.82, stoolColor)]),
    piece("servico", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(-0.01, 0.96, 0.6, 0.56), "w")),
    piece("servico", "Armário alto", "🗄️", "Móveis", tallCabinet(R(1.25, 0.29, 0.35, 0.85), "e", wood)),
  ];
}

// ---------- Propostas ----------

const garden = (id: string, name: string, rects: Room["rects"], floor: FloorKind, label: [number, number], catio = true): Room => ({
  id, name, rects, floor, label, outdoor: true, catio,
});

function proposalA(): Proposal {
  seq = 0;
  const oak = "#a9784c";
  const green = "#6f8f74";
  return {
    id: "a",
    name: "Aconchego",
    tagline: "Madeira clara, verde e um jardim com deck coberto por pergolado.",
    highlights: [
      "Suíte com cama de casal encostada no topo e guarda-roupa na parede da porta.",
      "Escritório com mesa embaixo da janela e sofá-cama para hóspedes.",
      "Área externa toda telada: deck com pergolado na saída da varanda e jardim no resto.",
      "Gatos: torre na varanda olhando o jardim, rede na janela da suíte, prateleiras no escritório, duas caixas de areia longe da comida.",
    ],
    notes: {
      suite: ["A cama fica de frente para a porta, longe da janela, e sobra passagem dos dois lados.", "A rede de janela fica do lado da cama: é o lugar mais disputado da casa."],
      quarto: ["Sem guarda-roupa: o sofá-cama resolve as visitas e as prateleiras guardam o resto.", "As prateleiras na parede viram caminho para os gatos chegarem à janela."],
      estar: ["Sofá na parede de baixo, de frente para a TV na parede do quarto, deixando livre a entrada."],
      jantar: ["Mesa de 4 lugares no centro e banquetas na bancada da cozinha."],
      varanda: ["Poltronas para o café e a torre dos gatos na quina, com vista para o jardim."],
      servico: ["Caixa de areia ao lado da máquina, longe da comida, que fica na cozinha."],
      deck: ["O pergolado faz sombra sem fechar o céu, e a tela por cima do muro deixa os gatos saírem com segurança."],
      jardim: ["Horta em canteiros altos e plantas seguras para gatos (nada de lírio)."],
    },
    outdoor: [
      garden("deck", "Deck", [[-0.11, -1.56, 4.3, 1.45], [-0.11, -0.11, 1.76, 0.3], [1.65, -0.11, 2.54, 0.51]], "deck", [1.6, -0.85]),
      garden("jardim", "Jardim", [[4.19, -1.56, 5.78, 1.45]], "grama", [7.2, -0.85]),
    ],
    pieces: [
      // Suíte
      piece("suite", "Cama de casal", "🛏️", "Móveis", bed(R(7.81, -0.01, 1.58, 2.0), "n", "#c9d4c5", oak)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(7.36, -0.01, 0.42, 0.4), "n", oak)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(9.42, -0.01, 0.42, 0.4), "n", oak)),
      piece("suite", "Guarda-roupa", "🚪", "Móveis", wardrobe(R(6.79, -0.01, 0.55, 2.0), "w")),
      piece("suite", "Tapete", "🟫", "Decoração", rug(R(7.55, 1.2, 2.1, 1.35), "#e2d5c0")),
      piece("suite", "Rede de janela (gatos)", "🐈", "Pets", windowPerch(R(9.5, 1.0, 0.36, 0.6), "#d8cfc2")),
      // Escritório e hóspedes
      piece("quarto", "Mesa de trabalho", "💻", "Móveis", desk(R(4.9, -0.01, 1.4, 0.6), "n", oak)),
      piece("quarto", "Cadeira de escritório", "🪑", "Móveis", officeChair(5.35, 0.65, "#3e4a52")),
      piece("quarto", "Sofá-cama", "🛋️", "Móveis", sofa(R(4.29, 0.95, 0.88, 1.9), "w", green, 2)),
      piece("quarto", "Estante", "📚", "Móveis", bookshelf(R(6.34, 0.75, 0.35, 1.3), "e", oak)),
      piece("quarto", "Prateleiras dos gatos", "🐈", "Pets", catShelves([[4.29, 0.95, 1.0], [4.29, 1.6, 1.2], [4.29, 2.3, 0.85]], "w", oak)),
      piece("quarto", "Tapete", "🟫", "Decoração", rug(R(5.25, 1.1, 1.3, 1.5), "#d9cbb5")),
      // Estar
      piece("estar", "Sofá 3 lugares", "🛋️", "Móveis", sofa(R(3.3, 4.5, 2.1, 0.92), "s", green)),
      piece("estar", "Mesa de centro", "☕", "Móveis", coffeeTable(R(3.95, 3.95, 0.9, 0.5), oak)),
      piece("estar", "Rack e TV", "📺", "Eletrônicos", rackTv(R(4.3, 3.07, 1.3, 0.4), "n", oak)),
      piece("estar", "Tapete", "🟫", "Decoração", rug(R(3.15, 3.6, 2.4, 1.75), "#e6dccb")),
      piece("estar", "Planta", "🪴", "Decoração", plant(2.0, 3.25, 0.45)),
      piece("estar", "Arranhador", "🐈", "Pets", scratcher(5.2, 4.7)),
      // Jantar
      piece("jantar", "Mesa de jantar", "🍽️", "Móveis", table(R(2.65, 1.95, 1.2, 0.8), oak)),
      piece("jantar", "Cadeiras", "🪑", "Móveis", [
        ...chair(2.75, 1.5, "n", oak), ...chair(3.3, 1.5, "n", oak), ...chair(2.75, 2.78, "s", oak), ...chair(3.3, 2.78, "s", oak),
      ]),
      // Varanda
      piece("varanda", "Poltronas", "🪑", "Móveis", [...armchair(R(1.85, 0.45, 0.75, 0.75), "n", "#d7c6a5"), ...armchair(R(2.75, 0.45, 0.75, 0.75), "n", "#d7c6a5")]),
      piece("varanda", "Torre para gatos", "🐈", "Pets", catTree(3.62, 0.45, 1.6)),
      // Cozinha e serviço
      ...kitchenAndLaundry(oak, oak),
      piece("cozinha", "Comedouro e fonte", "🐈", "Pets", feeder(1.0, 3.8)),
      piece("servico", "Caixa de areia", "🐈", "Pets", litterBox(0.65, 1.02)),
      piece("quarto", "Caixa de areia", "🐈", "Pets", litterBox(5.2, 2.45, "s")),
      // Área externa
      piece("deck", "Pergolado", "🌿", "Outros", pergola(R(0.1, -1.5, 3.9, 1.3), "#8d6748")),
      piece("deck", "Mesa e cadeiras", "🍽️", "Móveis", [...table(R(1.6, -1.15, 1.0, 0.7), "#8d6748"), ...chair(1.1, -1.03, "w", "#8d6748"), ...chair(2.65, -1.03, "e", "#8d6748")]),
      piece("deck", "Plantas", "🪴", "Decoração", [...plant(0.05, -1.5, 0.5), ...plant(3.65, -1.5, 0.5)]),
      piece("jardim", "Horta", "🥬", "Outros", [...raisedBed(R(4.6, -1.5, 1.6, 0.5)), ...raisedBed(R(6.5, -1.5, 1.6, 0.5))]),
      piece("jardim", "Grama de gato e plantas", "🌱", "Pets", [...plant(8.6, -1.5, 0.45, "#8fa38c"), ...plant(9.3, -1.5, 0.45)]),
      piece("jardim", "Tela de proteção", "🕸️", "Pets", catNet()),
    ],
  };
}

function proposalB(): Proposal {
  seq = 100;
  const walnut = "#6e4b33";
  const grey = "#8c8f93";
  return {
    id: "b",
    name: "Área gourmet",
    tagline: "Tons de cinza e madeira escura, e a área externa toda coberta virando mais um ambiente.",
    highlights: [
      "Suíte com a cama na parede da porta e dois guarda-roupas de 1 m dos lados da janela, como um closet aberto.",
      "Escritório com mesa encostada na parede e sofá-cama do outro lado, deixando a janela livre.",
      "Área externa toda coberta com policarbonato: área gourmet com churrasqueira e mesa de 6 na saída da varanda, e jardim de inverno no resto.",
      "Gatos: área coberta toda telada para eles, parede de escalada no jantar, nicho na janela do escritório.",
    ],
    notes: {
      suite: ["A cama fica na parede da porta e os dois guarda-roupas emolduram a janela, deixando o meio livre para o nicho dos gatos."],
      quarto: ["A mesa fica na parede de quem entra, e o sofá-cama do outro lado vira cama de hóspedes sem mexer em nada."],
      estar: ["Sofá em L voltado para a TV; o canto do L vira lugar de cochilo dos gatos."],
      jantar: ["Mesa menor para o dia a dia, já que as refeições maiores vão para a área gourmet."],
      varanda: ["Mesmo piso da área gourmet, para os dois parecerem um ambiente só."],
      gourmet: ["A cobertura de policarbonato deixa entrar luz e protege da chuva; a tela fecha o resto."],
      inverno: ["Jardim de inverno com plantas seguras, poltrona e a segunda caixa de areia, ventilada e longe da comida."],
    },
    floors: { varanda: "pedra" },
    outdoor: [
      garden("gourmet", "Área gourmet", [[-0.11, -1.56, 4.3, 1.45], [-0.11, -0.11, 1.76, 0.3], [1.65, -0.11, 2.54, 0.51]], "pedra", [2.0, -0.85]),
      garden("inverno", "Jardim de inverno", [[4.19, -1.56, 5.78, 1.45]], "pedra", [7.2, -0.85]),
    ],
    pieces: [
      // Suíte
      piece("suite", "Cama de casal", "🛏️", "Móveis", bed(R(6.79, 0.45, 2.0, 1.58), "w", "#cfd3d6", walnut)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(6.79, 0.0, 0.4, 0.42), "w", walnut)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(6.79, 2.05, 0.4, 0.42), "w", walnut)),
      piece("suite", "Guarda-roupa", "🚪", "Móveis", wardrobe(R(8.85, -0.01, 1.02, 0.56), "n", "#d9d6d1")),
      piece("suite", "Guarda-roupa", "🚪", "Móveis", wardrobe(R(8.85, 2.12, 1.02, 0.56), "s", "#d9d6d1")),
      piece("suite", "Tapete", "🟫", "Decoração", rug(R(8.85, 0.7, 0.95, 1.3), "#bdb8b1")),
      piece("suite", "Nicho na janela (gatos)", "🐈", "Pets", windowPerch(R(9.5, 0.85, 0.36, 0.9), "#9aa0a6")),
      // Escritório e hóspedes
      piece("quarto", "Mesa de trabalho", "💻", "Móveis", desk(R(4.29, 0.35, 0.65, 1.5), "w", walnut)),
      piece("quarto", "Cadeira de escritório", "🪑", "Móveis", officeChair(5.0, 0.85, "#2f3338")),
      piece("quarto", "Sofá-cama", "🛋️", "Móveis", sofa(R(5.79, 0.3, 0.9, 1.9), "e", grey, 2)),
      piece("quarto", "Nicho na janela (gatos)", "🐈", "Pets", windowPerch(R(5.2, -0.01, 0.6, 0.32), "#9aa0a6")),
      piece("quarto", "Prateleira", "📚", "Móveis", bookshelf(R(4.29, 2.0, 0.32, 0.9), "w", walnut, 1.6)),
      // Estar
      piece("estar", "Sofá em L", "🛋️", "Móveis", [...sofa(R(3.45, 4.5, 2.1, 0.92), "s", grey), ...sofa(R(3.45, 3.72, 0.85, 0.78), "w", grey, 1)]),
      piece("estar", "Mesa de centro", "☕", "Móveis", coffeeTable(R(4.4, 3.85, 0.8, 0.5), walnut)),
      piece("estar", "Rack e TV", "📺", "Eletrônicos", rackTv(R(4.3, 3.07, 1.3, 0.4), "n", walnut)),
      piece("estar", "Tapete", "🟫", "Decoração", rug(R(3.3, 3.55, 2.3, 1.85), "#c9c5bf")),
      // Jantar
      piece("jantar", "Mesa de jantar", "🍽️", "Móveis", table(R(2.9, 1.95, 0.9, 0.9), walnut)),
      piece("jantar", "Cadeiras", "🪑", "Móveis", [...chair(3.13, 1.5, "n", "#2f3338"), ...chair(3.13, 2.88, "s", "#2f3338"), ...chair(3.82, 2.18, "e", "#2f3338")]),
      piece("jantar", "Parede de escalada (gatos)", "🐈", "Pets", catShelves([[1.7, 1.55, 0.5], [1.7, 1.95, 0.85], [1.7, 1.55, 1.2]], "w", walnut)),
      // Varanda
      piece("varanda", "Banco com vasos", "🪴", "Decoração", [part(1.75, 0.45, 1.4, 0.4, 0.45, "madeira", 0, walnut), ...plant(3.3, 0.5, 0.45, "#7d7f82"), ...plant(3.75, 0.5, 0.45, "#7d7f82")]),
      // Cozinha e serviço
      ...kitchenAndLaundry("#d9d6d1", "#2f3338"),
      piece("cozinha", "Comedouro e fonte", "🐈", "Pets", feeder(1.0, 3.8)),
      piece("servico", "Caixa de areia", "🐈", "Pets", litterBox(0.65, 1.02)),
      // Área externa
      piece("gourmet", "Cobertura", "🏠", "Outros", roof(R(-0.11, -1.56, 10.08, 1.45))),
      piece("gourmet", "Churrasqueira e bancada", "🔥", "Outros", bbq(R(-0.06, -1.56, 1.7, 0.6))),
      piece("gourmet", "Mesa de 6 lugares", "🍽️", "Móveis", [
        ...table(R(2.0, -1.2, 1.6, 0.75), walnut),
        ...chair(2.1, -1.62, "n", "#2f3338"), ...chair(2.6, -1.62, "n", "#2f3338"), ...chair(3.1, -1.62, "n", "#2f3338"),
        ...chair(2.1, -0.42, "s", "#2f3338"), ...chair(2.6, -0.42, "s", "#2f3338"), ...chair(3.1, -0.42, "s", "#2f3338"),
      ].map((p) => (p.z < -1.56 ? { ...p, z: p.z + 0.06 } : p))),
      piece("inverno", "Poltronas", "🪑", "Móveis", [...armchair(R(4.8, -1.45, 0.8, 0.8), "n", grey), ...coffeeTable(R(5.7, -1.3, 0.5, 0.5), walnut)]),
      piece("inverno", "Plantas", "🪴", "Decoração", [...plant(6.6, -1.5, 0.55, "#7d7f82"), ...plant(7.4, -1.5, 0.5, "#7d7f82"), ...plant(9.3, -0.75, 0.5, "#7d7f82")]),
      piece("inverno", "Torre para gatos", "🐈", "Pets", catTree(8.2, -1.5, 1.6, "#9aa0a6")),
      piece("inverno", "Caixa de areia", "🐈", "Pets", litterBox(9.25, -1.5, "n")),
      piece("inverno", "Tela de proteção", "🕸️", "Pets", catNet()),
    ],
  };
}

function proposalC(): Proposal {
  seq = 200;
  const birch = "#d8c3a0";
  const blush = "#d9b8a8";
  return {
    id: "c",
    name: "Casa dos gatos",
    tagline: "Clara e leve, com um caminho pelo alto para a Maki e o Gojo e um catio coberto atrás dos quartos.",
    highlights: [
      "Suíte com a cama encostada na parede do banheiro e a janela livre para a rede dos gatos.",
      "Escritório com cama retrátil: de dia é armário, de noite é cama de hóspedes.",
      "Área externa telada, dividida em quintal com horta e varal e um catio coberto só para os gatos.",
      "Gatos: três caixas de areia (uma por gato e mais uma), caminho de prateleiras no estar, duas torres e catio.",
    ],
    notes: {
      suite: ["A cama na parede do banheiro deixa a janela inteira para a rede, e o guarda-roupa fica na parede da porta."],
      quarto: ["A cama retrátil some na parede e libera o quarto inteiro para trabalhar.", "Torre ao lado da janela, para os gatos fazerem companhia no trabalho."],
      estar: ["Prateleiras em escada na parede do banheiro levam os gatos do chão até o alto sem passar pelo sofá."],
      jantar: ["Mesa com banco encostado, que ocupa menos passagem."],
      varanda: ["Daybed para ler olhando o quintal."],
      quintal: ["Canteiros altos, varal e duas espreguiçadeiras; a tela por cima do muro protege tudo."],
      catio: ["Coberto e telado, com torre, prateleiras no muro, rede e grama de gato. A terceira caixa de areia fica aqui."],
    },
    floors: { varanda: "deck" },
    outdoor: [
      garden("quintal", "Quintal", [[-0.11, -1.56, 4.3, 1.45], [-0.11, -0.11, 1.76, 0.3], [1.65, -0.11, 2.54, 0.51]], "deck", [1.6, -0.85]),
      garden("catio", "Catio", [[4.19, -1.56, 5.78, 1.45]], "grama", [7.2, -0.85]),
    ],
    pieces: [
      // Suíte
      piece("suite", "Cama de casal", "🛏️", "Móveis", bed(R(7.9, 0.68, 1.58, 2.0), "s", "#e9dcd2", birch)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(7.45, 2.26, 0.42, 0.42), "s", birch)),
      piece("suite", "Criado-mudo", "🛋️", "Móveis", nightstand(R(9.45, 2.26, 0.42, 0.42), "s", birch)),
      piece("suite", "Guarda-roupa", "🚪", "Móveis", wardrobe(R(6.79, -0.01, 0.55, 1.9), "w", "#f3eee6")),
      piece("suite", "Rede de janela (gatos)", "🐈", "Pets", windowPerch(R(9.5, 0.85, 0.36, 0.9), blush)),
      piece("suite", "Cama dos gatos", "🐈", "Pets", catBed(8.4, 0.05, blush)),
      // Escritório e hóspedes
      piece("quarto", "Cama retrátil", "🛏️", "Móveis", tallCabinet(R(4.29, 0.7, 0.45, 1.6), "w", "#f3eee6")),
      piece("quarto", "Mesa de trabalho", "💻", "Móveis", desk(R(4.95, -0.01, 1.7, 0.6), "n", birch)),
      piece("quarto", "Cadeira de escritório", "🪑", "Móveis", officeChair(5.55, 0.65, "#c9bfb2")),
      piece("quarto", "Poltrona de leitura", "🪑", "Móveis", armchair(R(5.9, 1.0, 0.78, 0.78), "e", blush)),
      piece("quarto", "Torre para gatos", "🐈", "Pets", catTree(4.32, 0.05, 1.6, "#d6cfc6")),
      // Estar
      piece("estar", "Sofá 3 lugares", "🛋️", "Móveis", sofa(R(3.0, 4.5, 2.2, 0.92), "s", "#cfc7bb")),
      piece("estar", "Mesa de centro", "☕", "Móveis", coffeeTable(R(3.65, 3.95, 0.9, 0.5), birch)),
      piece("estar", "Rack e TV", "📺", "Eletrônicos", rackTv(R(4.3, 3.07, 1.3, 0.4), "n", birch)),
      piece("estar", "Tapete", "🟫", "Decoração", rug(R(2.9, 3.6, 2.4, 1.75), "#efe6da")),
      piece("estar", "Caminho dos gatos", "🐈", "Pets", catShelves([[5.4, 5.0, 0.45], [5.4, 4.55, 0.8], [5.4, 4.12, 1.15]], "e", birch)),
      piece("estar", "Cama dos gatos", "🐈", "Pets", catBed(2.0, 3.2, "#cfc7bb")),
      // Jantar
      piece("jantar", "Mesa de jantar", "🍽️", "Móveis", table(R(2.65, 1.95, 1.2, 0.75), birch)),
      piece("jantar", "Banco e cadeiras", "🪑", "Móveis", [
        part(2.65, 1.55, 1.2, 0.36, 0.45, "madeira", 0, birch), ...chair(2.75, 2.75, "s", birch), ...chair(3.3, 2.75, "s", birch),
      ]),
      // Varanda
      piece("varanda", "Daybed", "🛋️", "Móveis", sofa(R(1.75, 0.45, 1.9, 0.8), "n", "#e8e0d4", 2)),
      piece("varanda", "Plantas", "🪴", "Decoração", [...plant(3.75, 0.5, 0.45)]),
      // Cozinha e serviço
      ...kitchenAndLaundry("#f3eee6", birch),
      piece("cozinha", "Comedouro e fonte", "🐈", "Pets", feeder(1.0, 3.8)),
      piece("servico", "Caixa de areia", "🐈", "Pets", litterBox(0.65, 1.02)),
      piece("quarto", "Caixa de areia", "🐈", "Pets", litterBox(4.35, 2.45, "s")),
      // Área externa
      piece("quintal", "Horta", "🥬", "Outros", [...raisedBed(R(0.05, -1.5, 1.2, 0.5)), ...raisedBed(R(1.4, -1.5, 1.2, 0.5))]),
      piece("quintal", "Espreguiçadeiras", "🪑", "Móveis", [...lyingLounger(2.3, -1.5, "#e8e0d4"), ...lyingLounger(2.3, -0.85, "#e8e0d4")]),
      piece("quintal", "Varal", "👕", "Outros", clothesline(R(0.1, -0.5, 1.3, 0.1))),
      piece("catio", "Cobertura do catio", "🏠", "Outros", roof(R(4.19, -1.56, 5.78, 1.45))),
      piece("catio", "Torre para gatos", "🐈", "Pets", catTree(4.4, -1.5, 1.7, "#d6cfc6")),
      piece("catio", "Prateleiras no muro", "🐈", "Pets", catShelves([[5.3, -1.6, 0.55], [5.9, -1.6, 0.9], [6.5, -1.6, 1.2]], "n", birch)),
      piece("catio", "Rede", "🐈", "Pets", hammock(R(7.3, -1.1, 1.4, 0.1), blush)),
      piece("catio", "Grama de gato", "🌱", "Pets", [...plant(9.2, -1.5, 0.45, "#8fa38c"), ...plant(9.3, -0.85, 0.4, "#8fa38c")]),
      piece("catio", "Caixa de areia", "🐈", "Pets", litterBox(8.6, -0.6, "s")),
      piece("catio", "Tela de proteção", "🕸️", "Pets", catNet()),
    ],
  };
}

/** Espreguiçadeira deitada ao longo do muro (gira 90°). */
function lyingLounger(x: number, z: number, fabric: string): Part[] {
  return lounger(x, z, fabric).map((p) => ({ ...p, x: x + (p.z - z), z: z + (p.x - x), w: p.d, d: p.w }));
}

export const PROPOSALS: Proposal[] = [proposalA(), proposalB(), proposalC()];

/** A casa com a proposta: troca a área externa, os pisos e os móveis (as louças ficam). */
export function withProposal(home: Home, proposal: Proposal | null): Home {
  if (!proposal) return home;
  return {
    ...home,
    rooms: [
      ...home.rooms
        .filter((r) => !r.outdoor)
        .map((r) => (proposal.floors?.[r.id] ? { ...r, floor: proposal.floors[r.id] } : r)),
      ...proposal.outdoor,
    ],
    // Construção que fica (louças, shafts, muro) e a proposta por cima.
    pieces: [...home.pieces.filter((p) => p.fixed), ...proposal.pieces],
  };
}
