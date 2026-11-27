import { LIBRARY_BY_ID } from "./library";
import type { PlanDraft, PlanItem } from "./types";

/** Programas prontos: cada um é um conjunto de fichas para copiar e ajustar. */
export type TemplateLevel = "iniciante" | "intermediario" | "avancado";

export const LEVEL_LABELS: Record<TemplateLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export type TemplatePlace = "academia" | "casa";

export interface TrainingTemplate {
  id: string;
  name: string;
  level: TemplateLevel;
  place: TemplatePlace;
  /** "3x por semana" */
  frequency: string;
  goal: string;
  description: string;
  plans: PlanDraft[];
}

/** [exercício sem o "ex-", séries, reps mín, reps máx, descanso em s, observação] */
type Row = [string, number, number, number, number, string?];

const plan = (name: string, notes: string, rows: Row[]): PlanDraft => ({
  name,
  notes,
  items: rows.map(([id, sets, repsMin, repsMax, rest, itemNotes = ""]): PlanItem => ({
    exerciseId: `ex-${id}`,
    sets,
    repsMin,
    repsMax,
    weight: 0,
    rest,
    notes: itemNotes,
  })),
});

const WARMUP = "Aqueça 5 a 10 min e faça 1 ou 2 séries leves do primeiro exercício.";

export const TEMPLATES: TrainingTemplate[] = [
  {
    id: "iniciante-ab",
    name: "Iniciante · Corpo todo A/B",
    level: "iniciante",
    place: "academia",
    frequency: "3x por semana",
    goal: "Aprender os movimentos e criar base",
    description: "Duas fichas de corpo todo, alternando A, B, A na semana. Máquinas e movimentos simples, para ganhar técnica antes de carga.",
    plans: [
      plan("Treino A · Corpo todo", WARMUP, [
        ["leg-press", 3, 12, 15, 90],
        ["supino-maquina", 3, 10, 12, 90],
        ["puxada-frontal", 3, 10, 12, 90],
        ["cadeira-flexora", 3, 12, 15, 60],
        ["elevacao-lateral", 2, 12, 15, 60],
        ["prancha", 3, 30, 30, 45, "30 segundos."],
      ]),
      plan("Treino B · Corpo todo", WARMUP, [
        ["agachamento-goblet", 3, 10, 12, 90],
        ["remada-maquina", 3, 10, 12, 90],
        ["supino-inclinado-halteres", 3, 10, 12, 90],
        ["cadeira-extensora", 3, 12, 15, 60],
        ["rosca-alternada", 2, 10, 12, 60],
        ["triceps-corda", 2, 10, 12, 60],
        ["abdominal-supra", 3, 15, 20, 45],
      ]),
    ],
  },
  {
    id: "fullbody-abc",
    name: "Full body A/B/C",
    level: "intermediario",
    place: "academia",
    frequency: "3x por semana",
    goal: "Força e massa com pouco tempo",
    description: "Três treinos de corpo todo, cada um com um movimento principal pesado. Cada músculo é treinado três vezes na semana.",
    plans: [
      plan("Full body A · Agachamento", WARMUP, [
        ["agachamento-livre", 4, 5, 8, 150, "Principal: suba a carga quando fizer 8 em todas."],
        ["supino-reto", 3, 6, 10, 120],
        ["remada-curvada", 3, 8, 10, 90],
        ["elevacao-lateral", 3, 12, 15, 60],
        ["rosca-direta", 2, 10, 12, 60],
        ["prancha", 3, 45, 45, 45, "45 segundos."],
      ]),
      plan("Full body B · Terra", WARMUP, [
        ["levantamento-terra", 3, 5, 6, 180, "Principal."],
        ["desenvolvimento", 3, 6, 10, 120],
        ["barra-fixa", 3, 6, 10, 90],
        ["afundo", 3, 10, 12, 90, "Por perna."],
        ["triceps-corda", 2, 10, 12, 60],
        ["elevacao-pernas", 3, 10, 15, 60],
      ]),
      plan("Full body C · Supino", WARMUP, [
        ["supino-inclinado-barra", 4, 6, 8, 120, "Principal."],
        ["leg-press", 3, 10, 12, 90],
        ["remada-baixa", 3, 10, 12, 90],
        ["mesa-flexora", 3, 10, 12, 60],
        ["face-pull", 3, 12, 15, 60],
        ["panturrilha", 3, 12, 15, 45],
      ]),
    ],
  },
  {
    id: "abc",
    name: "ABC clássico",
    level: "intermediario",
    place: "academia",
    frequency: "3 a 6x por semana",
    goal: "Hipertrofia",
    description: "Empurrar, puxar e pernas em três fichas. Faça uma vez cada (3x na semana) ou duas vezes cada (6x).",
    plans: [
      plan("Treino A · Peito, ombro e tríceps", WARMUP, [
        ["supino-reto", 4, 6, 10, 120],
        ["supino-inclinado-halteres", 3, 8, 12, 90],
        ["crucifixo-maquina", 3, 12, 15, 60],
        ["desenvolvimento-halteres", 3, 8, 12, 90],
        ["elevacao-lateral", 4, 12, 15, 60],
        ["triceps-corda", 3, 10, 12, 60],
        ["triceps-frances", 3, 10, 12, 60],
      ]),
      plan("Treino B · Costas e bíceps", WARMUP, [
        ["puxada-frontal", 4, 8, 12, 90],
        ["remada-curvada", 4, 6, 10, 120],
        ["remada-unilateral", 3, 10, 12, 90, "Por braço."],
        ["pulldown-braco-estendido", 3, 12, 15, 60],
        ["crucifixo-invertido", 3, 12, 15, 60],
        ["rosca-direta", 3, 8, 12, 60],
        ["rosca-martelo", 3, 10, 12, 60],
      ]),
      plan("Treino C · Pernas", "Aqueça bem joelhos e quadril antes do agachamento.", [
        ["agachamento-livre", 4, 6, 10, 150],
        ["leg-press", 4, 10, 12, 120],
        ["cadeira-extensora", 3, 12, 15, 60],
        ["stiff", 3, 8, 12, 90],
        ["mesa-flexora", 3, 10, 12, 60],
        ["elevacao-pelvica", 3, 8, 12, 90],
        ["panturrilha", 4, 12, 15, 45],
      ]),
    ],
  },
  {
    id: "ppl",
    name: "Push, pull, legs",
    level: "intermediario",
    place: "academia",
    frequency: "6x por semana",
    goal: "Hipertrofia com mais volume",
    description: "Seis fichas: cada grupo duas vezes na semana, uma com foco em carga (força) e outra em volume. Ordem: Push A, Pull A, Legs A, Push B, Pull B, Legs B.",
    plans: [
      plan("Push A · Força", WARMUP, [
        ["supino-reto", 4, 5, 8, 150],
        ["desenvolvimento", 3, 6, 8, 120],
        ["supino-inclinado-halteres", 3, 8, 10, 90],
        ["elevacao-lateral", 3, 12, 15, 60],
        ["triceps-testa", 3, 8, 10, 90],
      ]),
      plan("Pull A · Força", WARMUP, [
        ["levantamento-terra", 3, 5, 5, 180],
        ["barra-fixa", 4, 6, 8, 120, "Com peso se passar de 10."],
        ["remada-curvada", 3, 6, 8, 120],
        ["face-pull", 3, 12, 15, 60],
        ["rosca-direta", 3, 8, 10, 60],
      ]),
      plan("Legs A · Força", WARMUP, [
        ["agachamento-livre", 4, 5, 8, 180],
        ["terra-romeno", 3, 8, 10, 120],
        ["leg-press", 3, 10, 12, 120],
        ["mesa-flexora", 3, 10, 12, 60],
        ["panturrilha", 4, 10, 12, 45],
      ]),
      plan("Push B · Volume", WARMUP, [
        ["supino-inclinado-barra", 4, 8, 12, 90],
        ["supino-maquina", 3, 10, 12, 90],
        ["crossover-medio", 3, 12, 15, 60],
        ["desenvolvimento-maquina", 3, 10, 12, 90],
        ["elevacao-lateral-cabo", 3, 12, 15, 45],
        ["triceps-corda", 3, 12, 15, 60],
        ["paralelas", 2, 8, 12, 90],
      ]),
      plan("Pull B · Volume", WARMUP, [
        ["puxada-triangulo", 4, 10, 12, 90],
        ["remada-baixa", 3, 10, 12, 90],
        ["remada-unilateral", 3, 10, 12, 60, "Por braço."],
        ["crucifixo-invertido-maquina", 3, 12, 15, 60],
        ["encolhimento", 3, 12, 15, 60],
        ["rosca-inclinada", 3, 10, 12, 60],
        ["rosca-martelo", 3, 10, 12, 60],
      ]),
      plan("Legs B · Volume", WARMUP, [
        ["agachamento-hack", 4, 10, 12, 120],
        ["agachamento-bulgaro", 3, 10, 12, 90, "Por perna."],
        ["cadeira-extensora", 3, 12, 15, 60],
        ["cadeira-flexora", 3, 12, 15, 60],
        ["elevacao-pelvica", 3, 10, 12, 90],
        ["panturrilha-sentado", 4, 12, 15, 45],
      ]),
    ],
  },
  {
    id: "upper-lower",
    name: "Superior / inferior",
    level: "intermediario",
    place: "academia",
    frequency: "4x por semana",
    goal: "Força e hipertrofia equilibradas",
    description: "Quatro fichas alternando parte de cima e parte de baixo. Ordem sugerida: segunda, terça, quinta e sexta.",
    plans: [
      plan("Superior A", WARMUP, [
        ["supino-reto", 4, 6, 8, 120],
        ["remada-curvada", 4, 6, 8, 120],
        ["desenvolvimento-halteres", 3, 8, 10, 90],
        ["puxada-frontal", 3, 8, 10, 90],
        ["rosca-direta", 2, 10, 12, 60],
        ["triceps-polia", 2, 10, 12, 60],
      ]),
      plan("Inferior A", WARMUP, [
        ["agachamento-livre", 4, 6, 8, 150],
        ["terra-romeno", 3, 8, 10, 120],
        ["leg-press", 3, 10, 12, 90],
        ["mesa-flexora", 3, 10, 12, 60],
        ["panturrilha", 4, 10, 15, 45],
        ["abdominal-polia", 3, 12, 15, 60],
      ]),
      plan("Superior B", WARMUP, [
        ["supino-inclinado-halteres", 4, 8, 10, 90],
        ["barra-fixa", 4, 6, 10, 90],
        ["remada-baixa", 3, 10, 12, 90],
        ["elevacao-lateral", 3, 12, 15, 60],
        ["face-pull", 3, 12, 15, 60],
        ["rosca-martelo", 2, 10, 12, 60],
        ["triceps-frances", 2, 10, 12, 60],
      ]),
      plan("Inferior B", WARMUP, [
        ["levantamento-terra", 3, 5, 6, 180],
        ["agachamento-bulgaro", 3, 8, 10, 90, "Por perna."],
        ["cadeira-extensora", 3, 12, 15, 60],
        ["cadeira-flexora", 3, 12, 15, 60],
        ["elevacao-pelvica", 3, 8, 12, 90],
        ["panturrilha-sentado", 4, 12, 15, 45],
      ]),
    ],
  },
  {
    id: "abcd",
    name: "ABCD",
    level: "intermediario",
    place: "academia",
    frequency: "4x por semana",
    goal: "Hipertrofia com ombro e braço em destaque",
    description: "Quatro fichas com ombros num dia só e braços junto dos grupos grandes.",
    plans: [
      plan("Treino A · Peito e tríceps", WARMUP, [
        ["supino-reto", 4, 6, 10, 120],
        ["supino-inclinado-halteres", 3, 8, 12, 90],
        ["crossover-alto", 3, 12, 15, 60],
        ["paralelas-peito", 3, 8, 12, 90],
        ["triceps-testa", 3, 8, 12, 60],
        ["triceps-corda", 3, 12, 15, 60],
      ]),
      plan("Treino B · Costas e bíceps", WARMUP, [
        ["barra-fixa", 4, 6, 10, 120],
        ["remada-curvada", 4, 8, 10, 90],
        ["puxada-triangulo", 3, 10, 12, 90],
        ["remada-maquina", 3, 10, 12, 60],
        ["rosca-direta", 3, 8, 12, 60],
        ["rosca-concentrada", 3, 10, 12, 60],
      ]),
      plan("Treino C · Pernas", "Aqueça bem joelhos e quadril.", [
        ["agachamento-livre", 4, 6, 10, 150],
        ["leg-press", 4, 10, 12, 120],
        ["afundo", 3, 10, 12, 90, "Por perna."],
        ["stiff", 3, 8, 12, 90],
        ["mesa-flexora", 3, 10, 12, 60],
        ["panturrilha", 4, 12, 15, 45],
      ]),
      plan("Treino D · Ombros e abdômen", WARMUP, [
        ["desenvolvimento", 4, 6, 10, 120],
        ["elevacao-lateral", 4, 12, 15, 60],
        ["elevacao-frontal", 3, 10, 12, 60],
        ["crucifixo-invertido", 3, 12, 15, 60],
        ["encolhimento", 3, 10, 15, 60],
        ["elevacao-pernas", 3, 10, 15, 60],
        ["prancha", 3, 45, 60, 45, "Segundos."],
      ]),
    ],
  },
  {
    id: "abcde",
    name: "ABCDE (um grupo por dia)",
    level: "avancado",
    place: "academia",
    frequency: "5x por semana",
    goal: "Hipertrofia com muito volume por grupo",
    description: "Cada dia um grupo grande, com bastante volume. Para quem já treina há algum tempo e consegue ir cinco vezes por semana.",
    plans: [
      plan("Treino A · Peito", WARMUP, [
        ["supino-reto", 4, 6, 10, 120],
        ["supino-inclinado-barra", 4, 8, 10, 90],
        ["supino-declinado-halteres", 3, 10, 12, 90],
        ["crucifixo-inclinado", 3, 12, 15, 60],
        ["crossover-medio", 3, 12, 15, 60],
        ["flexao", 2, 12, 20, 60, "Até a falha."],
      ]),
      plan("Treino B · Costas", WARMUP, [
        ["levantamento-terra", 3, 5, 8, 180],
        ["barra-fixa", 4, 6, 10, 120],
        ["remada-curvada", 4, 8, 10, 90],
        ["remada-cavalinho", 3, 8, 12, 90],
        ["puxada-unilateral", 3, 10, 12, 60, "Por braço."],
        ["pulldown-braco-estendido", 3, 12, 15, 60],
      ]),
      plan("Treino C · Pernas", "Aqueça bem joelhos e quadril.", [
        ["agachamento-livre", 5, 5, 10, 180],
        ["agachamento-hack", 3, 8, 12, 120],
        ["leg-press", 3, 12, 15, 120],
        ["cadeira-extensora", 4, 12, 15, 60],
        ["terra-romeno", 3, 8, 10, 120],
        ["mesa-flexora", 4, 10, 12, 60],
        ["panturrilha", 5, 10, 15, 45],
      ]),
      plan("Treino D · Ombros", WARMUP, [
        ["desenvolvimento-halteres", 4, 6, 10, 120],
        ["desenvolvimento-arnold", 3, 8, 12, 90],
        ["elevacao-lateral", 4, 12, 15, 45],
        ["elevacao-lateral-cabo", 3, 12, 15, 45],
        ["crucifixo-invertido-maquina", 4, 12, 15, 60],
        ["face-pull", 3, 15, 15, 60],
        ["encolhimento-barra", 4, 10, 12, 60],
      ]),
      plan("Treino E · Braços e abdômen", WARMUP, [
        ["rosca-direta", 4, 8, 10, 60],
        ["supino-fechado", 4, 6, 10, 90],
        ["rosca-inclinada", 3, 10, 12, 60],
        ["triceps-frances-cabo", 3, 10, 12, 60],
        ["rosca-martelo", 3, 10, 12, 60],
        ["triceps-corda", 3, 12, 15, 60],
        ["rosca-punho", 3, 15, 20, 45],
        ["abdominal-polia", 3, 12, 15, 60],
        ["elevacao-pernas", 3, 10, 15, 60],
      ]),
    ],
  },
  {
    id: "forca-5x5",
    name: "Força 5×5",
    level: "intermediario",
    place: "academia",
    frequency: "3x por semana",
    goal: "Ficar mais forte nos básicos",
    description: "Duas fichas alternadas (A, B, A numa semana; B, A, B na outra). Cinco séries de cinco nos levantamentos principais: quando completar todas, suba 2,5 kg.",
    plans: [
      plan("5×5 · Treino A", "Descanse 3 a 5 min nas séries de 5×5.", [
        ["agachamento-livre", 5, 5, 5, 180],
        ["supino-reto", 5, 5, 5, 180],
        ["remada-curvada", 5, 5, 5, 150],
        ["paralelas", 3, 8, 12, 90, "Opcional."],
      ]),
      plan("5×5 · Treino B", "Descanse 3 a 5 min nas séries de 5×5.", [
        ["agachamento-livre", 5, 5, 5, 180],
        ["desenvolvimento", 5, 5, 5, 180],
        ["levantamento-terra", 1, 5, 5, 180, "Uma série só de 5, pesada."],
        ["barra-fixa", 3, 6, 10, 90, "Opcional."],
      ]),
    ],
  },
  {
    id: "gluteos-pernas",
    name: "Foco em glúteos e pernas",
    level: "intermediario",
    place: "academia",
    frequency: "2x por semana (com um superior)",
    goal: "Desenvolver glúteos e posterior",
    description: "Duas fichas de inferior com ênfase em glúteo, mais uma de superior para equilibrar.",
    plans: [
      plan("Inferior A · Glúteo e quadríceps", WARMUP, [
        ["elevacao-pelvica", 4, 8, 12, 120],
        ["agachamento-livre", 4, 6, 10, 150],
        ["agachamento-bulgaro", 3, 10, 12, 90, "Por perna."],
        ["cadeira-abdutora", 3, 15, 20, 60],
        ["cadeira-extensora", 3, 12, 15, 60],
        ["panturrilha", 3, 12, 15, 45],
      ]),
      plan("Inferior B · Glúteo e posterior", WARMUP, [
        ["terra-romeno", 4, 8, 10, 120],
        ["elevacao-pelvica-maquina", 3, 10, 12, 90],
        ["gluteo-cabo", 3, 12, 15, 60, "Por perna."],
        ["mesa-flexora", 3, 10, 12, 60],
        ["passada-lateral-elastico", 3, 15, 20, 45, "Passos por lado."],
        ["abducao-cabo", 3, 12, 15, 45],
      ]),
      plan("Superior · Completo", WARMUP, [
        ["puxada-frontal", 3, 10, 12, 90],
        ["supino-inclinado-halteres", 3, 10, 12, 90],
        ["remada-baixa", 3, 10, 12, 90],
        ["elevacao-lateral", 3, 12, 15, 60],
        ["triceps-corda", 2, 12, 15, 60],
        ["rosca-alternada", 2, 10, 12, 60],
        ["prancha", 3, 30, 45, 45, "Segundos."],
      ]),
    ],
  },
  {
    id: "casa-halteres",
    name: "Em casa com halteres",
    level: "iniciante",
    place: "casa",
    frequency: "3x por semana",
    goal: "Treinar sem academia",
    description: "Só um par de halteres (de preferência ajustáveis) e um banco ou cadeira firme. Alterne A e B.",
    plans: [
      plan("Casa A · Empurrar e pernas", "Aqueça com 2 min de polichinelo.", [
        ["agachamento-goblet", 4, 10, 15, 90],
        ["supino-reto-halteres", 4, 8, 12, 90, "No banco ou no chão."],
        ["afundo", 3, 10, 12, 60, "Por perna."],
        ["desenvolvimento-halteres", 3, 8, 12, 60],
        ["elevacao-lateral", 3, 12, 15, 45],
        ["triceps-frances", 3, 10, 12, 60],
        ["prancha", 3, 30, 45, 45, "Segundos."],
      ]),
      plan("Casa B · Puxar e posterior", "Aqueça com 2 min de polichinelo.", [
        ["stiff-halteres", 4, 10, 12, 90],
        ["remada-unilateral", 4, 10, 12, 60, "Por braço."],
        ["agachamento-bulgaro", 3, 8, 12, 60, "Por perna."],
        ["crucifixo-invertido", 3, 12, 15, 45],
        ["ponte-gluteo", 3, 12, 15, 45],
        ["rosca-alternada", 3, 10, 12, 45],
        ["rosca-martelo", 2, 10, 12, 45],
        ["abdominal-bicicleta", 3, 20, 20, 45],
      ]),
    ],
  },
  {
    id: "calistenia",
    name: "Peso do corpo (calistenia)",
    level: "iniciante",
    place: "casa",
    frequency: "3x por semana",
    goal: "Força e condicionamento sem equipamento",
    description: "Só o corpo, uma barra fixa e um banco. Quando ficar fácil, passe para a variação mais difícil (flexão declinada, pistol).",
    plans: [
      plan("Calistenia A · Empurrar e pernas", "Aqueça com 2 min de polichinelo.", [
        ["flexao", 4, 8, 15, 90],
        ["agachamento-peso-corpo", 4, 15, 20, 60],
        ["mergulho-banco", 3, 10, 15, 60],
        ["afundo", 3, 10, 12, 60, "Por perna, sem peso."],
        ["flexao-diamante", 3, 6, 12, 60],
        ["panturrilha-livre", 3, 15, 20, 45],
        ["prancha", 3, 30, 60, 45, "Segundos."],
      ]),
      plan("Calistenia B · Puxar e core", "Aqueça com 2 min de polichinelo.", [
        ["barra-fixa", 4, 4, 10, 120, "Use elástico se ainda não conseguir."],
        ["remada-invertida", 4, 8, 12, 90],
        ["barra-fixa-supinada", 3, 4, 10, 90],
        ["ponte-gluteo", 3, 15, 20, 45],
        ["elevacao-pernas", 3, 8, 12, 60],
        ["dead-bug", 3, 10, 12, 45, "Por lado."],
        ["mountain-climber", 3, 30, 30, 45, "Segundos."],
      ]),
    ],
  },
  {
    id: "core",
    name: "Abdômen e core",
    level: "iniciante",
    place: "academia",
    frequency: "2 a 3x por semana, no fim do treino",
    goal: "Core forte e estável",
    description: "Uma ficha curta para fazer depois de qualquer treino ou num dia leve.",
    plans: [
      plan("Core · Complementar", "Pode ser feito em circuito, com pouco descanso.", [
        ["abdominal-polia", 3, 12, 15, 45],
        ["elevacao-pernas", 3, 10, 15, 45],
        ["pallof-press", 3, 10, 12, 45, "Por lado."],
        ["prancha-lateral", 3, 30, 30, 30, "Segundos, por lado."],
        ["roda-abdominal", 3, 8, 12, 60],
        ["hiperextensao", 3, 12, 15, 45],
      ]),
    ],
  },
];

/** Os ids de exercício usados, para garantir que todos existem na biblioteca. */
export function missingTemplateExercises(): string[] {
  return [...new Set(TEMPLATES.flatMap((t) => t.plans.flatMap((p) => p.items.map((i) => i.exerciseId))))].filter((id) => !LIBRARY_BY_ID.has(id));
}
