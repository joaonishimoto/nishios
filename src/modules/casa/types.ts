/**
 * A casa é descrita em metros, vista de cima: x cresce para a direita e z para baixo
 * (o mesmo sentido de quem lê a planta). A altura é y.
 */

/** Retângulo no chão: [x, z, largura, profundidade]. */
export type Rect = [x: number, z: number, w: number, d: number];

export type FloorKind = "madeira" | "piso" | "grama" | "deck" | "pedra" | "branco";

export interface Room {
  id: string;
  name: string;
  /** Um ou mais retângulos: cômodos em L são dois retângulos. */
  rects: Rect[];
  /** Onde fica a etiqueta do cômodo, em [x, z]. */
  label: [number, number];
  floor: FloorKind;
  outdoor?: boolean;
  /** Área externa fechada com tela: os gatos podem andar por ela. */
  catio?: boolean;
  /** Sugestões de melhoria escritas para este cômodo. */
  tips?: string[];
}

/**
 * Parede reta, pelo eixo dela. "x" corre na horizontal da planta (z fixo em `at`), "z" corre
 * na vertical (x fixo em `at`). `gaps` são as portas e passagens e `windows` as janelas,
 * de `from` a `to`.
 */
export interface Wall {
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  gaps?: [number, number][];
  /** Janelas de `a` a `b`; o terceiro número, quando vem, é a altura do peitoril (janela alta). */
  windows?: [number, number, number?][];
}

/** Louças e bancadas que vêm com o apartamento, desenhadas com forma própria. */
export type FixtureKind = "vaso" | "lavatorio" | "box" | "tanque" | "bancada";

export interface Fixture {
  kind: FixtureKind;
  /** Área ocupada no chão. */
  x: number;
  z: number;
  w: number;
  d: number;
  /** Parede em que a peça encosta: n é o topo da planta, s a base, w a esquerda, e a direita. */
  wall: Side;
  /** Box: lados com vidro. */
  glass?: Side[];
  /** Cores próprias no 3D, para combinar com os móveis do lado. */
  colors?: { cabinet?: string; stone?: string };
}

export type Side = "n" | "s" | "e" | "w";

export type Material =
  | "madeira"
  | "branco"
  | "tecido"
  | "escuro"
  | "metal"
  | "planta"
  | "vidro"
  | "tapete"
  | "pedra"
  /** Alvenaria fora das paredes retas, como o shaft de tubulação: usa a cor e a altura das paredes. */
  | "parede"
  /** Tela de proteção para gatos, quase transparente. */
  | "tela"
  /** Telhado translúcido (policarbonato ou vidro) e pergolado: fica acima de tudo. */
  | "cobertura";

/** Um bloco de um móvel, em coordenadas da casa. */
export interface Part {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** Altura da base; 0 = no chão. */
  y?: number;
  m: Material;
  /** Cor própria no 3D (a planta usa a cor do material). */
  c?: string;
  /** Mostra a altura inteira no 3D, sem o corte dos móveis (armários altos, aéreos e TVs). */
  full?: boolean;
}

export interface Piece {
  id: string;
  roomId: string;
  name: string;
  icon: string;
  /** Categoria usada ao criar o bem a partir da planta. */
  category: string;
  parts: Part[];
  /** Bem de "Bens e desejos" que este móvel representa. */
  assetId?: string;
  /** Preço de verdade (em reais) e link da loja, quando o João já escolheu o produto. */
  price?: number;
  link?: string;
  /** Parte da construção (muro, porta de vidro): aparece no 3D mas não na lista de móveis. */
  fixed?: boolean;
  /** Louça desenhada com forma própria; quando existe, `parts` é só a área ocupada. */
  fixture?: Fixture;
}

/**
 * Porta de abrir num vão de parede: a folha gira na ponta `hinge` (a ou b do vão) e abre
 * para o lado `into` (+1 para o x ou o z maior, -1 para o menor).
 */
export interface Door {
  axis: "x" | "z";
  at: number;
  a: number;
  b: number;
  hinge: "a" | "b";
  into: 1 | -1;
  /** Porta de entrada: aparece fechada, no plano da parede, em vez de aberta a 90°. */
  main?: boolean;
}

export interface Home {
  name: string;
  rooms: Room[];
  walls: Wall[];
  doors?: Door[];
  pieces: Piece[];
}

export type ViewMode = "3d" | "planta";
