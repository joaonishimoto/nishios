import type { Wish } from "@/modules/bens/types";
import type { Proposal } from "./proposals";
import type { Piece } from "./types";

/**
 * Móveis de uma proposta da Casa viram desejos em Bens. Peças repetidas (dois criados-mudos)
 * viram um desejo só, com a quantidade no nome, e o preço é uma estimativa de loja popular.
 */

// Preço médio de cada unidade, em reais, pelo começo do nome da peça.
const PRICES: [RegExp, number][] = [
  [/^cama de casal/i, 2500],
  [/^cama viúva/i, 1900],
  [/^cama de solteiro/i, 1100],
  [/^mesa com computador/i, 900],
  [/^frigobar/i, 1300],
  [/^bancada planejada/i, 9000],
  [/^armários aéreos/i, 3000],
  [/^cooktop/i, 900],
  [/^pia$/i, 800],
  [/^porta de vidro/i, 3500],
  [/^painel e tv/i, 3800],
  [/^cama com bicama/i, 1600],
  [/^cama retrátil/i, 4500],
  [/^criado-mudo/i, 400],
  [/^guarda-roupa/i, 3000],
  [/^sofá em l/i, 5000],
  [/^sofá-cama/i, 2200],
  [/^sofá/i, 3000],
  [/^daybed/i, 2000],
  [/^poltrona/i, 1200],
  [/^mesa de centro/i, 500],
  [/^rack e tv/i, 4000],
  [/^mesa de trabalho/i, 900],
  [/^cadeira de escritório/i, 900],
  [/^mesa (de jantar|comprida|de 6)/i, 1800],
  [/^mesa e cadeiras/i, 1500],
  [/^cadeiras/i, 1200],
  [/^banco e cadeiras/i, 1200],
  [/^banquetas/i, 500],
  [/^banco/i, 600],
  [/^estante|^prateleira$/i, 700],
  [/^aparador|^sapateira/i, 900],
  [/^tapete/i, 600],
  [/^luminária/i, 300],
  [/^planta/i, 150],
  [/^pufe/i, 300],
  [/^fogão/i, 1500],
  [/^geladeira/i, 3500],
  [/^máquina de lavar/i, 2500],
  [/^armário/i, 1200],
  [/^bancada/i, 1500],
  [/^churrasqueira/i, 2500],
  [/^ofurô/i, 6000],
  [/^bicicleta/i, 1500],
  [/^halteres/i, 600],
  [/^colchonete/i, 120],
  [/^rede de janela|^nicho/i, 180],
  [/^rede/i, 300],
  [/^prateleiras|^caminho dos gatos|^parede de escalada/i, 350],
  [/^grama/i, 40],
  [/^espreguiçadeira/i, 1200],
  [/^varal/i, 250],
  [/^pergolado/i, 5000],
  [/^cobertura/i, 6000],
  [/^telhado/i, 9000],
  [/^hidromassagem/i, 18000],
  [/^painel ripado/i, 2500],
  [/^ducha/i, 900],
  [/^espelheira/i, 400],
  [/^toalheiro/i, 120],
  [/^jardim vertical/i, 900],
  [/^grama para gatos/i, 60],
  [/^espreguiçadeiras/i, 2400],
  [/^balcão na mureta/i, 1500],
  [/^casinha dos gatos/i, 900],
  [/^tanque/i, 600],
  [/^tela de proteção/i, 1500],
  [/^canteiros|^horta/i, 600],
  [/^torre para gatos/i, 450],
  [/^caixa de areia/i, 150],
  [/^comedouro/i, 250],
  [/^cama dos gatos/i, 120],
  [/^arranhador/i, 150],
  [/^túnel/i, 100],
];

export function estimate(name: string): number {
  return PRICES.find(([re]) => re.test(name))?.[1] ?? 0;
}

/** O texto que marca o desejo como vindo desta proposta (também evita repetir). */
export const origin = (proposal: Proposal) => `Proposta ${proposal.id.toUpperCase()} (${proposal.name}) da Casa`;

/** Desejos novos para as peças, juntando as de mesmo nome, sem repetir o que já está na lista. */
export function wishesFor(
  proposal: Proposal,
  pieces: Piece[],
  roomName: (id: string) => string,
  existing: Wish[],
): Wish[] {
  const from = origin(proposal);
  const groups = new Map<string, Piece[]>();
  for (const p of pieces) {
    if (p.fixed) continue;
    groups.set(p.name, [...(groups.get(p.name) ?? []), p]);
  }
  const out: Wish[] = [];
  for (const [name, list] of groups) {
    const label = list.length > 1 ? `${name} (${list.length})` : name;
    if (existing.some((w) => w.notes.startsWith(from) && (w.name === label || w.name === name))) continue;
    const rooms = [...new Set(list.map((p) => roomName(p.roomId)))].join(", ");
    out.push({
      id: crypto.randomUUID(),
      name: label,
      icon: list[0].icon,
      price: estimate(name) * list.length,
      priority: "medium",
      targetDate: "",
      link: "",
      notes: `${from}, ${rooms}. Preço estimado.`,
    });
  }
  return out;
}

export function inWishes(proposal: Proposal, piece: Piece, existing: Wish[]): boolean {
  const from = origin(proposal);
  return existing.some((w) => w.notes.startsWith(from) && (w.name === piece.name || w.name.startsWith(`${piece.name} (`)));
}
