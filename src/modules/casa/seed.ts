import type { Home, Material, Part, Piece, Wall } from "./types";

/**
 * O apartamento do João, medido a partir da planta da construtora (em metros).
 * As medidas vieram da imagem, então podem ter uns 10 cm de diferença.
 */

const p = (x: number, z: number, w: number, d: number, h: number, m: Material, y = 0): Part => ({
  x, z, w, d, h, m, y,
});

let n = 0;
const piece = (
  roomId: string,
  name: string,
  icon: string,
  category: string,
  parts: Part[],
  extra: Partial<Piece> = {},
): Piece => ({ id: `m${++n}`, roomId, name, icon, category, parts, ...extra });

const w = (axis: Wall["axis"], at: number, from: number, to: number, gaps?: Wall["gaps"]): Wall => ({
  axis, at, from, to, gaps,
});

export function seedHome(): Home {
  n = 0;
  return {
    name: "Apartamento",
    rooms: [
      {
        id: "estar", name: "Estar", rects: [[1.64, 3.25, 4.11, 2.31]], label: [2.6, 4.3], floor: "madeira",
        tips: [
          "O estar tem só o sofá: cabe uma poltrona no canto ao lado da mesa lateral, virada para a TV, sem fechar a passagem para o jantar.",
        ],
      },
      {
        id: "jantar", name: "Jantar", rects: [[1.64, 1.42, 2.64, 1.83]], label: [2.5, 1.75], floor: "madeira",
        tips: [
          "A mesa retangular fica no caminho entre a cozinha e o estar. Uma redonda de 4 lugares libera a passagem pelo balcão.",
        ],
      },
      {
        id: "cozinha", name: "Cozinha", rects: [[0, 1.53, 1.64, 2.66]], label: [0.95, 3.0], floor: "piso",
        tips: [
          "A bancada é curta. Um carrinho auxiliar ao lado do balcão dá mais área de preparo sem obra.",
        ],
      },
      { id: "servico", name: "Serviço", rects: [[0, 0.21, 1.64, 1.32]], label: [0.85, 0.75], floor: "piso" },
      {
        id: "varanda", name: "Varanda", rects: [[1.64, 0.24, 2.64, 1.18]], label: [2.95, 0.5], floor: "piso",
        tips: [
          "A varanda é a entrada da área externa. Usar o mesmo piso nas duas faz as duas parecerem um ambiente só.",
        ],
      },
      {
        id: "quarto", name: "Quarto", rects: [[4.28, -0.06, 2.52, 3.11]], label: [5.4, 1.9], floor: "madeira",
        tips: [
          "Quarto e escritório dividem o espaço: uma cortina blackout e uma luminária na escrivaninha ajudam a separar trabalho e descanso.",
        ],
      },
      {
        id: "suite", name: "Suíte", rects: [[6.8, -0.06, 3.21, 2.94], [6.8, 2.88, 1.02, 1.29]], label: [8.6, 1.75], floor: "madeira",
        tips: [
          "O guarda-roupa ocupa a parede da entrada. Portas de correr evitam bater na cama ao abrir.",
        ],
      },
      { id: "banhosuite", name: "Banho da suíte", rects: [[7.82, 2.88, 2.19, 1.29]], label: [8.9, 3.75], floor: "piso" },
      { id: "circ", name: "Circulação", rects: [[5.75, 3.05, 1.05, 1.2]], label: [6.3, 3.6], floor: "madeira" },
      { id: "banho", name: "Banheiro", rects: [[5.75, 4.19, 2.3, 1.34]], label: [6.9, 5.2], floor: "piso" },
      {
        id: "externa", name: "Área externa", outdoor: true, floor: "grama", label: [7.2, -0.85],
        rects: [[-0.06, -1.56, 10.13, 1.5], [-0.06, -0.06, 1.7, 0.27], [1.64, -0.06, 2.64, 0.3]],
        tips: [
          "Com 1,5 m de fundo dá para um varal retrátil e uma horta vertical no muro sem atrapalhar a passagem.",
        ],
      },
    ],
    walls: [
      // Externas
      w("z", -0.06, 0.15, 4.25), w("x", 0.21, -0.06, 1.7), w("x", 4.19, -0.06, 1.7),
      w("z", 1.64, 0.15, 2.15), w("z", 1.64, 4.13, 5.59),
      w("x", 5.53, 1.58, 8.11), w("z", 8.05, 4.13, 5.59, [[4.6, 5.1]]),
      w("z", 4.28, -0.12, 1.42), w("x", -0.06, 4.22, 10.07), w("z", 10.01, -0.12, 4.23, [[1.1, 2.2]]),
      w("x", 4.17, 6.74, 10.07, [[6.8, 7.4]]),
      // Internas
      w("x", 3.05, 4.22, 5.95), w("z", 6.8, -0.06, 3.05), w("z", 6.8, 3.7, 4.25),
      w("x", 2.88, 7.76, 10.01), w("z", 7.82, 2.88, 4.17, [[3.35, 4.0]]),
      w("x", 4.25, 5.75, 8.08, [[5.8, 6.5]]), w("z", 5.75, 4.19, 5.59),
      w("z", 4.28, 2.9, 3.11),
    ],
    pieces: [
      // Serviço
      piece("servico", "Tanque", "🚰", "Móveis", [p(0.2, 0.32, 0.42, 0.45, 0.88, "branco")]),
      piece("servico", "Máquina de lavar 12 kg", "🧺", "Eletrodomésticos", [p(0.02, 0.98, 0.6, 0.55, 0.95, "branco")], { assetId: "a6" }),
      piece("servico", "Armário de limpeza", "🧹", "Móveis", [p(1.3, 0.52, 0.28, 0.8, 1.0, "branco")]),
      // Cozinha
      piece("cozinha", "Fogão", "🔥", "Eletrodomésticos", [p(0.02, 1.6, 0.62, 0.6, 0.9, "metal")]),
      piece("cozinha", "Pia", "🚰", "Móveis", [p(0.02, 2.22, 0.6, 1.18, 0.88, "branco"), p(0, 2.2, 0.64, 1.22, 0.04, "pedra", 0.88)]),
      piece("cozinha", "Air fryer", "🍳", "Eletrodomésticos", [p(0.1, 2.95, 0.3, 0.3, 0.32, "escuro", 0.92)], { assetId: "a7" }),
      piece("cozinha", "Geladeira frost free", "🧊", "Eletrodomésticos", [p(0.02, 3.45, 0.64, 0.64, 1.8, "metal")], { assetId: "a5" }),
      piece("cozinha", "Balcão", "🪵", "Móveis", [p(1.5, 2.2, 0.4, 1.12, 0.95, "madeira")]),
      // Jantar
      piece("jantar", "Banquetas", "🪑", "Móveis", [p(1.97, 2.4, 0.28, 0.28, 0.65, "branco"), p(1.97, 2.85, 0.28, 0.28, 0.65, "branco")]),
      piece("jantar", "Mesa de jantar", "🍽️", "Móveis", [
        p(2.84, 2.15, 1.34, 0.81, 0.04, "branco", 0.72),
        p(2.9, 2.2, 0.07, 0.07, 0.72, "madeira"), p(4.06, 2.2, 0.07, 0.07, 0.72, "madeira"),
        p(2.9, 2.84, 0.07, 0.07, 0.72, "madeira"), p(4.06, 2.84, 0.07, 0.07, 0.72, "madeira"),
      ]),
      piece("jantar", "Cadeiras", "🪑", "Móveis", [
        p(3.05, 1.82, 0.38, 0.36, 0.46, "escuro"), p(3.6, 1.82, 0.38, 0.36, 0.46, "escuro"),
        p(3.05, 3.0, 0.38, 0.36, 0.46, "escuro"), p(3.6, 3.0, 0.38, 0.36, 0.46, "escuro"),
      ]),
      // Varanda
      piece("varanda", "Mesa da varanda", "☕", "Móveis", [
        p(2.14, 0.52, 0.56, 0.56, 0.72, "branco"), p(1.86, 0.6, 0.3, 0.3, 0.45, "madeira"), p(2.3, 1.05, 0.3, 0.3, 0.45, "madeira"),
      ]),
      piece("varanda", "Planta", "🪴", "Outros", [p(3.62, 0.78, 0.42, 0.42, 0.3, "branco"), p(3.5, 0.66, 0.66, 0.66, 0.6, "planta", 0.3)]),
      piece("varanda", "Porta de vidro", "🚪", "Outros", [p(1.64, 1.38, 2.64, 0.06, 2.1, "vidro")], { fixed: true }),
      piece("varanda", "Guarda-corpo", "🚪", "Outros", [p(1.68, 0.2, 0.9, 0.06, 0.5, "vidro"), p(3.38, 0.2, 0.9, 0.06, 0.5, "vidro")], { fixed: true }),
      // Estar
      piece("estar", "Sofá de 3 lugares", "🛋️", "Móveis", [
        p(3.57, 4.62, 2.05, 0.82, 0.42, "tecido"), p(3.57, 5.22, 2.05, 0.22, 0.82, "tecido"),
        p(3.57, 4.62, 0.18, 0.82, 0.6, "tecido"), p(5.44, 4.62, 0.18, 0.82, 0.6, "tecido"),
      ], { assetId: "a8" }),
      piece("estar", "Tapete", "🟫", "Móveis", [p(3.57, 3.52, 2.12, 1.9, 0.02, "tapete")]),
      piece("estar", "Mesa lateral", "🪵", "Móveis", [p(2.98, 4.83, 0.48, 0.48, 0.5, "madeira")]),
      piece("estar", "Rack", "📦", "Móveis", [p(4.27, 3.13, 1.26, 0.36, 0.45, "madeira")]),
      piece("estar", "TV", "📺", "Eletrônicos", [p(4.4, 3.22, 1.0, 0.06, 0.6, "escuro", 0.48)]),
      // Quarto
      piece("quarto", "Cama de solteiro", "🛏️", "Móveis", [
        p(4.35, 0, 2.0, 0.82, 0.32, "madeira"), p(4.4, 0.04, 1.9, 0.74, 0.18, "branco", 0.32),
        p(4.35, 0, 0.08, 0.82, 0.75, "madeira"), p(4.5, 0.1, 0.4, 0.55, 0.1, "branco", 0.5),
      ]),
      piece("quarto", "Criado-mudo", "🪵", "Móveis", [p(4.39, 0.88, 0.38, 0.5, 0.5, "madeira")]),
      piece("quarto", "Tapete do quarto", "🟫", "Móveis", [p(4.8, 0.83, 1.37, 1.23, 0.02, "tapete")]),
      piece("quarto", "Mesa de escritório", "🪑", "Móveis", [
        p(6.2, 1.12, 0.5, 0.85, 0.04, "madeira", 0.72), p(6.22, 1.14, 0.05, 0.8, 0.72, "madeira"), p(6.63, 1.14, 0.05, 0.8, 0.72, "madeira"),
      ], { assetId: "a10" }),
      piece("quarto", "Monitor 27 polegadas", "🖥️", "Eletrônicos", [p(6.55, 1.25, 0.04, 0.62, 0.38, "escuro", 0.8)], { assetId: "a3" }),
      piece("quarto", "MacBook Air M3", "💻", "Eletrônicos", [p(6.25, 1.3, 0.24, 0.32, 0.02, "metal", 0.76)], { assetId: "a1" }),
      piece("quarto", "Estante", "📚", "Móveis", [p(6.42, 0, 0.32, 1.12, 1.9, "madeira")]),
      piece("quarto", "Cadeira", "💺", "Móveis", [p(5.85, 1.36, 0.42, 0.42, 0.45, "escuro"), p(5.85, 1.36, 0.06, 0.42, 0.9, "escuro")]),
      piece("quarto", "Guarda-roupa", "🚪", "Móveis", [p(4.35, 2.4, 1.5, 0.58, 2.0, "madeira")]),
      // Suíte
      piece("suite", "Guarda-roupa da suíte", "🚪", "Móveis", [p(6.88, 0.02, 0.52, 2.0, 2.0, "madeira")]),
      piece("suite", "Tapete da suíte", "🟫", "Móveis", [p(7.55, 0.88, 2.27, 1.54, 0.02, "tapete")]),
      piece("suite", "Cama box queen", "🛏️", "Móveis", [
        p(7.97, 0.02, 1.54, 2.06, 0.32, "madeira"), p(8.0, 0.08, 1.48, 1.98, 0.2, "branco", 0.32),
        p(7.97, 0, 1.54, 0.1, 0.95, "madeira"), p(8.1, 0.18, 0.55, 0.36, 0.1, "branco", 0.52),
        p(8.8, 0.18, 0.55, 0.36, 0.1, "branco", 0.52), p(8.0, 0.95, 1.48, 1.1, 0.22, "tecido", 0.32),
      ], { assetId: "a9" }),
      piece("suite", "Criados-mudos", "🪵", "Móveis", [p(7.56, 0.02, 0.36, 0.36, 0.5, "madeira"), p(9.48, 0.02, 0.42, 0.42, 0.5, "madeira")]),
      piece("suite", "TV da suíte", "📺", "Eletrônicos", [p(8.2, 2.68, 1.15, 0.12, 0.5, "madeira"), p(8.28, 2.74, 1.0, 0.05, 0.42, "escuro", 0.5)]),
      // Banheiros
      piece("banhosuite", "Pia", "🚰", "Móveis", [p(7.92, 2.98, 0.5, 0.45, 0.85, "branco")]),
      piece("banhosuite", "Vaso", "🚽", "Outros", [p(8.7, 2.98, 0.4, 0.62, 0.42, "branco")]),
      piece("banhosuite", "Box", "🚿", "Outros", [p(9.17, 2.98, 0.8, 1.15, 1.9, "vidro")]),
      piece("banho", "Pia", "🚰", "Móveis", [p(5.84, 4.98, 0.6, 0.48, 0.85, "branco")]),
      piece("banho", "Vaso", "🚽", "Outros", [p(6.65, 4.84, 0.4, 0.62, 0.42, "branco")]),
      piece("banho", "Box", "🚿", "Outros", [p(7.12, 4.88, 0.88, 0.6, 1.9, "vidro")]),
      // Área externa
      piece("externa", "Muro", "🧱", "Outros", [
        p(-0.12, -1.62, 10.25, 0.1, 0.6, "pedra"), p(-0.12, -1.62, 0.1, 1.9, 0.6, "pedra"), p(10.07, -1.62, 0.1, 1.62, 0.6, "pedra"),
      ], { fixed: true }),
    ],
  };
}
