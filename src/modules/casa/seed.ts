import type { Fixture, Home, Material, Part, Piece, Wall } from "./types";

/**
 * O apartamento do João, medido na planta da construtora (em metros). As paredes estão no
 * eixo, com 10 cm de espessura, e os cômodos vão de face a face das paredes, então a largura
 * e a profundidade de cada cômodo são as cotas da planta (quarto 2,40 × 3,00, banho 2,15 × 1,20).
 */

const p = (x: number, z: number, w: number, d: number, h: number, m: Material, y = 0): Part => ({
  x, z, w, d, h, m, y,
});

let n = 0;
/** Parte da construção: aparece no 3D, mas não é um móvel nem um bem. */
const fixed = (roomId: string, name: string, parts: Part[]): Piece => ({
  id: `c${++n}`, roomId, name, icon: "🏠", category: "Outros", parts, fixed: true,
});

/** Louça com forma própria (vaso, pia, box, tanque, bancada). */
const louca = (roomId: string, name: string, f: Fixture): Piece => ({
  ...fixed(roomId, name, [p(f.x, f.z, f.w, f.d, 0.85, "branco")]),
  fixture: f,
});

const w = (
  axis: Wall["axis"], at: number, from: number, to: number,
  gaps?: Wall["gaps"], windows?: Wall["windows"],
): Wall => ({ axis, at, from, to, gaps, windows });

export function seedHome(): Home {
  n = 0;
  return {
    name: "Apartamento",
    rooms: [
      {
        id: "estar", name: "Estar", rects: [[1.7, 3.07, 3.95, 2.35]], label: [3.4, 4.3], floor: "madeira",
      },
      {
        id: "jantar", name: "Jantar", rects: [[1.7, 1.45, 2.49, 1.62]], label: [2.95, 2.0], floor: "madeira",
      },
      {
        id: "cozinha", name: "Cozinha", rects: [[-0.01, 1.54, 1.61, 2.56]], label: [1.0, 3.1], floor: "piso",
        tips: [
          "A bancada da pia é curta. Um carrinho auxiliar ou uma ilha pequena dá mais área de preparo sem obra.",
        ],
      },
      { id: "servico", name: "Serviço", rects: [[-0.01, 0.29, 1.61, 1.25]], label: [0.95, 1.05], floor: "piso" },
      {
        id: "varanda", name: "Varanda", rects: [[1.7, 0.4, 2.49, 1.05]], label: [2.95, 0.85], floor: "piso",
        tips: [
          "A varanda é a entrada da área externa. Usar o mesmo piso nas duas faz as duas parecerem um ambiente só.",
        ],
      },
      {
        id: "quarto", name: "Quarto", rects: [[4.29, -0.01, 2.4, 2.98]], label: [5.5, 1.5], floor: "madeira",
      },
      {
        id: "suite", name: "Suíte", rects: [[6.79, -0.01, 3.08, 2.69], [6.79, 2.68, 0.92, 1.42]], label: [8.3, 1.3], floor: "madeira",
      },
      { id: "banhosuite", name: "Banho da suíte", rects: [[7.81, 2.78, 2.06, 1.32]], label: [8.85, 3.75], floor: "piso" },
      { id: "circ", name: "Circulação", rects: [[5.65, 3.07, 1.04, 1.03]], label: [6.2, 3.6], floor: "madeira" },
      { id: "banho", name: "Banheiro", rects: [[5.75, 4.2, 2.15, 1.22]], label: [6.5, 4.55], floor: "piso" },
      {
        id: "externa", name: "Área externa", outdoor: true, floor: "grama", label: [7.2, -0.85],
        rects: [[-0.11, -1.56, 10.08, 1.45], [-0.11, -0.11, 1.76, 0.3], [1.65, -0.11, 2.54, 0.51]],
        tips: [
          "Com 1,5 m de fundo dá para um varal retrátil e uma horta vertical no muro sem atrapalhar a passagem.",
        ],
      },
    ],
    walls: [
      // Externas, com as janelas
      w("z", -0.06, 0.19, 4.2),
      w("x", 0.24, -0.11, 1.7, undefined, [[0.3, 1.52]]),
      w("x", 4.15, -0.11, 1.7),
      w("z", 1.65, 4.1, 5.52, [[4.42, 5.32]]), // porta de entrada, no estar
      w("x", 5.47, 1.6, 8.0),
      w("z", 7.95, 4.1, 5.52, undefined, [[4.56, 5.2]]),
      w("z", 4.24, -0.11, 3.07),
      w("x", -0.06, 4.19, 9.97, undefined, [[4.87, 6.1], [7.72, 8.94]]), // janelas do quarto e da suíte, para a área externa
      w("z", 9.92, -0.11, 4.2, undefined, [[3.0, 3.64]]),
      w("x", 4.15, 5.65, 9.97, [[5.82, 6.52]]),
      // Internas, com as portas
      w("z", 1.65, 0.19, 2.17),
      w("x", 3.02, 4.19, 5.81),
      w("z", 6.74, -0.11, 4.2, [[3.23, 4.04]]),
      w("x", 2.73, 7.71, 9.97),
      w("z", 7.76, 2.68, 4.2, [[3.32, 4.03]]),
      w("z", 5.7, 4.1, 5.52),
    ],
    // Portas de abrir, todas abertas a 90° encostadas na parede mais próxima.
    doors: [
      { axis: "z", at: 1.65, a: 4.42, b: 5.32, hinge: "b", into: 1 }, // entrada, para o estar
      { axis: "x", at: 3.02, a: 5.81, b: 6.69, hinge: "b", into: -1 }, // quarto
      { axis: "z", at: 6.74, a: 3.23, b: 4.04, hinge: "b", into: 1 }, // suíte
      { axis: "z", at: 7.76, a: 3.32, b: 4.03, hinge: "b", into: 1 }, // banheiro da suíte
      { axis: "x", at: 4.15, a: 5.82, b: 6.52, hinge: "a", into: 1 }, // banheiro
    ],
    // Apartamento vazio: só o que vem com a construção (louças, bancada, box, tanque,
    // shafts e muro). Os móveis entram depois, pelo editor.
    pieces: [
      fixed("servico", "Shaft de tubulação", [p(-0.01, 0.29, 0.22, 0.58, 2.6, "parede")]),
      louca("servico", "Tanque", { kind: "tanque", x: 0.24, z: 0.29, w: 0.5, d: 0.45, wall: "n" }),
      louca("cozinha", "Bancada da pia", { kind: "bancada", x: -0.01, z: 2.2, w: 0.6, d: 1.18, wall: "w" }),
      louca("banhosuite", "Pia", { kind: "lavatorio", x: 7.81, z: 2.78, w: 0.66, d: 0.5, wall: "n" }),
      louca("banhosuite", "Vaso", { kind: "vaso", x: 8.6, z: 2.78, w: 0.4, d: 0.64, wall: "n" }),
      louca("banhosuite", "Box", { kind: "box", x: 9.07, z: 2.78, w: 0.8, d: 1.32, wall: "n", glass: ["w"] }),
      louca("banho", "Pia", { kind: "lavatorio", x: 5.75, z: 4.92, w: 0.64, d: 0.5, wall: "s" }),
      louca("banho", "Vaso", { kind: "vaso", x: 6.56, z: 4.78, w: 0.4, d: 0.64, wall: "s" }),
      louca("banho", "Box", { kind: "box", x: 7.11, z: 4.2, w: 0.79, d: 1.22, wall: "s", glass: ["w"] }),
      fixed("externa", "Muro", [
        p(-0.16, -1.66, 10.18, 0.1, 2.2, "pedra"), p(-0.16, -1.66, 0.1, 1.55, 2.2, "pedra"), p(9.92, -1.66, 0.1, 1.55, 2.2, "pedra"), // muro de 2,20 m
      ]),
    ],
  };
}
