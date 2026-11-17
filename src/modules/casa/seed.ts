import type { Home, Material, Part, Piece, Wall } from "./types";

/**
 * O apartamento do João, medido a partir da planta da construtora (em metros).
 * As medidas vieram da imagem, então podem ter uns 10 cm de diferença.
 */

const p = (x: number, z: number, w: number, d: number, h: number, m: Material, y = 0): Part => ({
  x, z, w, d, h, m, y,
});

let n = 0;
/** Parte da construção: aparece no 3D, mas não é um móvel nem um bem. */
const fixed = (roomId: string, name: string, parts: Part[]): Piece => ({
  id: `c${++n}`, roomId, name, icon: "🏠", category: "Outros", parts, fixed: true,
});

const w = (axis: Wall["axis"], at: number, from: number, to: number, gaps?: Wall["gaps"]): Wall => ({
  axis, at, from, to, gaps,
});

export function seedHome(): Home {
  n = 0;
  return {
    name: "Apartamento",
    rooms: [
      {
        id: "estar", name: "Estar", rects: [[1.64, 3.05, 4.11, 2.51]], label: [2.6, 4.3], floor: "madeira",
      },
      {
        id: "jantar", name: "Jantar", rects: [[1.64, 1.42, 2.64, 1.63]], label: [2.5, 1.75], floor: "madeira",
      },
      {
        id: "cozinha", name: "Cozinha", rects: [[0, 1.53, 1.64, 2.66]], label: [0.95, 3.0], floor: "piso",
        tips: [
          "A bancada da pia é curta. Um carrinho auxiliar ou uma ilha pequena dá mais área de preparo sem obra.",
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
      },
      {
        id: "suite", name: "Suíte", rects: [[6.8, -0.06, 3.21, 2.94], [6.8, 2.88, 1.02, 1.29]], label: [8.6, 1.75], floor: "madeira",
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
      w("z", 1.64, 0.15, 2.15), w("z", 1.64, 4.13, 5.59, [[4.55, 5.4]]),
      w("x", 5.53, 1.58, 8.11), w("z", 8.05, 4.13, 5.59),
      w("z", 4.28, -0.12, 3.11), w("x", -0.06, 4.22, 10.07), w("z", 10.01, -0.12, 4.23),
      w("x", 4.17, 6.74, 10.07, [[6.8, 7.4]]),
      // Internas
      w("x", 3.05, 4.22, 5.95), w("z", 6.8, -0.06, 3.05), w("z", 6.8, 3.7, 4.25),
      w("x", 2.88, 7.76, 10.01), w("z", 7.82, 2.88, 4.17, [[3.35, 4.0]]),
      w("x", 4.25, 5.75, 8.08, [[5.8, 6.5]]), w("z", 5.75, 4.19, 5.59),
    ],
    // Apartamento vazio: só o que vem com a construção (louças, bancada, box, tanque,
    // shafts, porta da varanda e muro). Os móveis entram depois, pelo editor.
    pieces: [
      fixed("servico", "Shaft de tubulação", [p(0, 0.27, 0.2, 0.65, 2.6, "parede")]),
      fixed("servico", "Tanque", [p(0.2, 0.32, 0.42, 0.45, 0.88, "branco")]),
      fixed("cozinha", "Bancada da pia", [p(0.02, 2.22, 0.6, 1.18, 0.88, "branco"), p(0, 2.2, 0.64, 1.22, 0.04, "pedra", 0.88)]),
      fixed("varanda", "Porta de vidro", [p(1.64, 1.38, 2.64, 0.06, 2.1, "vidro")]),
      fixed("banhosuite", "Pia", [p(7.92, 2.98, 0.5, 0.45, 0.85, "branco")]),
      fixed("banhosuite", "Vaso", [p(8.7, 2.98, 0.4, 0.62, 0.42, "branco")]),
      fixed("banhosuite", "Box", [p(9.17, 2.98, 0.8, 1.15, 1.9, "vidro")]),
      fixed("banho", "Pia", [p(5.84, 4.98, 0.6, 0.48, 0.85, "branco")]),
      fixed("banho", "Vaso", [p(6.65, 4.84, 0.4, 0.62, 0.42, "branco")]),
      fixed("banho", "Shaft de tubulação", [p(7.25, 5.31, 0.8, 0.22, 2.6, "parede")]),
      fixed("banho", "Box", [p(7.2, 4.7, 0.85, 0.61, 1.9, "vidro")]),
      fixed("externa", "Muro", [
        p(-0.12, -1.62, 10.25, 0.1, 0.6, "pedra"), p(-0.12, -1.62, 0.1, 1.9, 0.6, "pedra"), p(10.07, -1.62, 0.1, 1.62, 0.6, "pedra"),
      ]),
    ],
  };
}
