import type { FloorKind, Home, Material, Part, Piece, Room, Side } from "./types";

/**
 * Só existe a proposta G, montada em cima da J (os desenhos do João, para ele, a Maki e o
 * Gojo). A J continua aqui como base, mas não aparece no seletor. A planta vazia continua
 * sendo a casa de verdade; a proposta só muda o que se vê.
 */
export interface Proposal {
  id: string;
  /** Nome curto no seletor (sem ele, o id em maiúsculas). */
  label?: string;
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
    // Base de rodízios em cruz.
    part(x + 0.04, z + 0.23, 0.42, 0.04, 0.05, "escuro", 0.02, "#2b2b2e"),
    part(x + 0.23, z + 0.04, 0.04, 0.42, 0.05, "escuro", 0.02, "#2b2b2e"),
    part(x, z, 0.5, 0.5, 0.06, "tecido", 0.45, color),
    at(0, 0, 0.5, 0.08, 0.5, "tecido", 0.5, color),
  ];
}

function fridge(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  // Duas portas (freezer embaixo), com a fresta entre elas e um puxador vertical em cada.
  return [
    at(0, 0, W, D, 1.85, "metal", 0, "#d9dcdf"),
    at(0.01, D, W - 0.02, 0.004, 0.008, "escuro", 0.68, "#9aa0a6"),
    at(W - 0.08, D, 0.03, 0.03, 0.75, "escuro", 0.86),
    at(W - 0.08, D, 0.03, 0.03, 0.35, "escuro", 0.25),
  ];
}

function washer(r: Rect, back: Side): Part[] {
  const { W, D, at } = placer(r, back);
  // Painel de comandos escuro em cima e a porta redonda (anel cinza com o vidro no meio).
  return [
    at(0, 0, W, D, 0.85, "branco", 0, "#f4f4f2"),
    at(0.04, D, W - 0.08, 0.006, 0.1, "escuro", 0.72, "#2b2f35"),
    at(W / 2 - 0.19, D, 0.38, 0.008, 0.38, "metal", 0.21, "#b9bec4"),
    at(W / 2 - 0.15, D + 0.004, 0.3, 0.01, 0.3, "vidro", 0.25),
  ];
}

function tallCabinet(r: Rect, back: Side, color = "#efe9df"): Part[] {
  return wardrobe(r, back, color).map((p) => ({ ...p, h: Math.min(p.h, 1.9) }));
}

// Gatos

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

// ---------- G: a J completa ----------
// Parte da J e completa o que falta: banheiros, sala e a área
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

/**
 * Churrasqueira de alvenaria encostada no muro (`r.z` é o lado do muro), no mesmo
 * acabamento da bancada do lado: corpo branco com portas, tampo de pedra em volta de uma
 * grelha rebaixada, gaveta do carvão na frente e coifa de inox com a chaminé até o telhado.
 * Poucas caixas, para o 3D continuar leve.
 */
function bbq(r: Rect, body = "#f4f4f1", stone = "#3b3a38"): Part[] {
  const top = 0.86, rim = 0.08, back = 0.1;
  const gx = r.x + rim, gz = r.z + back, gw = r.w - 2 * rim, gd = r.d - back - rim;
  const front = r.z + r.d;
  const bars: Part[] = [];
  for (let i = 1; i <= 7; i++) bars.push(part(gx + (gw / 8) * i - 0.006, gz, 0.012, gd, 0.012, "metal", top - 0.03));
  return [
    part(r.x, r.z, r.w, r.d, top, "madeira", 0, body),
    // Tampo de pedra em volta da grelha e a grelha rebaixada, com o braseiro escuro embaixo.
    part(r.x, r.z, r.w, back, 0.04, "pedra", top, stone),
    part(r.x, front - rim, r.w, rim, 0.04, "pedra", top, stone),
    part(r.x, gz, rim, gd, 0.04, "pedra", top, stone),
    part(r.x + r.w - rim, gz, rim, gd, 0.04, "pedra", top, stone),
    part(gx, gz, gw, gd, 0.02, "escuro", top - 0.08, "#1c1c1e"),
    ...bars,
    // Gaveta do carvão em cima e duas portas embaixo, com puxadores de inox.
    part(r.x + 0.06, front, r.w - 0.12, 0.006, 0.006, "escuro", 0.62, "#6b5a48"),
    part(r.x + r.w / 2 - 0.003, front, 0.006, 0.006, 0.56, "escuro", 0.06, "#6b5a48"),
    part(r.x + r.w / 2 - 0.1, front, 0.2, 0.015, 0.015, "metal", 0.72),
    part(r.x + r.w / 2 - 0.08, front, 0.015, 0.015, 0.2, "metal", 0.3),
    part(r.x + r.w / 2 + 0.065, front, 0.015, 0.015, 0.2, "metal", 0.3),
    // Coifa de inox em degrau e a chaminé subindo até o telhado.
    ...full([
      part(r.x + 0.02, r.z, r.w - 0.04, r.d - 0.05, 0.08, "metal", 1.6),
      part(r.x + 0.12, r.z, r.w - 0.24, r.d - 0.2, 0.18, "metal", 1.68),
      part(r.x + r.w / 2 - 0.11, r.z, 0.22, 0.2, 0.74, "metal", 1.86),
    ]),
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

/**
 * Hidromassagem embutida num deque de madeira: o deque (`deck`) ocupa o canto em volta da
 * hidro (`tub`) quase até o topo: a borda branca fica só 5 cm acima do deque, sem degrau.
 */
function deckedTub(deck: Rect, tub: Rect, wood = "#a07a55", shell = "#f4f4f1"): Part[] {
  const H = 0.7;
  const tx1 = tub.x + tub.w, tz1 = tub.z + tub.d, dx1 = deck.x + deck.w, dz1 = deck.z + deck.d;
  return [
    part(deck.x, deck.z, deck.w, tub.z - deck.z, H, "madeira", 0, wood),
    part(deck.x, tz1, deck.w, dz1 - tz1, H, "madeira", 0, wood),
    part(deck.x, tub.z, tub.x - deck.x, tub.d, H, "madeira", 0, wood),
    part(tx1, tub.z, dx1 - tx1, tub.d, H, "madeira", 0, wood),
    ...tubShell(tub, H + 0.05, shell),
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

function extraG(): Extra {
  const cab = "#e4d6c2", stone = "#3b3a38";
  return {
    id: "g",
    name: "Máquina na cozinha, hidro e área coberta",
    tagline: "A casa com a máquina de lavar dentro da cozinha e a pia perto da geladeira, a hidro e a churrasqueira embaixo do telhado, e a área externa vazia, só com grama.",
    highlights: [
      "Área de fora: hidromassagem branca de 2,00 × 1,50 m com deque em volta e churrasqueira com bancada, tudo embaixo do telhado.",
      "Cozinha em L com bancada de ponta a ponta, cooktop de 4 bocas e armários em cima e embaixo. A máquina de lavar fica embaixo da bancada, no canto da janela, e a pia vai para o lado da geladeira.",
      "Área externa vazia, só com grama, para decidir depois o que vai ali.",
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
        "Lava-louças de 45 cm embutida embaixo da bancada, logo antes da pia, com frente de inox: a água e o esgoto ficam juntos.",
        "Sem tanque: com a máquina dentro de casa, a área externa fica livre.",
      ],
      servicoext: [
        "Hidromassagem branca de 2,00 × 1,50 m embutida num deque de madeira de 70 cm, que ocupa o canto inteiro, do muro até a parede da cozinha.",
        "O deque sobe quase até o topo da hidro: a borda fica só 5 cm acima dele, sem degrau.",
        "Fica embaixo do telhado: dá para usar com chuva, e as folhas não caem na água.",
        "Ripado de madeira no lado de dentro do muro, do chão até 2,50 m, atrás e do lado da hidro.",
      ],
      coberta: [
        "Churrasqueira e bancada de apoio encostadas no muro, ao lado da hidro: quem está na água fica perto de quem está na grelha.",
        "Embaixo do telhado, então o churrasco não para com chuva. Sobram uns 90 cm de passagem da varanda até a área externa.",
        "Os gatos continuam podendo ficar aqui fora sem tomar chuva.",
      ],
      externa: ["Vazia por enquanto: só grama, da área coberta até o fundo."],
    },
    outdoorChanges: { servicoext: { name: "Hidro", floor: "deck" } },
    drop: ["servicoext:Tanque", "servicoext:Máquina de lavar", "servicoext:Armário de serviço", "cozinha:Bancada planejada", "servico:Pia"],
    externa: externa("grama"),
    pieces: () => [
      ...bathrooms("#1e3d66", "#e9e4da"),
      ...salaExtras("#e2ddd2"),
      piece("cozinha", "Bancada planejada", "🗄️", "Móveis", [
        ...plannedCounter(R(-0.01, 0.89, 0.61, 1.61), "e", cab, stone),
        ...plannedCounter(R(0.22, 0.29, 0.78, 0.6), "s", cab, stone),
        part(1.0, 0.29, 0.6, 0.6, 0.04, "pedra", 0.86, stone),
      ]),
      piece("cozinha", "Máquina de lavar", "🫧", "Eletrodomésticos", washer(R(1.0, 0.29, 0.6, 0.6), "n")),
      // Lava-louças de 45 cm embutida embaixo da bancada, logo antes da pia: frente de inox,
      // faixa de comandos em cima e puxador horizontal.
      piece("cozinha", "Lava-louças", "🍽️", "Eletrodomésticos", [
        part(0.6, 2.05, 0.012, 0.44, 0.78, "metal", 0.05),
        part(0.612, 2.07, 0.004, 0.4, 0.05, "escuro", 0.76, "#2b2f35"),
        part(0.612, 2.12, 0.02, 0.3, 0.02, "metal", 0.68, "#9aa0a6"),
      ]),
      { ...piece("cozinha", "Pia", "🚰", "Móveis", [part(-0.01, 2.5, 0.61, 0.9, 0.9, "madeira", 0, cab)]), fixture: { kind: "bancada", x: -0.01, z: 2.5, w: 0.61, d: 0.9, wall: "w", colors: { cabinet: cab, stone } } },
      piece("servicoext", "Hidromassagem", "🛁", "Móveis", deckedTub(R(0.02, EXT.z0 + 0.03, 2.43, 1.72), R(0.14, -1.42, 2.0, 1.5))),
      piece("servicoext", "Painel ripado", "🪵", "Obras", [...slatScreen(R(-0.01, EXT.z0, 2.46, 0.03)), ...slatScreen(R(-0.01, EXT.z0, 0.03, 1.75))]),
      piece("coberta", "Churrasqueira", "🔥", "Móveis", bbq(R(2.85, EXT.z0, 0.9, 0.55))),
      // Bancada com portas e uma cuba pequena com torneira, para lavar o que vai para a grelha.
      piece("coberta", "Bancada de apoio", "🗄️", "Móveis", [
        ...plannedCounter(R(3.8, EXT.z0, 0.95, 0.55), "s", "#f4f4f1", stone),
        part(4.3, EXT.z0 + 0.1, 0.38, 0.32, 0.012, "escuro", 0.895, "#2a2a2c"),
        ...full([part(4.47, EXT.z0 + 0.03, 0.03, 0.03, 0.3, "metal", 0.9), part(4.47, EXT.z0 + 0.03, 0.03, 0.14, 0.03, "metal", 1.17)]),
      ]),
    ],
  };
}

function proposalG(): Proposal {
  return fromJ(1300, extraG());
}

/**
 * Outra paleta em cima de uma proposta: mesmos móveis, no mesmo lugar, só com as cores
 * trocadas. `colors` troca as cores de uma em uma (de → para); as peças de `keep` ficam como
 * estão (a hidro, as espelheiras, o telhado).
 */
function recolor(base: Proposal, o: { id: string; name: string; tagline: string; colors: Record<string, string>; keep?: string[]; highlights?: string[] }): Proposal {
  const map = new Map(Object.entries(o.colors).map(([from, to]) => [from.toLowerCase(), to]));
  const swap = (c?: string) => (c && map.get(c.toLowerCase())) || c;
  return {
    ...base,
    id: o.id,
    name: o.name,
    tagline: o.tagline,
    highlights: o.highlights ?? [`Mesma casa e mesmos móveis da ${base.id.toUpperCase()}, só com outras cores: ${o.tagline.charAt(0).toLowerCase()}${o.tagline.slice(1)}`],
    pieces: base.pieces.map((p) =>
      o.keep?.includes(p.name)
        ? p
        : {
            ...p,
            parts: p.parts.map((part) => ({ ...part, c: swap(part.c) })),
            fixture: p.fixture?.colors ? { ...p.fixture, colors: { cabinet: swap(p.fixture.colors.cabinet), stone: swap(p.fixture.colors.stone) } } : p.fixture,
          },
    ),
  };
}

const KEEP_COLORS = ["Hidromassagem", "Espelheira", "Telhado inclinado", "Máquina de lavar", "Painel ripado", "Balcão na mureta"];

/**
 * G4: a G completa cômodo por cômodo, com o que faltava, sem lotar nem fechar passagem, e
 * a casa em branco e creme com detalhes pretos. As peças novas usam as cores da G e
 * passam pela mesma troca de cores.
 */
function proposalG4(): Proposal {
  const g = proposalG();
  const white = "#f4f4f1", nishi = "#1e3d66", linen = "#e9e4da", oak = "#c9a77c";
  const curtain = (x: number, w: number) => full([part(x, 0.0, w, 0.04, 2.2, "tecido", 0.05, linen), part(x - 0.05, 0.02, w + 0.1, 0.02, 0.02, "metal", 2.27)]);
  const pendant = (x: number, z: number, y: number) => full([part(x + 0.12, z + 0.12, 0.01, 0.01, 2.6 - y - 0.18, "escuro", y + 0.18), part(x, z, 0.25, 0.25, 0.18, "escuro", y, nishi)]);
  const extra: Piece[] = [
    // Suíte
    piece("suite", "Cortina blackout", "🪟", "Móveis", curtain(7.72, 1.22)),
    piece("suite", "Criado-mudo suspenso", "🛏️", "Móveis", full([part(9.45, 1.46, 0.42, 0.38, 0.25, "madeira", 0.42, white)])),
    piece("suite", "Pendente da cabeceira", "💡", "Móveis", pendant(9.55, 1.5, 1.3)),
    piece("suite", "Tapete ao lado da cama", "🟦", "Móveis", rug(R(8.0, 1.46, 1.35, 0.6), nishi)),
    // Escritório
    piece("quarto", "Cortina blackout", "🪟", "Móveis", curtain(4.87, 1.23)),
    piece("quarto", "Armário do escritório", "🗄️", "Móveis", full(tallCabinet(R(6.29, 0.95, 0.4, 1.1), "e", white))),
    piece("quarto", "Prateleiras em cima da mesa", "📚", "Móveis", full([1.2, 1.5, 1.8].map((y) => part(4.29, 1.4, 0.25, 1.4, 0.03, "madeira", y, oak)))),
    piece("quarto", "Luminária de braço", "💡", "Móveis", full([part(4.31, 2.6, 0.05, 0.05, 0.5, "metal", 0.76), part(4.31, 2.4, 0.3, 0.2, 0.08, "escuro", 1.22, nishi)])),
    piece("quarto", "Gavetas embaixo da cama", "🗃️", "Móveis", [
      part(4.55, 0.87, 0.7, 0.02, 0.2, "madeira", 0.06, white), part(5.35, 0.87, 0.7, 0.02, 0.2, "madeira", 0.06, white),
    ]),
    piece("quarto", "Tapete do escritório", "🟫", "Móveis", rug(R(5.05, 1.15, 1.15, 0.95), linen)),
    // Sala
    piece("estar", "Pendentes da mesa", "💡", "Móveis", [...pendant(3.3, 4.27, 1.6), ...pendant(3.85, 4.27, 1.6)]),
    piece("estar", "Espelho grande", "🪞", "Móveis", full([part(3.0, 5.4, 1.4, 0.02, 1.1, "vidro", 0.9, "#d7e6ea"), part(2.98, 5.41, 1.44, 0.01, 1.14, "metal", 0.88)])),
    piece("jantar", "Tapete do sofá", "🟦", "Móveis", rug(R(2.65, 1.7, 1.1, 1.4), linen)),
    // Cozinha
    piece("cozinha", "Passadeira", "🟦", "Móveis", rug(R(0.75, 1.1, 0.55, 1.3), nishi)),
    // Coifa de parede em inox no vão entre os aéreos, 65 cm acima do cooktop, com a chaminé até o teto.
    piece("cozinha", "Coifa de parede", "💨", "Eletrodomésticos", full([
      part(-0.01, 1.26, 0.5, 0.62, 0.05, "metal", 1.55),
      part(0.47, 1.3, 0.012, 0.54, 0.02, "escuro", 1.57, "#2b2f35"),
      part(-0.01, 1.36, 0.34, 0.42, 0.2, "metal", 1.6),
      part(-0.01, 1.44, 0.24, 0.26, 2.6 - 1.8, "metal", 1.8),
    ])),
    // Banheiros
    piece("banho", "Armário do vaso", "🗄️", "Móveis", full([part(6.5, 5.2, 0.52, 0.22, 0.6, "branco", 1.3, white)])),
    piece("banho", "Nicho no box", "🧴", "Móveis", full([part(7.3, 5.4, 0.4, 0.02, 0.3, "escuro", 1.1, "#c9c4ba")])),
    piece("banhosuite", "Armário do vaso", "🗄️", "Móveis", full([part(8.54, 2.78, 0.52, 0.22, 0.6, "branco", 1.3, white)])),
    piece("banhosuite", "Nicho no box", "🧴", "Móveis", full([part(9.3, 2.78, 0.4, 0.02, 0.3, "escuro", 1.1, "#c9c4ba")])),
  ];
  const withExtras: Proposal = {
    ...g,
    pieces: [...g.pieces, ...extra],
    notes: addNotes(g.notes, {
      suite: [
        "Cortina blackout na janela atrás da cama, criado-mudo suspenso com pendente do lado da cabeceira e um tapete preto na saída da cama.",
      ],
      quarto: [
        "Armário alto na parede da suíte, longe da porta, prateleiras em cima da mesa a partir de 1,20 m, luminária de braço e gavetas embaixo da cama.",
        "Cortina blackout na janela e um tapete no meio, deixando a porta abrir livre.",
        "O frigobar fica no canto do pé da cama, encostado na parede da janela e antes do armário.",
      ],
      estar: ["Dois pendentes pretos em cima da mesa de 6 e um espelho de 1,40 m atrás dela, que deixa a sala parecer maior."],
      jantar: ["Tapete entre o sofá e a TV, sem mesa de centro, para não fechar o caminho de 1,2 m até a porta de vidro."],
      cozinha: ["Passadeira preta no corredor da bancada.", "Coifa de parede em inox em cima do cooktop, no vão entre os aéreos, com a chaminé até o teto.", "Aéreos refeitos numa linha só, com o topo a 2,30 m: módulo no canto do shaft, vão da coifa, torre mais funda com o micro-ondas embutido e porta basculante em cima, dois módulos em cima da pia com luz embaixo e um armário fundo em cima da geladeira, fechado por um painel lateral. A bancada fica livre.", "O purificador fica na bancada da máquina de lavar, na ponta do lado do shaft, perto do ponto de água."],
      banho: ["Armário em cima do vaso e nicho dentro do box."],
      banhosuite: ["Armário em cima do vaso e nicho dentro do box."],
      varanda: ["O freezer horizontal fica no canto do lado da parede, perto da churrasqueira, e o alimentador e o bebedouro dos gatos ficam do lado da casinha. Sobra mais de 1,1 m livre para passar para fora."],
    }),
  };
  return withOwned(recolor(withExtras, {
    id: "g4",
    name: "G completa, em branco, creme e preto",
    tagline: "A G completa cômodo por cômodo, sem lotar: móveis em creme, cozinha creme com pedra clara e detalhes pretos no sofá, nas cabeceiras, nos tapetes e nos pendentes.",
    keep: KEEP_COLORS,
    highlights: [
      ...g.highlights,
      "Cômodo por cômodo, o que faltava: cortinas blackout, criado-mudo e pendente na suíte; armário, prateleiras, luminária e gavetas no escritório; pendentes e espelho na sala; aéreo na geladeira e coifa no cooktop; armários e nichos nos banheiros; freezer na varanda e frigobar no quarto.",
      "Cores: móveis e cozinha em creme, pedra clara, e preto no sofá, nas cabeceiras, nos tapetes, na mesa do escritório e nos pendentes.",
    ],
    colors: {
      "#1e3d66": "#1c1d1f", // azul Nishi → preto
      "#f4f4f1": "#f1ebdf", // móveis brancos → creme claro
      "#e4d6c2": "#ece3d1", // armários da cozinha → creme
      "#3b3a38": "#e6e0d4", // pedra escura → pedra clara
      "#6b5a48": "#b9ad98",
      "#e9e4da": "#f3eee4", // roupa de cama e cortinas → off-white
      "#e2ddd2": "#e8dfcc", // tapete da mesa → creme
      "#c9a77c": "#d8c3a2", // prateleiras → carvalho claro
      "#4a443d": "#2a2a2c",
    },
  }));
}

/**
 * Os bens que o João já tem e vão para a casa nova, desenhados e já ligados ao bem (`assetId`),
 * depois da troca de cores para ficarem com a cor de verdade. Ids de "Bens e desejos".
 */
const OWNED = {
  frigobar: "imp-824a57cd98", // Midea Frigobar 93L
  freezer: "imp-e5748832cb", // Midea Freezer Horizontal 100L
  microondas: "imp-2c100141df", // Midea Micro-ondas 35L
  purificador: "imp-d97754612e", // Electrolux Purificador de Água
  alimentador: "amz-f044c89652", // Positivo Alimentador Pet Wi-Fi 4L
  bebedouro: "amz-99423b355b", // Bebedouro para gatos com sensor 3,2L
};

function withOwned(p: Proposal): Proposal {
  const own = (assetId: string, x: Piece): Piece => ({ ...x, assetId });
  const white = "#f2f2f0", gray = "#b9bec4", dark = "#2b2f35";
  const owned: Piece[] = [
    // Frigobar (48 × 50 × 85 cm) no canto do pé da cama, com a porta virada para o quarto.
    own(OWNED.frigobar, piece("quarto", "Frigobar Midea 93L", "🧊", "Eletrodomésticos", [
      part(6.19, 0.02, 0.48, 0.5, 0.85, "branco", 0, white),
      part(6.2, 0.52, 0.46, 0.004, 0.006, "escuro", 0.62, gray),
      part(6.61, 0.52, 0.025, 0.025, 0.3, "escuro", 0.4, gray),
    ])),
    // Freezer horizontal (57 × 56 × 85 cm) encostado na parede da varanda: tampa por cima.
    own(OWNED.freezer, piece("varanda", "Freezer horizontal Midea 100L", "❄️", "Eletrodomésticos", [
      part(3.61, 0.5, 0.56, 0.57, 0.8, "branco", 0, white),
      part(3.6, 0.49, 0.58, 0.59, 0.05, "branco", 0.8, "#e9eae8"),
      part(3.585, 0.68, 0.015, 0.21, 0.025, "escuro", 0.78, gray),
      part(3.595, 0.53, 0.01, 0.06, 0.03, "escuro", 0.12, dark),
    ])),
    // Micro-ondas preto (52 × 44 × 31 cm) embutido no aéreo, do lado da coifa: só a frente aparece.
    own(OWNED.microondas, piece("cozinha", "Micro-ondas Midea 35L", "📦", "Eletrodomésticos", full([
      part(0.462, 1.95, 0.008, 0.5, 0.3, "escuro", 1.48, "#141518"),
      part(0.47, 1.98, 0.004, 0.32, 0.22, "vidro", 1.52, "#25282d"),
      part(0.47, 2.33, 0.004, 0.1, 0.22, "escuro", 1.52, "#1d1f23"),
      part(0.474, 2.36, 0.003, 0.05, 0.02, "metal", 1.7, "#9aa0a6"),
    ]))),
    // Purificador (33 × 26 × 45 cm) na outra ponta da bancada da máquina de lavar, encostado
    // no shaft, perto do ponto de água e virado para a cozinha.
    own(OWNED.purificador, piece("cozinha", "Purificador Electrolux", "💧", "Eletrodomésticos", [
      part(0.24, 0.31, 0.33, 0.26, 0.45, "branco", 0.9, white),
      part(0.33, 0.57, 0.14, 0.006, 0.1, "escuro", 1.2, dark),
      part(0.37, 0.57, 0.06, 0.04, 0.03, "metal", 0.98),
    ])),
    // Coisas dos gatos do lado da casinha, longe da passagem.
    own(OWNED.alimentador, piece("varanda", "Alimentador Positivo", "🐱", "Pets", [
      part(2.2, 0.5, 0.22, 0.3, 0.32, "branco", 0, white),
      part(2.2, 0.5, 0.22, 0.3, 0.06, "escuro", 0.32, dark),
      part(2.42, 0.6, 0.06, 0.1, 0.03, "metal", 0.04),
    ])),
    own(OWNED.bebedouro, piece("varanda", "Bebedouro dos gatos", "🐱", "Pets", [
      part(2.2, 0.88, 0.22, 0.22, 0.14, "branco", 0, white),
      part(2.23, 0.91, 0.16, 0.16, 0.012, "vidro", 0.14, "#9fc7d6"),
    ])),
  ];
  // Aéreos da cozinha refeitos numa linha só, com o topo a 2,30 m em toda a parede:
  // um módulo no canto do shaft, o vão da coifa, um módulo mais fundo (47 cm) com o
  // micro-ondas embutido e uma porta basculante em cima, dois módulos em cima da pia com
  // luz embaixo, e um armário em cima da geladeira, fundo como ela, fechado por um painel
  // lateral até o alto.
  const oldCab = p.pieces.find((x) => x.roomId === "cozinha" && x.name === "Armários aéreos");
  const cab = oldCab?.parts.find((q) => q.m === "madeira")?.c ?? "#ece3d1";
  const line = "#b9ad98", TOP = 2.3;
  const door = (z0: number, z1: number, y0: number, y1: number, x: number) => [
    part(x, z0 + 0.004, 0.006, z1 - z0 - 0.008, 0.004, "escuro", y0 + 0.002, line),
    part(x, z0 + 0.004, 0.006, 0.004, y1 - y0 - 0.004, "escuro", y0 + 0.002, line),
  ];
  const cabinets = piece("cozinha", "Armários aéreos", "🗄️", "Móveis", full([
    // Canto do shaft: um módulo de uma porta.
    part(-0.01, 0.89, 0.35, 0.36, TOP - 1.5, "madeira", 1.5, cab),
    part(0.34, 1.19, 0.008, 0.03, 0.12, "escuro", 1.54, line),
    // Torre do micro-ondas, do lado da coifa.
    // O corpo fica um pouco para trás no vão do micro-ondas, e uma moldura de 3 a 8 cm o
    // fecha nos quatro lados, deixando o aparelho embutido.
    part(-0.01, 1.9, 0.46, 0.6, TOP - 1.4, "madeira", 1.4, cab),
    part(0.45, 1.9, 0.03, 0.05, 0.46, "madeira", 1.4, cab),
    part(0.45, 2.45, 0.03, 0.05, 0.46, "madeira", 1.4, cab),
    part(0.45, 1.95, 0.03, 0.5, 0.08, "madeira", 1.4, cab),
    part(0.45, 1.95, 0.03, 0.5, 0.08, "madeira", 1.78, cab),
    part(-0.01, 1.9, 0.48, 0.6, TOP - 1.86, "madeira", 1.86, cab),
    ...door(1.9, 2.5, 1.86, TOP, 0.47),
    part(0.47, 2.15, 0.008, 0.14, 0.008, "escuro", 1.92, line),
    // Em cima da pia: dois módulos e uma fita de luz embaixo.
    part(-0.01, 2.5, 0.35, 0.9, TOP - 1.5, "madeira", 1.5, cab),
    ...door(2.5, 2.95, 1.5, TOP, 0.34),
    part(0.34, 2.91, 0.008, 0.03, 0.12, "escuro", 1.54, line),
    part(0.34, 2.99, 0.008, 0.03, 0.12, "escuro", 1.54, line),
    part(0.28, 2.52, 0.04, 0.86, 0.01, "vidro", 1.49, "#fff6d8"),
    // Em cima da geladeira: armário de 66 cm de fundo, alinhado com a frente dela.
    part(-0.01, 3.42, 0.68, 0.66, TOP - 1.9, "madeira", 1.9, cab),
    ...door(3.42, 3.75, 1.9, TOP, 0.67),
    part(0.67, 3.7, 0.008, 0.1, 0.008, "escuro", 1.94, line),
    part(0.67, 3.8, 0.008, 0.1, 0.008, "escuro", 1.94, line),
    // Painel entre a pia e a geladeira, do chão até o alto.
    part(-0.01, 3.4, 0.7, 0.02, TOP, "madeira", 0, cab),
  ]));
  const pieces = [
    ...p.pieces.filter((x) => !(x.roomId === "cozinha" && (x.name === "Armários aéreos"))),
    cabinets,
  ];
  // Churrasqueira e bancada de apoio lá fora em preto fosco com tampo de granito preto um
  // tom mais claro, que escondem a sujeira da gordura e do carvão.
  const dirty: Record<string, string> = { "#f1ebdf": "#1c1d1f", "#e6e0d4": "#303134", "#b9ad98": "#5a5d62" };
  const outside = pieces.map((x) =>
    x.roomId === "coberta" && (x.name === "Churrasqueira" || x.name === "Bancada de apoio")
      ? { ...x, parts: x.parts.map((q) => (q.c && dirty[q.c] ? { ...q, c: dirty[q.c] } : q)) }
      : x,
  );
  return {
    ...p,
    pieces: [...outside, ...owned],
    notes: addNotes(p.notes, { coberta: ["Churrasqueira e bancada de apoio em preto fosco com tampo de granito preto, que não mostram a sujeira."] }),
  };
}

/** Junta as notas: soma as listas dos cômodos que aparecem nas duas. */
function addNotes(base: Record<string, string[]>, more: Record<string, string[]>): Record<string, string[]> {
  const out = { ...base };
  for (const [room, list] of Object.entries(more)) out[room] = [...(out[room] ?? []), ...list];
  return out;
}

/**
 * Só a vista principal (a G4) aparece, além da Vazia. A Vazia sempre tira as cores da
 * principal (pisos de dentro e de fora), então muda sozinha se a principal mudar.
 */
export const MAIN: Proposal = { ...proposalG4(), label: "Principal" };

// ---------- Variações da área externa da principal ----------
// Mudam só a faixa descoberta do fundo (x 4,79 a 9,87, 1,45 m entre a casa e o muro). A hidro,
// a área coberta e o resto da casa ficam iguais. Tudo que encosta no muro tem até 65 cm de
// fundo, para sobrar uns 75 cm de passagem na frente das janelas do escritório e da suíte.

const CREAM = "#f1ebdf", NAVY = "#1c1d1f", OAK = "#d8c3a2", STONE = "#e6e0d4";

function outside(o: { id: string; label: string; name: string; tagline: string; highlight: string; notes: string[]; floor: FloorKind; catio?: boolean; pieces: () => Piece[] }): Proposal {
  return {
    ...MAIN,
    id: o.id,
    label: o.label,
    name: o.name,
    tagline: o.tagline,
    highlights: [...MAIN.highlights.filter((h) => !h.startsWith("Área externa vazia")), o.highlight],
    notes: { ...MAIN.notes, externa: o.notes },
    outdoor: MAIN.outdoor.map((r) => (r.id === "externa" ? { ...r, floor: o.floor, catio: o.catio ?? false } : r)),
    pieces: [...MAIN.pieces.filter((p) => p.roomId !== "externa"), ...o.pieces()],
  };
}

/** Pisantes de pedra perto da casa, da área coberta até o fundo. */
const steppingStones = () =>
  piece("externa", "Pisantes", "🪨", "Obras", [4.95, 5.6, 6.25, 6.9, 7.55, 8.2, 8.85, 9.4].map((x) => part(x, -0.55, 0.4, 0.36, 0.02, "pedra", 0, STONE)));

function outsideGarden(): Proposal {
  const { z0 } = EXT;
  return outside({
    id: "jardim",
    label: "Jardim",
    name: "Principal com jardim de descanso",
    tagline: "A principal com o fundo em grama, um banco comprido no muro com jardim vertical e plantas altas.",
    highlight: "Área externa: grama com pisantes, banco de alvenaria de 2,20 m no muro com almofadas pretas e jardim vertical em cima, mesinha e plantas altas no fundo.",
    floor: "grama",
    notes: [
      "Banco de alvenaria creme de 2,20 × 0,50 m no muro, em frente à janela do escritório, com assento e encosto pretos.",
      "Jardim vertical no muro, logo acima do encosto: o verde aparece da janela do escritório.",
      "Mesinha lateral e duas plantas altas no fundo, em frente à suíte, com uma terceira no canto do fim.",
      "Pisantes de pedra perto da casa e uns 75 cm livres de ponta a ponta.",
    ],
    pieces: () => [
      piece("externa", "Banco de alvenaria", "🪑", "Móveis", [
        part(5.1, z0, 2.2, 0.5, 0.42, "branco", 0, CREAM),
        part(5.12, z0 + 0.1, 2.16, 0.38, 0.06, "tecido", 0.42, NAVY),
        part(5.12, z0, 2.16, 0.1, 0.36, "tecido", 0.46, NAVY),
      ]),
      piece("externa", "Jardim vertical", "🌿", "Plantas", full([part(5.1, z0, 2.2, 0.05, 1.2, "planta", 1.0)])),
      piece("externa", "Mesinha lateral", "🪵", "Móveis", table(R(7.45, z0 + 0.08, 0.4, 0.4), OAK, NAVY, 0.45)),
      piece("externa", "Plantas altas", "🪴", "Plantas", [...plant(8.2, z0 + 0.05, 0.45, 1.5), ...plant(9.3, z0 + 0.05, 0.45, 1.8), ...plant(9.38, -0.95, 0.4, 1.2)]),
      steppingStones(),
    ],
  });
}

function outsideSun(): Proposal {
  const { z0 } = EXT;
  const lounger = (x: number): Part[] => [
    part(x, z0 + 0.05, 1.9, 0.62, 0.3, "madeira", 0, OAK),
    part(x + 0.05, z0 + 0.09, 1.4, 0.54, 0.06, "tecido", 0.3, CREAM),
    part(x + 1.45, z0 + 0.09, 0.4, 0.54, 0.35, "tecido", 0.3, NAVY),
  ];
  return outside({
    id: "solario",
    label: "Solário",
    name: "Principal com solário",
    tagline: "A principal com o fundo em deque, duas espreguiçadeiras no muro e um ombrelone entre elas.",
    highlight: "Área externa: deque emendando com a área coberta, duas espreguiçadeiras de carvalho com almofadas creme e pretas, mesinha e ombrelone creme.",
    floor: "deck",
    notes: [
      "O deque continua o da área coberta até o fim, sem degrau: sai da hidro e já está no solário.",
      "Duas espreguiçadeiras de 1,90 m deitadas ao longo do muro, uma em frente ao escritório e outra em frente à suíte.",
      "Mesinha entre elas e um ombrelone creme que cobre as duas cabeceiras.",
      "Sobram uns 75 cm de passagem entre as espreguiçadeiras e a casa.",
    ],
    pieces: () => [
      piece("externa", "Espreguiçadeiras", "🏖️", "Móveis", [...lounger(5.0), ...lounger(7.3)]),
      piece("externa", "Mesinha lateral", "🪵", "Móveis", table(R(6.94, z0 + 0.15, 0.32, 0.32), OAK, NAVY, 0.45)),
      piece("externa", "Ombrelone", "⛱️", "Móveis", full([
        part(7.08, -1.02, 0.04, 0.04, 2.2, "metal", 0),
        part(6.3, z0 + 0.02, 1.6, 1.15, 0.04, "tecido", 2.2, CREAM),
      ])),
      piece("externa", "Planta em vaso", "🪴", "Plantas", plant(9.4, z0 + 0.05, 0.42, 1.5)),
    ],
  });
}

function outsideHerbs(): Proposal {
  const { z0, x1 } = EXT;
  const bed = (x: number): Part[] => [part(x, z0, 1.1, 0.45, 0.6, "madeira", 0, OAK), part(x + 0.04, z0 + 0.04, 1.02, 0.37, 0.22, "planta", 0.6)];
  return outside({
    id: "horta",
    label: "Horta",
    name: "Principal com horta",
    tagline: "A principal com uma horta no fundo: canteiros altos, prateleiras de ervas e uma bancada com torneira.",
    highlight: "Área externa: piso de pedra, três canteiros altos de carvalho no muro, prateleiras de ervas em cima, bancada de jardinagem creme com torneira e composteira.",
    floor: "pedra",
    notes: [
      "Três canteiros de 1,10 × 0,45 m e 60 cm de altura no muro: dá para plantar sem se abaixar.",
      "Duas prateleiras de ervas no muro, em cima dos canteiros, para temperos perto da churrasqueira.",
      "Bancada de jardinagem creme com tampo de pedra e torneira no fim, e a composteira no canto.",
      "Piso de pedra, fácil de lavar, com uns 85 cm livres de passagem.",
    ],
    pieces: () => [
      piece("externa", "Canteiros altos", "🌱", "Plantas", [...bed(4.95), ...bed(6.2), ...bed(7.45)]),
      piece("externa", "Prateleiras de ervas", "🌿", "Plantas", full([1.3, 1.7].flatMap((y) => [
        part(4.95, z0, 3.6, 0.18, 0.03, "madeira", y, OAK),
        ...[5.1, 5.6, 6.1, 6.6, 7.1, 7.6, 8.1].map((x) => part(x, z0 + 0.03, 0.3, 0.12, 0.14, "planta", y + 0.03)),
      ]))),
      piece("externa", "Bancada de jardinagem", "🪴", "Móveis", [
        part(8.75, z0, x1 - 8.75, 0.5, 0.86, "madeira", 0, CREAM),
        part(8.75, z0, x1 - 8.75, 0.5, 0.04, "pedra", 0.86, STONE),
        ...full([part(9.3, z0 + 0.02, 0.03, 0.03, 0.3, "metal", 0.9), part(9.3, z0 + 0.02, 0.03, 0.14, 0.03, "metal", 1.17)]),
      ]),
      piece("externa", "Composteira", "♻️", "Móveis", [part(x1 - 0.42, -0.98, 0.4, 0.4, 0.6, "madeira", 0, NAVY)]),
    ],
  });
}

function outsidePergola(): Proposal {
  const { z0, z1 } = EXT;
  const beams: Part[] = [];
  for (const x of [5.0, 6.2, 7.4, 8.6, 9.75]) beams.push(part(x, z0, 0.08, z1 - z0, 0.12, "madeira", 2.4, OAK));
  for (let z = z0 + 0.15; z < z1 - 0.1; z += 0.3) beams.push(part(5.0, z, 4.83, 0.05, 0.05, "madeira", 2.52, OAK));
  return outside({
    id: "pergolado",
    label: "Pergolado",
    name: "Principal com pergolado e café",
    tagline: "A principal com um pergolado de madeira em todo o fundo, mesa de café para dois e uma poltrona de leitura.",
    highlight: "Área externa: pergolado de carvalho com trepadeira no fundo todo, mesa de café para dois em frente ao escritório e poltrona preta com luminária em frente à suíte.",
    floor: "pedra",
    notes: [
      "Pergolado de carvalho a 2,40 m, apoiado na casa e no muro, sem pilares, com uma trepadeira por cima: sombra filtrada sem escurecer as janelas.",
      "Mesa de café de 70 × 60 cm com duas cadeiras creme, em frente à janela do escritório.",
      "Poltrona preta com luminária de piso em frente à suíte, para ler no fim da tarde.",
      "Vaso alto no canto do fundo e uns 65 cm livres na frente da mesa.",
    ],
    pieces: () => [
      piece("externa", "Pergolado", "🪵", "Obras", full([...beams, part(5.0, z0, 4.83, 0.55, 0.05, "planta", 2.57)])),
      piece("externa", "Mesa de café", "☕", "Móveis", [
        ...table(R(5.42, -1.36, 0.7, 0.6), CREAM, NAVY),
        ...chair(4.94, -1.3, "w", CREAM, 0.44, NAVY), ...chair(6.16, -1.3, "e", CREAM, 0.44, NAVY),
      ]),
      piece("externa", "Poltrona", "🛋️", "Móveis", sofa(R(7.9, z0 + 0.05, 0.85, 0.75), "n", NAVY, 1, CREAM)),
      piece("externa", "Luminária de piso", "💡", "Móveis", full([part(8.85, z0 + 0.15, 0.04, 0.04, 1.5, "metal", 0), part(8.75, z0 + 0.08, 0.25, 0.25, 0.2, "tecido", 1.5, CREAM)])),
      piece("externa", "Planta em vaso", "🪴", "Plantas", plant(9.35, z0 + 0.05, 0.45, 1.7)),
    ],
  });
}

function outsideZen(): Proposal {
  const { z0, x1 } = EXT;
  return outside({
    id: "zen",
    label: "Zen",
    name: "Principal com jardim zen",
    tagline: "A principal com um jardim zen no fundo: bambu no muro, fonte de pedra e um deque baixo com almofadas de chão.",
    highlight: "Área externa: pedrisco claro com pisantes, bambu numa floreira creme no muro, fonte de pedra, lanternas e um deque baixo de carvalho com almofadas pretas.",
    floor: "pedra",
    notes: [
      "Bambu numa floreira creme de 2,50 m no muro, em frente ao escritório: verde alto na janela sem ocupar o chão.",
      "Fonte de pedra no meio, com o barulho da água perto da suíte.",
      "Deque baixo de carvalho no canto do fundo, com duas almofadas de chão e uma mesinha baixa, para meditar ou tomar um chá.",
      "Pisantes no pedrisco perto da casa e duas lanternas de pedra marcando o caminho.",
    ],
    pieces: () => [
      piece("externa", "Bambu na floreira", "🎋", "Plantas", full([part(4.9, z0, 2.5, 0.35, 0.4, "branco", 0, CREAM), part(4.95, z0 + 0.05, 2.4, 0.25, 1.9, "planta", 0.4)])),
      piece("externa", "Fonte de pedra", "⛲", "Móveis", [
        part(7.75, z0 + 0.05, 0.6, 0.5, 0.45, "pedra", 0, "#cfc8bc"),
        part(7.8, z0 + 0.1, 0.5, 0.4, 0.02, "vidro", 0.44, "#7fb7cc"),
        ...full([part(8.0, z0 + 0.05, 0.1, 0.1, 0.35, "pedra", 0.45, "#cfc8bc")]),
      ]),
      piece("externa", "Deque com almofadas", "🧘", "Móveis", [
        part(8.6, z0, x1 - 8.6, 0.8, 0.12, "madeira", 0, OAK),
        part(8.65, z0 + 0.12, 0.45, 0.45, 0.1, "tecido", 0.12, NAVY),
        part(9.4, z0 + 0.12, 0.45, 0.45, 0.1, "tecido", 0.12, NAVY),
        part(9.13, z0 + 0.2, 0.24, 0.3, 0.2, "madeira", 0.12, CREAM),
      ]),
      piece("externa", "Lanternas de pedra", "🏮", "Móveis", [
        part(7.5, -1.12, 0.16, 0.16, 0.5, "pedra", 0, "#cfc8bc"), part(7.48, -1.14, 0.2, 0.2, 0.06, "pedra", 0.5, "#cfc8bc"),
        part(8.4, -1.12, 0.16, 0.16, 0.5, "pedra", 0, "#cfc8bc"), part(8.38, -1.14, 0.2, 0.2, 0.06, "pedra", 0.5, "#cfc8bc"),
      ]),
      steppingStones(),
    ],
  });
}

export const PROPOSALS: Proposal[] = [MAIN, outsideGarden(), outsideSun(), outsideHerbs(), outsidePergola(), outsideZen()];

/**
 * A casa com a proposta: troca a área externa, os pisos e os móveis (as louças ficam).
 * Sem proposta, a planta fica 100% vazia: só paredes e cômodos, sem nem as louças da construção.
 */
export function withProposal(home: Home, proposal: Proposal | null): Home {
  // Vazia: sem nenhuma peça, com os pisos da vista principal (dentro de casa, os mesmos; a
  // área externa, o piso da área externa da principal).
  if (!proposal) {
    const outdoorFloor = MAIN.outdoor.find((r) => r.id === "externa")?.floor ?? "grama";
    return {
      ...home,
      rooms: home.rooms.map((r) => ({ ...r, floor: r.outdoor ? outdoorFloor : (MAIN.floors?.[r.id] ?? r.floor) })),
      pieces: home.pieces.filter((p) => !p.fixed),
    };
  }
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
