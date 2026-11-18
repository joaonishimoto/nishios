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
  for (let i = 0; i < steps; i++) out.push(part(r.x, r.z + r.d - (i + 1) * sd, r.w, sd + 0.01, 0.03, "cobertura", 2.9 - i * 0.05));
  return full(out);
}

/**
 * Porta de vidro de correr com duas folhas em trilhos paralelos: a folha de fora fica fixa
 * do lado esquerdo e a de dentro corre por cima dela. Perfil de alumínio prata, vidro
 * inteiro com travessas finas, trilho no chão e puxador vertical na folha que corre.
 * Tudo abaixo de 2 m para o 3D não jogar o alto da porta para cima das paredes.
 */
function slidingDoor(x0: number, x1: number, z: number, frame = "#b8bec6"): Part[] {
  const H = 2.08, P = 0.045, RAIL = 0.07, D = 0.035, overlap = 0.08;
  const leafW = (x1 - x0 + overlap) / 2;
  const leaf = (x: number, lz: number): Part[] => [
    part(x + P, lz + 0.01, leafW - 2 * P, 0.012, H - 2 * RAIL, "vidro", RAIL),
    part(x, lz, P, D, H, "metal", 0, frame),
    part(x + leafW - P, lz, P, D, H, "metal", 0, frame),
    part(x, lz, leafW, D, RAIL, "metal", 0, frame),
    part(x, lz, leafW, D, RAIL, "metal", H - RAIL - 0.01, frame),
  ];
  return full([
    part(x0, z - 0.05, x1 - x0, 0.1, 0.015, "metal", 0, frame),
    ...leaf(x0, z - 0.045),
    ...leaf(x1 - leafW, z + 0.01),
    part(x1 - leafW + 0.06, z + 0.045, 0.025, 0.03, 0.45, "metal", 0.85, frame),
  ]);
}

// ---------- Propostas ----------

const garden = (id: string, name: string, rects: Room["rects"], floor: FloorKind, label: [number, number], catio = true): Room => ({
  id, name, rects, floor, label, outdoor: true, catio,
});

/**
 * Suíte da J: janela no meio da parede de cima, cama com a cabeceira na parede do lado
 * de fora, painel com TV na frente dela e guarda-roupa na parede do banheiro. O frigobar
 * saiu por enquanto.
 */
function suiteJ(frame: string, duvet: string, accent: string): Piece[] {
  return [
    piece("suite", "Cama viúva", "🛏️", "Móveis", bed(R(7.99, 0.15, 1.88, 1.28), "e", duvet, frame, accent, accent)),
    piece("suite", "Guarda-roupa de correr", "🚪", "Móveis", full(wardrobe(R(7.97, 2.13, 1.9, 0.55), "s"))),
    piece("suite", "Painel e TV", "📺", "Eletrônicos", full([
      part(6.79, 0.17, 0.28, 1.25, 0.32, "madeira", 0.3, frame),
      part(6.81, 0.22, 0.04, 1.15, 0.66, "escuro", 0.95, "#1c1f24"),
    ])),
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

function proposalJ(start = 600): Proposal {
  seq = start;
  // Azul Nishi como detalhe: sofá, cabeceiras e fronhas. Mesas, cadeiras da mesa, rack e chão brancos.
  const nishi = "#1e3d66";
  const white = "#f4f4f1";
  const seatJ = (x: number, z: number, back: Side) => chair(x, z, back, white, 0.44, white);
  return {
    id: "j",
    name: "Do João",
    tagline: "Montada com os seus desenhos, um cômodo de cada vez: suíte, escritório, sala, cozinha e a área de fora com serviço e cobertura.",
    highlights: [
      "Suíte: janela no meio da parede de cima, cama com a cabeceira na parede do lado, painel com TV na frente e guarda-roupa de correr na parede do banheiro.",
      "Escritório: cama de solteiro no fundo, embaixo da janela, e a mesa preta de 1,70 m com o computador na parede da sala, até o canto da porta.",
      "Cozinha em L, que agora inclui o antigo serviço: bancada de ponta a ponta, pia embaixo da janela, cooktop de 4 bocas e armários em cima e embaixo.",
      "Sala inteira, sem divisão: sofá e TV no lado da varanda, com porta de vidro de correr, e mesa para 6 no meio.",
      "Área de fora: serviço no canto da cozinha (máquina, tanque e armário) e cobertura da parede da esquerda até perto da janela do escritório, para os gatos ficarem no seco.",
    ],
    notes: {
      suite: [
        "A janela fica no meio da parede de cima, para a área externa. A cama foi para a parede do lado, com a cabeceira na parede de fora, e a janela fica livre.",
        "Painel e TV na parede da frente, a uns 90 cm do pé da cama.",
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
        "Atrás do sofá, na abertura da cozinha, uma mureta de 1 m (um pouco mais alta que o encosto, de 78 cm) com um balcãozinho de pedra de 32 cm. Ele avança para o lado da cozinha, onde ainda sobram uns 80 cm de passagem.",
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
        "Na parede da cozinha, do lado do sofá: um armário branco de 90 × 45 cm e 72 cm de altura, com duas portas, para ração, areia e brinquedos. Em cima dele, uma casinha azul com a entrada redonda virada para a varanda e o telhadinho branco.",
      ],
      servicoext: [
        "Encostado na parede da cozinha, do lado de fora: tanque, máquina de lavar e um armário alto para produtos e vassouras.",
        "O telhado protege tudo da chuva, e a frente fica livre.",
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
      // Varanda: armário baixo para as coisas dos gatos, com uma casinha de entrada redonda em cima.
      piece("varanda", "Casinha dos gatos com armário", "🐈", "Pets", [
        part(1.7, 0.45, 0.45, 0.9, 0.72, "madeira", 0, white),
        part(2.15, 0.9, 0.006, 0.008, 0.6, "escuro", 0.06, "#9a958c"),
        part(2.14, 0.84, 0.012, 0.02, 0.1, "metal", 0.33),
        part(2.14, 0.94, 0.012, 0.02, 0.1, "metal", 0.33),
        part(1.72, 0.6, 0.42, 0.6, 0.42, "tecido", 0.72, nishi),
        // Entrada redonda: faixas de larguras diferentes formando um círculo de 20 cm.
        ...[0.1, 0.16, 0.19, 0.2, 0.19, 0.16, 0.1].map((w, i) => part(2.141, 0.9 - w / 2, 0.01, w, 0.03, "escuro", 0.79 + i * 0.028, "#141a24")),
        part(1.7, 0.57, 0.46, 0.66, 0.04, "madeira", 1.14, white),
        part(1.74, 0.62, 0.38, 0.56, 0.04, "madeira", 1.18, white),
      ]),
      // Área de fora: serviço no canto da cozinha e cobertura até perto da janela do escritório.
      { ...piece("servicoext", "Tanque", "🧺", "Móveis", [part(-0.01, -0.36, 0.55, 0.55, 0.9, "branco")]), fixture: { kind: "tanque", x: -0.01, z: -0.36, w: 0.55, d: 0.55, wall: "s" } },
      piece("servicoext", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(0.58, -0.46, 0.6, 0.65), "s")),
      piece("servicoext", "Armário de serviço", "🧹", "Móveis", full(tallCabinet(R(1.22, -0.36, 0.4, 0.55), "s", white))),
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
      piece("jantar", "Sofá 2 lugares", "🛋️", "Móveis", sofa(R(1.7, 1.55, 0.9, 1.7), "w", nishi, 2, nishi)),
      // Mureta de 1 m na abertura da cozinha, atrás do sofá, com um balcãozinho de pedra em cima.
      piece("jantar", "Balcão na mureta", "🍸", "Móveis", [
        part(1.6, 2.17, 0.1, 1.08, 1.0, "branco", 0, "#fbfbf9"),
        part(1.4, 2.17, 0.32, 1.08, 0.04, "pedra", 1.0, "#3b3a38"),
      ]),
      piece("jantar", "Rack e TV", "📺", "Eletrônicos", full(rackTv(R(3.82, 1.6, 0.4, 1.45), "e", white))),
      piece("varanda", "Porta de vidro", "🪟", "Outros", slidingDoor(1.7, 4.19, 1.44)),
      piece("quarto", "Cama de solteiro", "🛏️", "Móveis", bed(R(4.29, -0.01, 1.88, 0.88), "w", "#e9e4da", white, nishi, nishi)),
      piece("quarto", "Mesa com computador", "💻", "Móveis", desk(R(4.29, 1.27, 0.6, 1.7), "w", "#1f1f22", "#2b2b2e")),
      piece("quarto", "Cadeira de escritório", "🪑", "Móveis", officeChair(4.95, 1.87, "#1f1f22", "e")),
    ],
  };
}

// ---------- A, B, C e D: a J completa ----------
// Cada uma parte da J sem mudar nada dela e completa o que falta: banheiros, sala e a área
// externa do fundo (x 4,79 a 9,87, com 1,45 m entre a casa e o muro).

const EXT = { x0: 4.79, x1: 9.87, z0: -1.56, z1: -0.11 };

function plant(x: number, z: number, size = 0.4, tall = 0.9): Part[] {
  return [
    part(x, z, size, size, 0.35, "pedra", 0, "#cfc8bc"),
    part(x + size * 0.1, z + size * 0.1, size * 0.8, size * 0.8, tall - 0.35, "planta", 0.35),
  ];
}

function rug(r: Rect, color: string): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.012, "tapete", 0, color)];
}

function raisedBed(r: Rect, wood = "#8d6748"): Part[] {
  return [part(r.x, r.z, r.w, r.d, 0.45, "madeira", 0, wood), part(r.x + 0.04, r.z + 0.04, r.w - 0.08, r.d - 0.08, 0.2, "planta", 0.45)];
}

function gardenBench(r: Rect, back: Side, wood: string): Part[] {
  const { W, D, at } = placer(r, back);
  return [
    at(0, 0, W, D, 0.05, "madeira", 0.42, wood),
    at(0, 0, W, 0.05, 0.4, "madeira", 0.47, wood),
    at(0.05, 0.05, 0.06, D - 0.1, 0.42, "escuro", 0, "#3d3833"),
    at(W - 0.11, 0.05, 0.06, D - 0.1, 0.42, "escuro", 0, "#3d3833"),
  ];
}

function bbq(r: Rect): Part[] {
  return [
    part(r.x, r.z, r.w, r.d, 0.85, "pedra", 0, "#8a8178"),
    part(r.x + 0.08, r.z + 0.06, r.w - 0.16, r.d - 0.12, 0.03, "escuro", 0.85, "#2a2a2c"),
    part(r.x + r.w / 2 - 0.15, r.z, 0.3, 0.3, 0.35, "pedra", 0.88, "#8a8178"),
  ];
}

/**
 * Banheira da hidro, oca: borda branca de 10 cm, fundo a 25 cm, dois bancos por dentro,
 * água azul até 13 cm abaixo da borda, apoios de cabeça e jatos nas paredes.
 */
function tubShell(r: Rect, top: number, shell: string): Part[] {
  const b = 0.1, floor = 0.25, seat = 0.38, jet = "#9aa3ab";
  const inX = r.x + b, inZ = r.z + b, inW = r.w - 2 * b, inD = r.d - 2 * b;
  const long = inW >= inD;
  const seats = long
    ? [part(inX, inZ, inW, seat, 0.2, "branco", floor, shell), part(inX, inZ + inD - seat, inW, seat, 0.2, "branco", floor, shell)]
    : [part(inX, inZ, seat, inD, 0.2, "branco", floor, shell), part(inX + inW - seat, inZ, seat, inD, 0.2, "branco", floor, shell)];
  const jets: Part[] = [];
  for (let i = 1; i <= 3; i++) {
    const f = i / 4;
    if (long) jets.push(part(inX + inW * f, inZ, 0.05, 0.01, 0.05, "escuro", 0.5, jet), part(inX + inW * f, inZ + inD - 0.01, 0.05, 0.01, 0.05, "escuro", 0.5, jet));
    else jets.push(part(inX, inZ + inD * f, 0.01, 0.05, 0.05, "escuro", 0.5, jet), part(inX + inW - 0.01, inZ + inD * f, 0.01, 0.05, 0.05, "escuro", 0.5, jet));
  }
  const pillow = (x: number, z: number, w: number, d: number) => part(x, z, w, d, 0.06, "tecido", top - 0.02, "#d9d6cf");
  return [
    part(r.x, r.z, r.w, r.d, floor, "branco", 0, shell),
    part(r.x, r.z, r.w, b, top - floor, "branco", floor, shell),
    part(r.x, r.z + r.d - b, r.w, b, top - floor, "branco", floor, shell),
    part(r.x, r.z + b, b, r.d - 2 * b, top - floor, "branco", floor, shell),
    part(r.x + r.w - b, r.z + b, b, r.d - 2 * b, top - floor, "branco", floor, shell),
    ...seats,
    ...jets,
    ...(long
      ? [pillow(r.x + 0.2, r.z, 0.35, b), pillow(r.x + r.w - 0.55, r.z + r.d - b, 0.35, b)]
      : [pillow(r.x, r.z + 0.2, b, 0.35), pillow(r.x + r.w - b, r.z + r.d - 0.55, b, 0.35)]),
    ...full([part(inX, inZ, inW, inD, top - 0.13 - floor, "vidro", floor, "#5fb3cf")]),
  ];
}

/** Hidromassagem de alvenaria, com o degrau do lado de fora (oeste). */
function hotTub(r: Rect, shell = "#f4f4f1"): Part[] {
  return [...tubShell(r, 0.7, shell), part(r.x - 0.3, r.z + r.d / 2 - 0.3, 0.3, 0.6, 0.2, "branco", 0, shell)];
}

/**
 * Hidromassagem embutida num deque de madeira: o deque (`deck`) ocupa o canto em volta da
 * hidro (`tub`), que fica com a borda branca 30 cm acima. Degrau do lado de fora (leste).
 */
function deckedTub(deck: Rect, tub: Rect, wood = "#a07a55", shell = "#f4f4f1"): Part[] {
  const H = 0.45;
  const tx1 = tub.x + tub.w, tz1 = tub.z + tub.d, dx1 = deck.x + deck.w, dz1 = deck.z + deck.d;
  return [
    part(deck.x, deck.z, deck.w, tub.z - deck.z, H, "madeira", 0, wood),
    part(deck.x, tz1, deck.w, dz1 - tz1, H, "madeira", 0, wood),
    part(deck.x, tub.z, tub.x - deck.x, tub.d, H, "madeira", 0, wood),
    part(tx1, tub.z, dx1 - tx1, tub.d, H, "madeira", 0, wood),
    ...tubShell(tub, H + 0.3, shell),
    part(dx1, deck.z + deck.d / 2 - 0.35, 0.3, 0.7, 0.22, "madeira", 0, wood),
  ];
}

function catTree(x: number, z: number, plush = "#d9d2c4"): Part[] {
  const sisal = "#cdb68a";
  return [
    part(x, z, 0.5, 0.5, 0.06, "madeira", 0, plush),
    part(x + 0.06, z + 0.06, 0.09, 0.09, 1.2, "madeira", 0, sisal),
    part(x + 0.33, z + 0.33, 0.09, 0.09, 0.8, "madeira", 0, sisal),
    part(x - 0.02, z + 0.02, 0.36, 0.36, 0.05, "tecido", 0.8, plush),
    part(x + 0.05, z + 0.05, 0.4, 0.4, 0.1, "tecido", 1.2, plush),
  ];
}

/** Ripado de madeira encostado no lado de dentro do muro, do chão até o alto (2,2 m). */
function slatScreen(r: Rect, wood = "#8a6447", height = 2.5): Part[] {
  const out: Part[] = [];
  const along = r.w >= r.d;
  const len = along ? r.w : r.d;
  for (let t = 0; t < len - 0.03; t += 0.09) {
    out.push(along ? part(r.x + t, r.z, 0.05, r.d, height, "madeira", 0, wood) : part(r.x, r.z + t, r.w, 0.05, height, "madeira", 0, wood));
  }
  return full(out);
}

/** Espelheira em cima da pia, toalheiro e tapete na frente do box, nos dois banheiros. */
function bathrooms(towel: string, mat: string): Piece[] {
  return [
    piece("banhosuite", "Espelheira", "🪞", "Móveis", full([part(7.86, 2.78, 0.56, 0.12, 0.6, "branco", 1.2, "#f4f4f1"), part(7.88, 2.9, 0.52, 0.01, 0.56, "vidro", 1.22, "#d7e6ea")])),
    piece("banhosuite", "Toalheiro", "🧺", "Móveis", full([part(9.83, 3.5, 0.04, 0.5, 0.03, "metal", 1.1), part(9.8, 3.55, 0.03, 0.4, 0.5, "tecido", 0.65, towel)])),
    piece("banhosuite", "Tapete de banheiro", "🟦", "Móveis", rug(R(8.5, 3.5, 0.55, 0.42), mat)),
    piece("banho", "Espelheira", "🪞", "Móveis", full([part(5.8, 5.3, 0.54, 0.12, 0.6, "branco", 1.2, "#f4f4f1"), part(5.82, 5.29, 0.5, 0.01, 0.56, "vidro", 1.22, "#d7e6ea")])),
    piece("banho", "Toalheiro", "🧺", "Móveis", full([part(7.05, 5.38, 0.04, 0.04, 0.03, "metal", 1.1), part(6.98, 5.39, 0.04, 0.03, 0.5, "tecido", 0.65, towel)])),
    piece("banho", "Tapete de banheiro", "🟦", "Móveis", rug(R(6.55, 4.25, 0.5, 0.45), mat)),
  ];
}

/** Sala: tapete embaixo da mesa de 6 e uma planta no canto do lado do banheiro. */
function salaExtras(rugColor: string): Piece[] {
  return [
    piece("estar", "Tapete da mesa", "🟫", "Móveis", rug(R(2.4, 3.42, 2.6, 1.95), rugColor)),
    piece("estar", "Planta grande", "🪴", "Plantas", plant(5.2, 4.95, 0.42, 1.4)),
  ];
}

interface Extra {
  id: string;
  name: string;
  tagline: string;
  highlights: string[];
  notes: Record<string, string[]>;
  externa: Room;
  pieces: () => Piece[];
  /** Cômodos de fora da J que mudam de nome ou de piso (por id). */
  outdoorChanges?: Record<string, Partial<Room>>;
  /** Peças da J que saem, como "servicoext:Tanque". */
  drop?: string[];
  /** Cômodos em que as notas da J são trocadas pelas da `extra`, em vez de somadas. */
  replaceNotes?: string[];
  /** Troca os destaques da J que começam com "Área de fora" pelos da `extra`. */
  replaceOutdoorHighlight?: boolean;
  /** Destaques da J que saem, pelo começo do texto. */
  dropHighlights?: string[];
}

/** Uma proposta que é a J inteira mais o que a `extra` acrescenta. */
function fromJ(start: number, extra: Extra): Proposal {
  const j = proposalJ(start);
  const pieces = extra.pieces();
  const notes = { ...j.notes };
  for (const [room, list] of Object.entries(extra.notes)) {
    notes[room] = extra.replaceNotes?.includes(room) ? list : [...(notes[room] ?? []), ...list];
  }
  return {
    ...j,
    id: extra.id,
    name: extra.name,
    tagline: extra.tagline,
    highlights: [
      ...j.highlights.filter(
        (h) => !(extra.replaceOutdoorHighlight && h.startsWith("Área de fora")) && !extra.dropHighlights?.some((d) => h.startsWith(d)),
      ),
      ...extra.highlights,
    ],
    notes,
    outdoor: [
      ...j.outdoor.filter((r) => r.id !== "externa").map((r) => ({ ...r, ...extra.outdoorChanges?.[r.id] })),
      extra.externa,
    ],
    pieces: [...j.pieces.filter((p) => !extra.drop?.includes(`${p.roomId}:${p.name}`)), ...pieces],
  };
}

const externa = (floor: FloorKind, catio = false) => garden("externa", "Área externa", [[4.79, -1.56, 5.18, 1.45]], floor, [7.2, -0.85], catio);

const BATH_NOTES = {
  banhosuite: ["Espelheira em cima da pia, toalheiro na parede do lado do box e um tapete na saída do box."],
  banho: ["Espelheira em cima da pia, toalheiro do lado do box e tapete na saída do box. A porta abre encostada na parede da pia sem bater em nada."],
  estar: ["Tapete de 2,60 × 1,95 m embaixo da mesa, largo o bastante para as cadeiras não saírem dele, e uma planta grande no canto do lado do banheiro."],
};

function proposalA(): Proposal {
  return fromJ(700, {
    id: "a",
    name: "J com jardim",
    tagline: "A J completa, com o fundo virando um jardim para sentar e cuidar de plantas.",
    highlights: ["Área externa: canteiros elevados no muro, banco embaixo da janela do escritório, mesinha para dois em frente à suíte e vasos grandes nas pontas."],
    notes: {
      ...BATH_NOTES,
      externa: [
        "Dois canteiros de 1,8 m × 45 cm encostados no muro, na altura do banco, para horta e flores.",
        "Banco de jardim embaixo da janela do escritório e mesinha com duas cadeiras na frente da suíte, deixando 50 cm de passagem no meio.",
      ],
    },
    externa: externa("grama"),
    pieces: () => [
      ...bathrooms("#1e3d66", "#e9e4da"),
      ...salaExtras("#e2ddd2"),
      piece("externa", "Canteiros elevados", "🌱", "Plantas", [...raisedBed(R(5.0, -1.56, 1.8, 0.45)), ...raisedBed(R(7.6, -1.56, 1.8, 0.45))]),
      piece("externa", "Banco de jardim", "🪑", "Móveis", gardenBench(R(5.0, -0.55, 1.2, 0.44), "s", "#a9784c")),
      piece("externa", "Mesa e cadeiras", "☕", "Móveis", [
        ...table(R(8.0, -0.95, 0.6, 0.6), "#f4f4f1", "#2b2b2e", 0.72),
        ...chair(7.5, -0.87, "w", "#1e3d66"),
        ...chair(8.66, -0.87, "e", "#1e3d66"),
      ]),
      piece("externa", "Plantas em vaso", "🪴", "Plantas", [...plant(9.45, -0.6, 0.42, 1.3), ...plant(6.55, -0.55, 0.36, 1.0)]),
    ],
  });
}

function proposalB(): Proposal {
  return fromJ(800, {
    id: "b",
    name: "J com churrasco",
    tagline: "A J completa, com um cantinho de churrasco no fundo, emendando com a área coberta.",
    highlights: ["Área externa: churrasqueira e bancada de apoio no muro logo depois da cobertura, mesa para quatro e jardim vertical no fim."],
    notes: {
      ...BATH_NOTES,
      externa: [
        "Churrasqueira e bancada de apoio encostadas no muro, logo depois do telhado: dá para levar as coisas da cozinha pela varanda.",
        "Mesa de 1,20 × 0,70 m para quatro no meio, com 40 cm de passagem até a casa. A fumaça fica longe das janelas da suíte.",
        "Deque de madeira no chão, mais fácil de limpar que a grama.",
      ],
    },
    externa: externa("deck"),
    pieces: () => [
      ...bathrooms("#e9e4da", "#1e3d66"),
      ...salaExtras("#d6dbe3"),
      piece("externa", "Churrasqueira", "🔥", "Móveis", bbq(R(4.85, -1.56, 0.9, 0.55))),
      piece("externa", "Bancada de apoio", "🗄️", "Móveis", [part(5.8, -1.56, 1.2, 0.55, 0.86, "madeira", 0, "#f4f4f1"), part(5.8, -1.56, 1.2, 0.55, 0.04, "pedra", 0.86, "#3b3a38")]),
      piece("externa", "Mesa e cadeiras", "🍽️", "Móveis", [
        ...table(R(7.3, -0.95, 1.2, 0.7), "#f4f4f1", "#2b2b2e"),
        ...chair(7.45, -1.45, "n", "#1e3d66"), ...chair(8.0, -1.45, "n", "#1e3d66"),
        ...chair(6.82, -0.82, "w", "#1e3d66"), ...chair(8.54, -0.82, "e", "#1e3d66"),
      ]),
      piece("externa", "Jardim vertical", "🌿", "Plantas", full([part(9.2, -1.56, 0.7, 0.06, 1.2, "planta", 0.6), part(9.86, -1.5, 0.06, 1.3, 1.2, "planta", 0.6)])),
    ],
  });
}

function proposalC(): Proposal {
  return fromJ(900, {
    id: "c",
    name: "J com catio",
    tagline: "A J completa, com o fundo todo telado para a Maki e o Gojo e um cantinho de rede para você.",
    highlights: ["Área externa: tela de 50 cm em cima do muro de 2,50 m, torre de arranhar, caminho de prateleiras no muro, grama para os gatos e uma rede."],
    notes: {
      ...BATH_NOTES,
      externa: [
        "Tela de proteção em cima do muro, emendando com a área coberta: os gatos podem ficar em todo o fundo sem fugir.",
        "Torre de 1,2 m perto da janela da suíte, prateleiras em degrau no muro e uma caixa de grama para eles mastigarem.",
        "Rede entre dois suportes na frente do escritório, deixando 50 cm de passagem.",
      ],
    },
    externa: externa("grama", true),
    pieces: () => [
      ...bathrooms("#1e3d66", "#d9d2c4"),
      ...salaExtras("#e2ddd2"),
      piece("externa", "Tela de proteção", "🕸️", "Pets", [...full([part(4.79, -1.66, 5.18, 0.03, 0.5, "tela", 2.5), part(9.94, -1.66, 0.03, 1.55, 0.5, "tela", 2.5)])]),
      piece("externa", "Torre para gatos", "🐈", "Pets", catTree(9.3, -1.45)),
      piece("externa", "Caminho dos gatos", "🐾", "Pets", full(catShelves([[7.0, -1.56, 0.8], [7.6, -1.56, 1.1], [8.2, -1.56, 1.4]], "n", "#f4f4f1"))),
      piece("externa", "Grama para gatos", "🌾", "Pets", raisedBed(R(6.0, -1.56, 0.8, 0.4), "#f4f4f1")),
      piece("externa", "Rede", "🏝️", "Móveis", [
        part(4.95, -1.2, 0.08, 0.08, 1.6, "madeira", 0, "#8d6748"), part(6.75, -1.2, 0.08, 0.08, 1.6, "madeira", 0, "#8d6748"),
        part(5.2, -1.35, 1.35, 0.6, 0.05, "tecido", 0.55, "#1e3d66"),
      ]),
    ],
  });
}

function proposalD(): Proposal {
  return fromJ(1000, {
    id: "d",
    name: "J com spa",
    tagline: "A J completa, com uma hidromassagem branca no fim da área externa e o deque livre.",
    highlights: ["Área externa: hidromassagem branca de 2 m no fim, ripado de madeira no lado de dentro do muro, ducha do lado e plantas, com o resto do deque livre."],
    notes: {
      ...BATH_NOTES,
      externa: [
        "A hidromassagem branca tem 2,00 × 1,40 m, e não 1,50 m: da casa até o muro são 1,45 m, e o ripado ocupa um pouco. Fica no fim, na frente da janela da suíte, com um degrau do lado para entrar.",
        "Ripado de madeira encostado no lado de dentro do muro de 2,50 m, atrás e do lado da hidro, do chão até o alto.",
        "Ducha do lado da hidro para tirar o cloro. A frente do escritório fica livre para circular.",
        "Deque de madeira em todo o fundo.",
      ],
    },
    externa: externa("deck"),
    pieces: () => [
      ...bathrooms("#e9e4da", "#1e3d66"),
      ...salaExtras("#d6dbe3"),
      piece("externa", "Hidromassagem", "🛁", "Móveis", hotTub(R(EXT.x1 - 2.04, EXT.z0 + 0.04, 2.0, 1.4))),
      piece("externa", "Painel ripado", "🪵", "Obras", [...slatScreen(R(7.6, EXT.z0, EXT.x1 - 7.6, 0.03)), ...slatScreen(R(EXT.x1 - 0.03, EXT.z0, 0.03, EXT.z1 - EXT.z0))]),
      piece("externa", "Ducha", "🚿", "Móveis", full([part(7.55, -1.5, 0.3, 0.3, 0.02, "pedra", 0, "#cfc8bc"), part(7.66, -1.45, 0.06, 0.06, 2.1, "metal"), part(7.6, -1.45, 0.2, 0.2, 0.03, "metal", 2.05)])),
      piece("externa", "Plantas em vaso", "🪴", "Plantas", [...plant(7.05, -0.55, 0.38, 1.2), ...plant(7.05, -1.5, 0.38, 1.2)]),
    ],
  });
}

function proposalE(): Proposal {
  return fromJ(1100, {
    id: "e",
    name: "J com hidro coberta",
    tagline: "A J completa, com a hidromassagem embaixo do telhado, no canto onde ficava o serviço.",
    highlights: [
      "Área de fora: a hidromassagem branca vai para o canto da cozinha, embaixo do telhado, com ripado no muro e ducha do lado.",
      "O serviço (tanque, máquina e armário) muda para o muro do fundo da área coberta, ainda embaixo do telhado.",
    ],
    replaceNotes: ["servicoext", "coberta"],
    replaceOutdoorHighlight: true,
    notes: {
      ...BATH_NOTES,
      servicoext: [
        "Hidromassagem branca de 2,00 × 1,40 m no canto, entre o muro e a parede da cozinha, com o degrau do lado da varanda.",
        "Fica embaixo do telhado: dá para usar com chuva, e as folhas não caem na água. A janela da cozinha fica de frente para a hidro.",
        "Ripado de madeira no lado de dentro do muro, do chão até 2,50 m, atrás e do lado da hidro.",
      ],
      coberta: [
        "O serviço vem para cá: tanque, máquina e armário encostados no muro do fundo, embaixo do telhado.",
        "Ducha entre a hidro e o tanque, e a passagem da varanda até a área externa fica com uns 75 cm.",
        "Os gatos continuam podendo ficar aqui fora sem tomar chuva.",
      ],
      externa: ["Gramado livre com dois vasos grandes, para não pesar do lado da suíte e do escritório."],
    },
    outdoorChanges: { servicoext: { name: "Hidro", floor: "deck" } },
    drop: ["servicoext:Tanque", "servicoext:Máquina de lavar", "servicoext:Armário de serviço"],
    externa: externa("grama"),
    pieces: () => [
      ...bathrooms("#1e3d66", "#e9e4da"),
      ...salaExtras("#e2ddd2"),
      piece("servicoext", "Hidromassagem", "🛁", "Móveis", hotTub(R(0.02, EXT.z0 + 0.04, 2.0, 1.4))),
      piece("servicoext", "Painel ripado", "🪵", "Obras", [...slatScreen(R(-0.01, EXT.z0, 2.1, 0.03)), ...slatScreen(R(-0.01, EXT.z0, 0.03, EXT.z1 - EXT.z0))]),
      piece("coberta", "Ducha", "🚿", "Móveis", full([part(2.32, -1.5, 0.3, 0.3, 0.02, "pedra", 0, "#cfc8bc"), part(2.43, -1.45, 0.06, 0.06, 2.1, "metal"), part(2.37, -1.45, 0.2, 0.2, 0.03, "metal", 2.05)])),
      { ...piece("coberta", "Tanque", "🧺", "Móveis", [part(3.0, -1.53, 0.55, 0.55, 0.9, "branco")]), fixture: { kind: "tanque", x: 3.0, z: -1.53, w: 0.55, d: 0.55, wall: "n" } },
      piece("coberta", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(3.58, -1.53, 0.6, 0.65), "n")),
      piece("coberta", "Armário de serviço", "🧹", "Móveis", full(tallCabinet(R(4.21, -1.53, 0.55, 0.4), "n", "#f4f4f1"))),
      piece("externa", "Plantas em vaso", "🪴", "Plantas", [...plant(6.4, -0.55, 0.38, 1.2), ...plant(9.45, -0.6, 0.42, 1.3)]),
    ],
  });
}

function proposalF(): Proposal {
  return fromJ(1200, {
    id: "f",
    name: "J com hidro e churrasco",
    tagline: "A J completa, com hidro e churrasqueira embaixo do telhado, para descansar e fazer churrasco, e a lavanderia coberta no fundo, atrás da suíte.",
    highlights: [
      "Área de fora: hidromassagem branca de 2,00 × 1,50 m com deque em volta, no canto da cozinha e churrasqueira com bancada no muro da área coberta, tudo embaixo do telhado.",
      "Mesa para quatro logo depois da cobertura, e a lavanderia (tanque, máquina e armário) no fundo, atrás da suíte, com um telhadinho próprio.",
    ],
    replaceNotes: ["servicoext", "coberta", "externa"],
    replaceOutdoorHighlight: true,
    notes: {
      ...BATH_NOTES,
      servicoext: [
        "Hidromassagem branca de 2,00 × 1,50 m embutida num deque de madeira de 45 cm, que ocupa o canto inteiro, do muro até a parede da cozinha.",
        "A borda da hidro fica 30 cm acima do deque, e um degrau do lado da churrasqueira ajuda a subir.",
        "Fica embaixo do telhado: dá para usar com chuva, e as folhas não caem na água.",
        "Ripado de madeira no lado de dentro do muro, do chão até 2,50 m, atrás e do lado da hidro.",
      ],
      coberta: [
        "Churrasqueira e bancada de apoio de 95 cm encostadas no muro, ao lado da hidro: quem está na água fica perto de quem está na grelha.",
        "Embaixo do telhado, então o churrasco não para com chuva. Sobram uns 90 cm de passagem da varanda até a área externa.",
        "Os gatos continuam podendo ficar aqui fora sem tomar chuva.",
      ],
      externa: [
        "Mesa para quatro logo depois da cobertura, em frente à janela do escritório, para comer perto da churrasqueira.",
        "Lavanderia no fundo, atrás da suíte: tanque e máquina no muro do lado, armário alto no muro do fundo. Fica longe da hidro e do churrasco.",
        "Um telhadinho próprio, da parede da suíte até o muro, cobre a lavanderia. Ela fica depois da janela da suíte, para não tampar a luz.",
      ],
    },
    outdoorChanges: { servicoext: { name: "Hidro", floor: "deck" } },
    drop: ["servicoext:Tanque", "servicoext:Máquina de lavar", "servicoext:Armário de serviço"],
    externa: externa("deck"),
    pieces: () => [
      ...bathrooms("#1e3d66", "#e9e4da"),
      ...salaExtras("#e2ddd2"),
      piece("servicoext", "Hidromassagem", "🛁", "Móveis", deckedTub(R(0.02, EXT.z0 + 0.03, 2.43, 1.72), R(0.14, -1.42, 2.0, 1.5))),
      piece("servicoext", "Painel ripado", "🪵", "Obras", [...slatScreen(R(-0.01, EXT.z0, 2.46, 0.03)), ...slatScreen(R(-0.01, EXT.z0, 0.03, 1.75))]),
      piece("coberta", "Churrasqueira", "🔥", "Móveis", bbq(R(2.85, EXT.z0, 0.9, 0.55))),
      piece("coberta", "Bancada de apoio", "🗄️", "Móveis", [part(3.8, EXT.z0, 0.95, 0.55, 0.86, "madeira", 0, "#f4f4f1"), part(3.8, EXT.z0, 0.95, 0.55, 0.04, "pedra", 0.86, "#3b3a38")]),
      piece("externa", "Mesa e cadeiras", "🍽️", "Móveis", [
        ...table(R(5.3, -0.95, 1.2, 0.7), "#f4f4f1", "#2b2b2e"),
        ...chair(5.45, -1.45, "n", "#1e3d66"), ...chair(6.0, -1.45, "n", "#1e3d66"),
        ...chair(4.82, -0.82, "w", "#1e3d66"), ...chair(6.54, -0.82, "e", "#1e3d66"),
      ]),
      piece("externa", "Plantas em vaso", "🪴", "Plantas", [...plant(7.3, -1.45, 0.38, 1.2), ...plant(7.3, -0.5, 0.36, 1.0)]),
      { ...piece("externa", "Tanque", "🧺", "Móveis", [part(EXT.x1 - 0.55, EXT.z0, 0.55, 0.55, 0.9, "branco")]), fixture: { kind: "tanque", x: EXT.x1 - 0.55, z: EXT.z0, w: 0.55, d: 0.55, wall: "e" } },
      piece("externa", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(EXT.x1 - 0.65, EXT.z0 + 0.6, 0.65, 0.6), "e")),
      piece("externa", "Armário de serviço", "🧹", "Móveis", full(tallCabinet(R(8.97, EXT.z0, 0.33, 0.4), "n", "#f4f4f1"))),
      piece("externa", "Telhado da lavanderia", "🏠", "Obras", slopedRoof(R(8.94, -1.86, EXT.x1 + 0.1 - 8.94, 2.05))),
    ],
  });
}

function extraG(): Extra {
  const cab = "#e4d6c2", stone = "#3b3a38";
  return {
    id: "g",
    name: "F com a máquina na cozinha",
    tagline: "A F com a máquina de lavar dentro da cozinha e a pia perto da geladeira, deixando a área externa livre para descanso, churrasco e jardim.",
    highlights: [
      "Área de fora: hidromassagem branca de 2,00 × 1,50 m com deque em volta e churrasqueira com bancada, tudo embaixo do telhado.",
      "Cozinha em L com bancada de ponta a ponta, cooktop de 4 bocas e armários em cima e embaixo. A máquina de lavar fica embaixo da bancada, no canto da janela, e a pia vai para o lado da geladeira.",
      "Área externa livre, com mesa para quatro, banco de madeira, jardim vertical no muro e canteiro no fundo.",
    ],
    replaceNotes: ["servicoext", "coberta", "externa", "cozinha"],
    replaceOutdoorHighlight: true,
    dropHighlights: ["Cozinha em L"],
    notes: {
      ...BATH_NOTES,
      cozinha: [
        "Bancada planejada de 60 cm de fundo no L, com cooktop de 4 bocas e armários embaixo e aéreos em cima.",
        "A máquina de lavar fica embaixo da bancada, no canto da janela, com a pedra passando por cima. Dá para usar a bancada normalmente.",
        "A pia saiu da janela e foi para a parede da geladeira, logo antes dela: lavar, cortar e guardar ficam em sequência.",
        "Sem tanque: com a máquina dentro de casa, a área externa fica livre.",
      ],
      servicoext: [
        "Hidromassagem branca de 2,00 × 1,50 m embutida num deque de madeira de 45 cm, que ocupa o canto inteiro, do muro até a parede da cozinha.",
        "A borda da hidro fica 30 cm acima do deque, e um degrau do lado da churrasqueira ajuda a subir.",
        "Fica embaixo do telhado: dá para usar com chuva, e as folhas não caem na água.",
        "Ripado de madeira no lado de dentro do muro, do chão até 2,50 m, atrás e do lado da hidro.",
      ],
      coberta: [
        "Churrasqueira e bancada de apoio encostadas no muro, ao lado da hidro: quem está na água fica perto de quem está na grelha.",
        "Embaixo do telhado, então o churrasco não para com chuva. Sobram uns 90 cm de passagem da varanda até a área externa.",
        "Os gatos continuam podendo ficar aqui fora sem tomar chuva.",
      ],
      externa: [
        "Mesa para quatro logo depois da cobertura, em frente à janela do escritório, para comer perto da churrasqueira.",
        "Banco de madeira no muro, em frente à janela da suíte, com jardim vertical atrás e no muro do fundo.",
        "Canteiro no canto do fundo e vasos, deixando o meio livre: sobra 1 m de passagem na frente do banco.",
      ],
    },
    outdoorChanges: { servicoext: { name: "Hidro", floor: "deck" } },
    drop: ["servicoext:Tanque", "servicoext:Máquina de lavar", "servicoext:Armário de serviço", "cozinha:Bancada planejada", "servico:Pia"],
    externa: externa("deck"),
    pieces: () => [
      ...bathrooms("#1e3d66", "#e9e4da"),
      ...salaExtras("#e2ddd2"),
      piece("cozinha", "Bancada planejada", "🗄️", "Móveis", [
        ...plannedCounter(R(-0.01, 0.89, 0.61, 1.61), "e", cab, stone),
        ...plannedCounter(R(0.22, 0.29, 0.78, 0.6), "s", cab, stone),
        part(1.0, 0.29, 0.6, 0.6, 0.04, "pedra", 0.86, stone),
      ]),
      piece("cozinha", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(1.0, 0.29, 0.6, 0.6), "n")),
      { ...piece("cozinha", "Pia", "🚰", "Móveis", [part(-0.01, 2.5, 0.61, 0.9, 0.9, "madeira", 0, cab)]), fixture: { kind: "bancada", x: -0.01, z: 2.5, w: 0.61, d: 0.9, wall: "w", colors: { cabinet: cab, stone } } },
      piece("servicoext", "Hidromassagem", "🛁", "Móveis", deckedTub(R(0.02, EXT.z0 + 0.03, 2.43, 1.72), R(0.14, -1.42, 2.0, 1.5))),
      piece("servicoext", "Painel ripado", "🪵", "Obras", [...slatScreen(R(-0.01, EXT.z0, 2.46, 0.03)), ...slatScreen(R(-0.01, EXT.z0, 0.03, 1.75))]),
      piece("coberta", "Churrasqueira", "🔥", "Móveis", bbq(R(2.85, EXT.z0, 0.9, 0.55))),
      piece("coberta", "Bancada de apoio", "🗄️", "Móveis", [part(3.8, EXT.z0, 0.95, 0.55, 0.86, "madeira", 0, "#f4f4f1"), part(3.8, EXT.z0, 0.95, 0.55, 0.04, "pedra", 0.86, stone)]),
      piece("externa", "Mesa e cadeiras", "🍽️", "Móveis", [
        ...table(R(5.3, -0.95, 1.2, 0.7), "#f4f4f1", "#2b2b2e"),
        ...chair(5.45, -1.45, "n", "#1e3d66"), ...chair(6.0, -1.45, "n", "#1e3d66"),
        ...chair(4.82, -0.82, "w", "#1e3d66"), ...chair(6.54, -0.82, "e", "#1e3d66"),
      ]),
      piece("externa", "Jardim vertical", "🌿", "Plantas", full([part(7.75, EXT.z0, 2.12, 0.06, 1.4, "planta", 0.6), part(EXT.x1 - 0.06, EXT.z0 + 0.06, 0.06, 1.39, 1.4, "planta", 0.6)])),
      piece("externa", "Banco de madeira", "🪑", "Móveis", gardenBench(R(7.85, EXT.z0 + 0.06, 1.3, 0.42), "n", "#a07a55")),
      piece("externa", "Canteiro", "🌱", "Plantas", raisedBed(R(EXT.x1 - 0.6, -0.95, 0.54, 0.8))),
      piece("externa", "Plantas em vaso", "🪴", "Plantas", [...plant(7.05, -1.45, 0.38, 1.2), ...plant(7.1, -0.5, 0.34, 1.0)]),
    ],
  };
}

function proposalG(): Proposal {
  return fromJ(1300, extraG());
}

/** Junta as notas da G com as novas: soma as listas dos cômodos que aparecem nas duas. */
function addNotes(base: Record<string, string[]>, more: Record<string, string[]>): Record<string, string[]> {
  const out = { ...base };
  for (const [room, list] of Object.entries(more)) out[room] = [...(out[room] ?? []), ...list];
  return out;
}

/** H: a G com mais lugar para guardar, sem mexer em nenhum móvel. */
function proposalH(): Proposal {
  const g = extraG();
  const white = "#f4f4f1", nishi = "#1e3d66", oak = "#c9a77c";
  return fromJ(1400, {
    ...g,
    id: "h",
    name: "G com mais armazenamento",
    tagline: "A G com os mesmos móveis, e mais lugar para guardar coisas: parede, alto dos armários e embaixo da cama.",
    highlights: [
      ...g.highlights,
      "Mais armazenamento sem tirar nada do lugar: armário no escritório, prateleiras em cima da mesa, gavetas embaixo da cama, aéreos em cima da geladeira, da cabeceira e dos vasos.",
      "Varal de teto embaixo do telhado, já que a máquina foi para dentro: a roupa seca coberta.",
    ],
    notes: addNotes(g.notes, {
      quarto: [
        "Armário alto de 40 cm de fundo na parede da suíte, longe da porta, para livros, papéis e roupa de cama.",
        "Três prateleiras em cima da mesa, a partir de 1,20 m, para não bater a cabeça ao sentar.",
        "Duas gavetas grandes embaixo da cama de solteiro, abrindo para o meio do escritório.",
      ],
      suite: [
        "Aéreo em cima da cabeceira e um criado-mudo suspenso do lado da cama, que deixa o chão livre para limpar.",
      ],
      cozinha: ["Aéreo em cima da geladeira, para o que se usa pouco (assadeiras, garrafas)."],
      banho: ["Armário em cima do vaso e nicho dentro do box."],
      banhosuite: ["Armário em cima do vaso e nicho dentro do box."],
      coberta: ["Varal de teto de 2 m, embaixo do telhado e perto da casa: sobe e desce, e não atrapalha a passagem."],
    }),
    pieces: () => [
      ...g.pieces(),
      piece("quarto", "Armário do escritório", "🗄️", "Móveis", full(tallCabinet(R(6.29, 0.95, 0.4, 1.1), "e", white))),
      piece("quarto", "Prateleiras em cima da mesa", "📚", "Móveis", full([1.2, 1.5, 1.8].map((y) => part(4.29, 1.4, 0.25, 1.4, 0.03, "madeira", y, oak)))),
      piece("quarto", "Gavetas embaixo da cama", "🗃️", "Móveis", [
        part(4.55, 0.87, 0.7, 0.02, 0.2, "madeira", 0.06, white), part(5.35, 0.87, 0.7, 0.02, 0.2, "madeira", 0.06, white),
        part(4.85, 0.885, 0.1, 0.01, 0.02, "escuro", 0.18), part(5.65, 0.885, 0.1, 0.01, 0.02, "escuro", 0.18),
      ]),
      piece("suite", "Aéreo da cabeceira", "🗄️", "Móveis", full([part(9.52, 0.15, 0.35, 1.28, 0.45, "madeira", 1.6, white)])),
      piece("suite", "Criado-mudo suspenso", "🛏️", "Móveis", full([part(9.45, 1.46, 0.42, 0.38, 0.25, "madeira", 0.42, nishi)])),
      piece("cozinha", "Aéreo da geladeira", "🗄️", "Móveis", full([part(-0.01, 3.42, 0.66, 0.66, 0.45, "madeira", 1.92, "#e4d6c2")])),
      piece("banho", "Armário do vaso", "🗄️", "Móveis", full([part(6.5, 5.2, 0.52, 0.22, 0.6, "branco", 1.3, white)])),
      piece("banho", "Nicho no box", "🧴", "Móveis", full([part(7.3, 5.4, 0.4, 0.02, 0.3, "escuro", 1.1, "#c9c4ba")])),
      piece("banhosuite", "Armário do vaso", "🗄️", "Móveis", full([part(8.54, 2.78, 0.52, 0.22, 0.6, "branco", 1.3, white)])),
      piece("banhosuite", "Nicho no box", "🧴", "Móveis", full([part(9.3, 2.78, 0.4, 0.02, 0.3, "escuro", 1.1, "#c9c4ba")])),
      piece("coberta", "Varal de teto", "👕", "Móveis", full([
        ...[-0.62, -0.47, -0.32].map((z) => part(2.6, z, 2.0, 0.015, 0.015, "metal", 1.95)),
        part(2.6, -0.65, 0.03, 0.36, 0.03, "metal", 1.95), part(4.57, -0.65, 0.03, 0.36, 0.03, "metal", 1.95),
      ])),
    ],
  });
}

/** I: a G com conforto e espaços que servem para mais de uma coisa, sem mexer em nenhum móvel. */
function proposalI(): Proposal {
  const g = extraG();
  const linen = "#e9e4da", nishi = "#1e3d66";
  const curtain = (x: number, w: number, color: string) => full([part(x, 0.0, w, 0.04, 2.2, "tecido", 0.05, color), part(x - 0.05, 0.02, w + 0.1, 0.02, 0.02, "metal", 2.27)]);
  const pendant = (x: number, z: number, y: number) => full([part(x + 0.12, z + 0.12, 0.01, 0.01, 2.6 - y - 0.18, "escuro", y + 0.18), part(x, z, 0.25, 0.25, 0.18, "escuro", y, "#2b2b2e")]);
  return fromJ(1500, {
    ...g,
    id: "i",
    name: "G com conforto",
    tagline: "A G com os mesmos móveis, e detalhes que deixam a casa mais confortável e cada canto servindo para mais de uma coisa.",
    highlights: [
      ...g.highlights,
      "Conforto sem mexer nos móveis: cortinas blackout nas duas janelas da frente, pendentes em cima da mesa, espelho grande na sala e passarela dos gatos na varanda.",
      "Toldo retrátil em cima da mesa de fora, emendando com o telhado, para usar a mesa com sol ou garoa.",
    ],
    notes: addNotes(g.notes, {
      suite: ["Cortina blackout do chão ao teto na janela atrás da cama, e um pendente do lado da cabeceira para ler."],
      quarto: ["Cortina blackout na janela, para o escritório virar quarto de hóspede à noite, e luminária de braço em cima da mesa."],
      estar: [
        "Dois pendentes baixos em cima da mesa de 6, a 1,6 m do chão: marcam a mesa sem precisar de divisória.",
        "Espelho de 1,40 m na parede atrás da mesa, que reflete a varanda e faz a sala parecer maior.",
      ],
      varanda: ["Prateleiras na parede da cozinha, subindo do armário dos gatos: uma passarela para eles chegarem ao alto."],
      externa: ["Toldo retrátil em cima da mesa, emendando com o telhado: aberto faz sombra, fechado some no muro."],
    }),
    pieces: () => [
      ...g.pieces(),
      piece("suite", "Cortina blackout", "🪟", "Móveis", curtain(7.72, 1.22, linen)),
      piece("suite", "Pendente da cabeceira", "💡", "Móveis", pendant(9.55, 1.5, 1.3)),
      piece("quarto", "Cortina blackout", "🪟", "Móveis", curtain(4.87, 1.23, linen)),
      piece("quarto", "Luminária de braço", "💡", "Móveis", full([part(4.31, 2.6, 0.05, 0.05, 0.5, "metal", 0.76), part(4.31, 2.4, 0.3, 0.2, 0.08, "escuro", 1.22, "#2b2b2e")])),
      piece("estar", "Pendentes da mesa", "💡", "Móveis", [...pendant(3.3, 4.27, 1.6), ...pendant(3.85, 4.27, 1.6)]),
      piece("estar", "Espelho grande", "🪞", "Móveis", full([part(3.0, 5.4, 1.4, 0.02, 1.1, "vidro", 0.9, "#d7e6ea"), part(2.98, 5.41, 1.44, 0.01, 1.14, "metal", 0.88)])),
      piece("varanda", "Passarela dos gatos", "🐈", "Pets", full(catShelves([[1.7, 1.38, 1.3], [1.7, 1.78, 1.6], [1.7, 1.38, 1.9]], "w", "#c9a77c"))),
      piece("externa", "Toldo retrátil", "⛱️", "Obras", full([
        part(4.79, -1.5, 2.1, 1.3, 0.02, "cobertura", 2.35, nishi),
        part(4.79, -0.2, 2.1, 0.06, 0.08, "metal", 2.3),
      ])),
    ],
  });
}

/**
 * A G com outra área externa: o apartamento, a hidro e a área coberta ficam iguais, e só o
 * trecho descoberto do fundo (x 4,79 a 9,87, atrás do escritório e da suíte) é refeito.
 */
function fromGOutside(start: number, o: { id: string; name: string; tagline: string; highlight: string; notes: string[]; externa: Room; pieces: () => Piece[] }): Proposal {
  const g = extraG();
  return fromJ(start, {
    ...g,
    id: o.id,
    name: o.name,
    tagline: o.tagline,
    highlights: [...g.highlights.filter((h) => !h.startsWith("Área externa livre")), o.highlight],
    notes: { ...g.notes, externa: o.notes },
    externa: o.externa,
    pieces: () => [...g.pieces().filter((p) => p.roomId !== "externa"), ...o.pieces()],
  });
}

/** K: o fundo vira um deque de descanso, com sofá, espreguiçadeira e ducha. */
function proposalK(): Proposal {
  const nishi = "#1e3d66", white = "#f4f4f1", wood = "#a07a55";
  return fromGOutside(1600, {
    id: "k",
    name: "G com deque de descanso",
    tagline: "A G igual por dentro, com a hidro e a área coberta, e o fundo virando um deque para descansar: sofá, espreguiçadeira e ducha.",
    highlight: "Área externa em deque, emendando com a área coberta: sofá de 3 lugares no muro, espreguiçadeira na frente da suíte e ducha no canto do fundo.",
    notes: [
      "O deque de madeira continua o da área coberta até o fim, sem degrau: parece um ambiente só.",
      "Sofá externo de 3 lugares (1,90 × 0,70 m) encostado no muro, em frente à janela do escritório, com almofadas azuis e uma mesinha lateral.",
      "Espreguiçadeira de 1,90 m deitada ao longo do muro, em frente à janela da suíte, para pegar sol.",
      "Ducha no canto do fundo, com piso de pedra e ripado no muro, para sair da hidro ou se refrescar.",
      "Sobram uns 75 cm de passagem entre os móveis e a parede da casa, de ponta a ponta.",
    ],
    externa: externa("deck"),
    pieces: () => [
      piece("externa", "Sofá externo", "🛋️", "Móveis", sofa(R(4.95, EXT.z0, 1.9, 0.7), "n", nishi, 3, nishi)),
      piece("externa", "Mesinha lateral", "🪵", "Móveis", table(R(6.92, EXT.z0 + 0.1, 0.4, 0.4), wood, "#2b2b2e", 0.5)),
      piece("externa", "Espreguiçadeira", "🏖️", "Móveis", [
        part(7.35, EXT.z0 + 0.05, 1.9, 0.62, 0.3, "madeira", 0, wood),
        part(7.4, EXT.z0 + 0.09, 1.4, 0.54, 0.06, "tecido", 0.3, white),
        part(8.8, EXT.z0 + 0.09, 0.4, 0.54, 0.35, "tecido", 0.3, white),
      ]),
      piece("externa", "Ducha externa", "🚿", "Obras", [
        part(EXT.x1 - 0.6, EXT.z0, 0.6, 0.7, 0.03, "pedra", 0, "#8a8178"),
        ...full([
          part(EXT.x1 - 0.1, EXT.z0 + 0.3, 0.04, 0.04, 2.1, "metal", 0),
          part(EXT.x1 - 0.35, EXT.z0 + 0.25, 0.3, 0.14, 0.03, "metal", 2.05),
        ]),
        ...slatScreen(R(EXT.x1 - 0.03, EXT.z0, 0.03, 0.9)),
      ]),
    ],
  });
}

/** L: o fundo vira jardim telado para os gatos, com bambu, pisantes e um cantinho para sentar. */
function proposalL(): Proposal {
  const nishi = "#1e3d66", white = "#f4f4f1";
  return fromGOutside(1700, {
    id: "l",
    name: "G com jardim dos gatos",
    tagline: "A G igual por dentro, com a hidro e a área coberta, e o fundo virando um jardim telado para a Maki e o Gojo, com bambu e um cantinho para sentar.",
    highlight: "Área externa em grama, telada em cima do muro: bambu no muro, caminho de pisantes, duas cadeiras com mesinha, torre e caminho de prateleiras para os gatos.",
    notes: [
      "Grama com um caminho de pisantes de pedra perto da casa, da área coberta até o fundo.",
      "Tela de 50 cm em cima do muro, emendando com a área coberta: os gatos podem andar no fundo todo sem fugir.",
      "Bambu numa floreira no muro, em frente ao escritório, para trazer verde para a janela.",
      "Duas cadeiras e uma mesinha na frente do bambu, para um café, sem tampar o caminho.",
      "Para os gatos: prateleiras em degrau no muro, caixa de grama, fonte de água e torre de 1,2 m no canto, perto da janela da suíte.",
    ],
    externa: externa("grama", true),
    pieces: () => [
      piece("externa", "Tela de proteção", "🕸️", "Pets", full([part(4.79, -1.66, 5.18, 0.03, 0.5, "tela", 2.5), part(9.94, -1.66, 0.03, 1.55, 0.5, "tela", 2.5)])),
      piece("externa", "Pisantes", "🪨", "Obras", [5.0, 5.65, 6.3, 6.95, 7.6, 8.25, 8.9, 9.45].map((x) => part(x, -0.55, 0.4, 0.38, 0.02, "pedra", 0, "#cfc8bc"))),
      piece("externa", "Bambu na floreira", "🎋", "Plantas", full([
        part(4.85, EXT.z0, 2.0, 0.35, 0.4, "madeira", 0, "#8d6748"),
        part(4.9, EXT.z0 + 0.05, 1.9, 0.25, 1.9, "planta", 0.4),
      ])),
      piece("externa", "Cadeiras e mesinha", "🪑", "Móveis", [
        ...chair(5.1, -1.15, "n", nishi), ...chair(6.1, -1.15, "n", nishi),
        ...table(R(5.62, -1.1, 0.4, 0.4), white, "#2b2b2e", 0.5),
      ]),
      piece("externa", "Caminho dos gatos", "🐾", "Pets", full(catShelves([[7.2, -1.56, 0.8], [7.8, -1.56, 1.1], [8.4, -1.56, 1.4]], "n", white))),
      piece("externa", "Grama para gatos", "🌾", "Pets", raisedBed(R(7.2, -1.56, 0.6, 0.35), white)),
      piece("externa", "Fonte de água", "⛲", "Pets", [part(8.0, -1.5, 0.45, 0.45, 0.3, "pedra", 0, "#8a8178"), part(8.05, -1.45, 0.35, 0.35, 0.02, "vidro", 0.28, "#5fb3cf")]),
      piece("externa", "Torre para gatos", "🐈", "Pets", catTree(9.3, -1.5)),
    ],
  });
}

export const PROPOSALS: Proposal[] = [proposalA(), proposalB(), proposalC(), proposalD(), proposalE(), proposalF(), proposalG(), proposalH(), proposalI(), proposalJ(), proposalK(), proposalL()];

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
