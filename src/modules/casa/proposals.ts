import type { FloorKind, Home, Material, Part, Piece, Room, Side } from "./types";

/**
 * A proposta J, montada a partir dos desenhos do João, para ele, a Maki e o Gojo. A planta
 * vazia continua sendo a casa de verdade; a proposta só muda o que se vê.
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
  /** Peças da construção que a proposta tira, como "cozinha:Bancada da pia". */
  remove?: string[];
  /** Pisos trocados (por exemplo, a varanda no mesmo piso da área gourmet). */
  floors?: Record<string, FloorKind>;
  /** Cômodos que viram parte de outro (de → para), como o serviço que vira cozinha. */
  merge?: Record<string, string>;
  /** Nomes novos para os cômodos, já depois de juntar. */
  rename?: Record<string, string>;
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

/** Mostra as peças inteiras no 3D, sem o corte da altura (armários planejados e TVs). */
const full = (parts: Part[]): Part[] => parts.map((p) => ({ ...p, full: true }));

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

function bed(r: Rect, back: Side, duvet: string, frame = "#9a6b45", pillow?: string, headboard = frame): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    // A base começa depois da cabeceira, para as duas não se atravessarem.
    at(0, 0.07, W, D - 0.07, 0.28, "madeira", 0, frame),
    at(0, 0, W, 0.07, 1.0, headboard === frame ? "madeira" : "tecido", 0, headboard),
    at(0.04, 0.08, W - 0.08, D - 0.12, 0.2, "branco", 0.28),
    at(0.02, 0.62, W - 0.04, D - 0.66, 0.05, "tecido", 0.48, duvet),
    at(0.1, 0.14, W / 2 - 0.15, 0.36, 0.1, pillow ? "tecido" : "branco", 0.48, pillow),
    at(W / 2 + 0.05, 0.14, W / 2 - 0.15, 0.36, 0.1, pillow ? "tecido" : "branco", 0.48, pillow),
  ];
}

function wardrobe(r: Rect, back: Side, color = "#efe9df"): Part[] {
  const { W, D, at } = placer(r, back);
  // Caixa um pouco mais escura e portas na frente, com uma fresta entre elas.
  const out = [at(0, 0, W, D - 0.02, 2.1, "branco", 0, "#b9b2a7")];
  const doors = Math.max(2, Math.round(W / 0.5));
  const dw = W / doors;
  for (let i = 0; i < doors; i++) out.push(at(i * dw + 0.005, D - 0.022, dw - 0.01, 0.022, 2.1, "branco", 0, color));
  return out;
}

function sofa(r: Rect, back: Side, fabric: string, seats = 3, cushion = fabric): Part[] {
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
  for (let i = 0; i < seats; i++) out.push(at(arm + i * seatW + 0.03, 0.2, seatW - 0.06, 0.14, 0.38, "tecido", 0.44, cushion));
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

/** Cadeira de 44 cm com o encosto do lado `back`; `seat` põe um assento estofado nessa cor. */
function chair(x: number, z: number, back: Side, color: string, size = 0.44, seat?: string): Part[] {
  const { W, at } = placer(R(x, z, size, size), back);
  return [
    seat ? at(0.02, 0.04, W - 0.04, size - 0.06, 0.05, "tecido", 0.44, seat) : at(0, 0, W, size, 0.04, "madeira", 0.44, color),
    at(0, 0, W, 0.04, 0.42, "madeira", 0.48, color),
    at(0.03, 0.03, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(W - 0.065, 0.03, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(0.03, size - 0.065, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
    at(W - 0.065, size - 0.065, 0.035, 0.035, 0.44, "escuro", 0, "#3d3833"),
  ];
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

function desk(r: Rect, back: Side, top: string, legs = "#3d3833"): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    at(0, 0, W, D, 0.03, "madeira", 0.72, top),
    at(0.02, 0.02, 0.04, D - 0.04, 0.72, "escuro", 0, legs),
    at(W - 0.06, 0.02, 0.04, D - 0.04, 0.72, "escuro", 0, legs),
    at(W / 2 - 0.3, 0.05, 0.6, 0.04, 0.38, "escuro", 0.76, "#1c1f24"),
  ];
}

function officeChair(x: number, z: number, color: string, back: Side = "s"): Part[] {
  // Assento de 50 cm com o encosto do lado `back`: a pessoa fica virada para o lado oposto.
  const { at } = placer(R(x, z, 0.5, 0.5), back);
  return [
    part(x + 0.22, z + 0.22, 0.06, 0.06, 0.45, "metal"),
    part(x, z, 0.5, 0.5, 0.06, "tecido", 0.45, color),
    at(0, 0, 0.5, 0.08, 0.5, "tecido", 0.5, color),
  ];
}

function fridge(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  return [at(0, 0, W, D, 1.85, "metal", 0, "#d9dcdf"), at(W - 0.08, D, 0.03, 0.03, 0.6, "escuro", 0.9)];
}

function washer(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  return [at(0, 0, W, D, 0.85, "branco", 0, "#f4f4f2"), at(W / 2 - 0.15, D, 0.3, 0.01, 0.3, "vidro", 0.35)];
}

function tallCabinet(r: Rect, back: Side, color = "#efe9df"): Part[] {
  return wardrobe(r, back, color).map((p) => ({ ...p, h: Math.min(p.h, 1.9) }));
}

// Gatos

function catShelves(points: [number, number, number][], back: Side, wood = "#b08a5f"): Part[] {
  return points.map(([x, z, y]) => {
    const wide = back === "n" || back === "s";
    return part(x, z, wide ? 0.4 : 0.25, wide ? 0.25 : 0.4, 0.04, "madeira", y, wood);
  });
}

// Área externa

/**
 * Telhado que sai da parede do apartamento (`r.z + r.d`) e desce até a ponta de fora (`r.z`),
 * para a água escorrer. Ele se apoia no muro do fundo, sem pilares, e passa um pouco por
 * cima dele para a água cair do outro lado. As peças são caixas retas, então a inclinação
 * vira degraus.
 */
function slopedRoof(r: Rect, steps = 6): Part[] {
  const out: Part[] = [];
  const sd = r.d / steps;
  for (let i = 0; i < steps; i++) out.push(part(r.x, r.z + r.d - (i + 1) * sd, r.w, sd + 0.01, 0.03, "cobertura", 2.75 - i * 0.07));
  return out;
}

function clothesline(r: Rect): Part[] {
  return [part(r.x, r.z, 0.06, 0.06, 1.8, "metal"), part(r.x + r.w - 0.06, r.z, 0.06, 0.06, 1.8, "metal"), part(r.x, r.z, r.w, 0.02, 0.02, "metal", 1.75)];
}

// ---------- Propostas ----------

const garden = (id: string, name: string, rects: Room["rects"], floor: FloorKind, label: [number, number], catio = true): Room => ({
  id, name, rects, floor, label, outdoor: true, catio,
});

/**
 * Suíte da J: janela no meio da parede de cima, cama com a cabeceira na parede do lado
 * de fora, painel com TV na frente dela, guarda-roupa na parede do banheiro e o frigobar
 * ao lado do painel.
 */
function suiteJ(frame: string, duvet: string, accent: string): Piece[] {
  return [
    piece("suite", "Cama viúva", "🛏️", "Móveis", bed(R(7.99, 0.15, 1.88, 1.28), "e", duvet, frame, accent, accent)),
    piece("suite", "Guarda-roupa de correr", "🚪", "Móveis", full(wardrobe(R(7.97, 2.13, 1.9, 0.55), "s"))),
    piece("suite", "Painel e TV", "📺", "Eletrônicos", full([
      part(6.79, 0.17, 0.28, 1.25, 0.32, "madeira", 0.3, frame),
      part(6.81, 0.22, 0.04, 1.15, 0.66, "escuro", 0.95, "#1c1f24"),
    ])),
    piece("suite", "Frigobar", "🧊", "Eletrodomésticos", [
      part(6.79, 1.55, 0.42, 0.44, 0.85, "branco", 0, "#eef0f1"),
      part(7.21, 1.57, 0.03, 0.03, 0.3, "escuro", 0.45),
    ]),
  ];
}

/** Bancada planejada: armário embaixo, tampo de pedra e as frestas das portas na frente. */
function plannedCounter(r: Rect, front: Side, cabinet: string, top: string): Part[] {
  const out = [part(r.x, r.z, r.w, r.d, 0.86, "madeira", 0, cabinet), part(r.x, r.z, r.w, r.d, 0.04, "pedra", 0.86, top)];
  const along = front === "n" || front === "s" ? r.w : r.d;
  const doors = Math.max(1, Math.round(along / 0.45));
  for (let i = 1; i < doors; i++) {
    const t = (along / doors) * i;
    if (front === "e") out.push(part(r.x + r.w, r.z + t - 0.004, 0.006, 0.008, 0.7, "escuro", 0.1, "#6b5a48"));
    if (front === "s") out.push(part(r.x + t - 0.004, r.z + r.d, 0.008, 0.006, 0.7, "escuro", 0.1, "#6b5a48"));
  }
  return out;
}

function proposalJ(): Proposal {
  seq = 600;
  // Azul Nishi como detalhe: cadeiras, cabeceiras, fronhas e almofadas do sofá. Mesas brancas e chão branco.
  const nishi = "#1e3d66";
  const white = "#f4f4f1";
  const seatJ = (x: number, z: number, back: Side) => chair(x, z, back, nishi, 0.44, nishi);
  return {
    id: "j",
    name: "Do João",
    tagline: "Montada com os seus desenhos, um cômodo de cada vez: suíte, escritório, sala, cozinha e a área de fora com serviço e cobertura.",
    highlights: [
      "Suíte: janela no meio da parede de cima, cama com a cabeceira na parede do lado, painel com TV na frente, frigobar ao lado e guarda-roupa de correr na parede do banheiro.",
      "Escritório: cama de solteiro no fundo, embaixo da janela, e a mesa preta de 1,70 m com o computador na parede da sala, até o canto da porta.",
      "Cozinha em L, que agora inclui o antigo serviço: bancada de ponta a ponta, pia embaixo da janela, cooktop de 4 bocas e armários em cima e embaixo.",
      "Sala inteira, sem divisão: sofá e TV no lado da varanda, com porta de vidro de correr, e mesa para 6 no meio.",
      "Área de fora: serviço no canto da cozinha (máquina, tanque, armário e varal) e cobertura da parede da esquerda até perto da janela do escritório, para os gatos ficarem no seco.",
    ],
    notes: {
      suite: [
        "A janela fica no meio da parede de cima, para a área externa. A cama foi para a parede do lado, com a cabeceira na parede de fora, e a janela fica livre.",
        "Painel e TV na parede da frente, a uns 90 cm do pé da cama, com o frigobar do lado.",
        "Guarda-roupa de correr na parede do banheiro, com uns 70 cm livres entre ele e a cama.",
      ],
      quarto: [
        "Cama de solteiro (88 × 188 cm) deitada ao longo da parede da janela, com a cabeceira na parede da sala.",
        "Mesa preta de 1,70 m com 60 cm de fundo na parede da sala, até o canto da porta, com a cadeira preta, e o meio do escritório livre.",
      ],
      estar: [
        "Sala inteira: o antigo jantar e o antigo estar viram um cômodo só.",
        "Sofá de 2 lugares (1,70 × 0,90 m) com o encosto na parede da cozinha, de frente para a TV a 1,6 m: bom para uma TV de até 50\".",
        "O sofá tampa parte da abertura da cozinha; a passagem para o estar fica com uns 85 cm, entre o sofá e a parede de baixo.",
        "Entre o sofá e o móvel da TV sobra 1,2 m para chegar à porta de vidro.",
        "Mesa de 1,40 × 0,80 m: 70 cm por pessoa nas laterais, que é o confortável, e 80 cm nas pontas.",
        "Ela fica no meio da parte de baixo da sala, longe do sofá e da cozinha: entre a cozinha e a ponta da mesa sobram 80 cm livres, e a entrada fica desimpedida.",
        "Da mesa até a parede de baixo ficam 62 cm, o suficiente para sentar. O caminho da entrada para os quartos passa por cima da mesa, com uns 50 cm, e pela ponta do lado do banheiro, com 70 cm.",
      ],
      cozinha: [
        "Bancada planejada de 60 cm de fundo, do canto do shaft até a geladeira (2,5 m), com cooktop de 4 bocas e armários embaixo e aéreos em cima.",
        "Em cima do cooktop fica um vão para a coifa, sem armário.",
        "A pia sai da parede da cozinha e vai para baixo da janela, na ponta do L. Ali só tem armário embaixo, porque a janela ocupa a parede.",
        "O tanque e a máquina de lavar foram para fora, no canto da área de serviço externa.",
      ],
      varanda: [
        "Porta de vidro de correr de ponta a ponta entre a sala e a varanda.",
        "Cantinho dos gatos suspenso na parede da cozinha, do lado do sofá: dois degraus (35 e 70 cm), uma cama com almofada a 95 cm no canto e uma prateleira mirante a 1,15 m. O chão da varanda fica livre.",
      ],
      servicoext: [
        "Encostado na parede da cozinha, do lado de fora: tanque, máquina de lavar e um armário alto para produtos e vassouras.",
        "Varal de chão na frente, e o telhado protege tudo da chuva.",
      ],
      coberta: [
        "Telhado da parede do apartamento até o fim da área externa, da parede da esquerda até um pouco antes da janela do escritório. Ele desce para fora e se apoia no muro do fundo, sem pilares: termina passando um pouco por cima do muro, e a água escorre do outro lado.",
        "Os gatos podem ficar aqui fora sem tomar chuva.",
      ],
    },
    remove: ["cozinha:Bancada da pia", "servico:Tanque"],
    merge: { servico: "cozinha", jantar: "estar" },
    rename: { estar: "Sala", quarto: "Escritório" },
    floors: Object.fromEntries(["estar", "cozinha", "varanda", "quarto", "suite", "banhosuite", "circ", "banho"].map((id) => [id, "branco" as FloorKind])),
    outdoor: [
      garden("servicoext", "Área de serviço", [[-0.11, -1.56, 1.9, 1.45], [-0.11, -0.11, 1.76, 0.3]], "pedra", [0.8, -1.3], false),
      garden("coberta", "Área coberta", [[1.79, -1.56, 3.0, 1.45], [1.65, -0.11, 2.54, 0.51]], "deck", [3.3, -0.85]),
      garden("externa", "Área externa", [[4.79, -1.56, 5.18, 1.45]], "grama", [7.2, -0.85], false),
    ],
    pieces: [
      ...suiteJ(white, "#e9e4da", nishi),
      // Varanda: cantinho suspenso dos gatos na parede da cozinha, do lado do sofá.
      piece("varanda", "Cantinho suspenso dos gatos", "🐈", "Pets", [
        ...catShelves([[1.7, 1.0, 0.35], [1.7, 0.95, 0.7]], "w", white),
        part(1.7, 0.45, 0.55, 0.5, 0.04, "madeira", 0.95, white),
        part(1.72, 0.47, 0.5, 0.46, 0.06, "tecido", 0.99, nishi),
        part(1.98, 0.45, 0.27, 0.02, 0.2, "madeira", 0.99, white),
        part(2.25, 0.45, 0.02, 0.5, 0.2, "madeira", 0.99, white),
        part(2.3, 0.45, 0.4, 0.25, 0.04, "madeira", 1.15, white),
      ]),
      // Área de fora: serviço no canto da cozinha e cobertura até perto da janela do escritório.
      { ...piece("servicoext", "Tanque", "🧺", "Móveis", [part(-0.01, -0.36, 0.55, 0.55, 0.9, "branco")]), fixture: { kind: "tanque", x: -0.01, z: -0.36, w: 0.55, d: 0.55, wall: "s" } },
      piece("servicoext", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(0.58, -0.46, 0.6, 0.65), "s")),
      piece("servicoext", "Armário de serviço", "🧹", "Móveis", full(tallCabinet(R(1.22, -0.36, 0.4, 0.55), "s", white))),
      piece("servicoext", "Varal de chão", "👕", "Móveis", clothesline(R(0.0, -1.3, 1.5, 0.06))),
      piece("coberta", "Telhado inclinado", "🏠", "Obras", slopedRoof(R(-0.11, -1.86, 4.9, 2.05))),
      piece("cozinha", "Bancada planejada", "🗄️", "Móveis", [
        ...plannedCounter(R(-0.01, 0.89, 0.61, 2.51), "e", "#e4d6c2", "#3b3a38"),
        ...plannedCounter(R(0.22, 0.29, 0.53, 0.6), "s", "#e4d6c2", "#3b3a38"),
      ]),
      // A pia segue a bancada planejada do lado: mesmo armário e mesma pedra.
      { ...piece("servico", "Pia", "🚰", "Móveis", [part(0.75, 0.29, 0.85, 0.6, 0.9, "madeira", 0, "#e4d6c2")]), fixture: { kind: "bancada", x: 0.75, z: 0.29, w: 0.85, d: 0.6, wall: "n", colors: { cabinet: "#e4d6c2", stone: "#3b3a38" } } },
      piece("cozinha", "Cooktop 4 bocas", "🍳", "Eletrodomésticos", [
        part(0.06, 1.28, 0.5, 0.58, 0.012, "escuro", 0.9, "#1c1f24"),
        ...[[0.12, 1.36], [0.36, 1.36], [0.12, 1.62], [0.36, 1.62]].map(([x, z]) => part(x, z, 0.13, 0.13, 0.01, "metal", 0.912)),
      ]),
      piece("cozinha", "Armários aéreos", "🗄️", "Móveis", full([
        part(-0.01, 0.89, 0.35, 0.36, 0.7, "madeira", 1.5, "#e4d6c2"),
        part(-0.01, 1.92, 0.35, 1.48, 0.7, "madeira", 1.5, "#e4d6c2"),
        ...[1.07, 2.29, 2.66, 3.03].map((z) => part(0.34, z, 0.006, 0.008, 0.66, "escuro", 1.52, "#6b5a48")),
      ])),
      piece("cozinha", "Geladeira", "🧊", "Eletrodomésticos", full(fridge(R(-0.01, 3.42, 0.7, 0.66), "w"))),
      piece("estar", "Mesa de 6 lugares", "🍽️", "Móveis", table(R(3.0, 4.0, 1.4, 0.8), white, "#e2e2de")),
      piece("estar", "Cadeiras", "🪑", "Móveis", [
        ...seatJ(3.18, 3.53, "n"), ...seatJ(3.78, 3.53, "n"),
        ...seatJ(3.18, 4.83, "s"), ...seatJ(3.78, 4.83, "s"),
        ...seatJ(2.53, 4.18, "w"), ...seatJ(4.43, 4.18, "e"),
      ]),
      piece("jantar", "Sofá 2 lugares", "🛋️", "Móveis", sofa(R(1.7, 1.55, 0.9, 1.7), "w", "#d9d2c4", 2, nishi)),
      piece("jantar", "Rack e TV", "📺", "Eletrônicos", full(rackTv(R(3.82, 1.6, 0.4, 1.45), "e", nishi))),
      piece("varanda", "Porta de vidro", "🪟", "Outros", [
        part(1.7, 1.42, 2.49, 0.04, 2.1, "vidro"),
        part(1.7, 1.42, 2.49, 0.05, 0.03, "metal"),
        part(2.95, 1.42, 0.04, 0.05, 2.1, "metal"),
      ]),
      piece("quarto", "Cama de solteiro", "🛏️", "Móveis", bed(R(4.29, -0.01, 1.88, 0.88), "w", "#e9e4da", white, nishi, nishi)),
      piece("quarto", "Mesa com computador", "💻", "Móveis", desk(R(4.29, 1.27, 0.6, 1.7), "w", "#1f1f22", "#2b2b2e")),
      piece("quarto", "Cadeira de escritório", "🪑", "Móveis", officeChair(4.95, 1.87, "#1f1f22", "e")),
    ],
  };
}

export const PROPOSALS: Proposal[] = [proposalJ()];

/**
 * A casa com a proposta: troca a área externa, os pisos e os móveis (as louças ficam).
 * Sem proposta, a planta fica 100% vazia: só paredes e cômodos, sem nem as louças da construção.
 */
export function withProposal(home: Home, proposal: Proposal | null): Home {
  if (!proposal) return { ...home, pieces: home.pieces.filter((p) => !p.fixed) };
  const merge = proposal.merge ?? {};
  const indoor = home.rooms.filter((r) => !r.outdoor);
  const rooms = indoor
    .filter((r) => !merge[r.id])
    .map((r) => {
      const parts = [r, ...indoor.filter((o) => merge[o.id] === r.id)];
      const rects = parts.flatMap((o) => o.rects);
      const label: [number, number] = parts.length > 1 ? mergedLabel(rects) : r.label;
      return { ...r, rects, label, name: proposal.rename?.[r.id] ?? r.name, floor: proposal.floors?.[r.id] ?? r.floor };
    });
  const roomOf = (id: string) => merge[id] ?? id;
  return {
    ...home,
    rooms: [...rooms, ...proposal.outdoor],
    // Construção que fica (louças, shafts, muro) e a proposta por cima.
    pieces: [
      ...home.pieces.filter((p) => p.fixed && !proposal.remove?.includes(`${p.roomId}:${p.name}`)),
      ...proposal.pieces,
    ].map((p) => (merge[p.roomId] ? { ...p, roomId: roomOf(p.roomId) } : p)),
  };
}

/** Etiqueta no meio do retângulo maior de um cômodo juntado. */
function mergedLabel(rects: Room["rects"]): [number, number] {
  const [x, z, w, d] = rects.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a));
  return [x + w / 2, z + d / 2];
}
