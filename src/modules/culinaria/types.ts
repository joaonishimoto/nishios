/** Em teste: ainda acertando. Aprovada: já sai do jeito que você quer. Não deu certo: fica para lembrar o porquê. */
export type RecipeStatus = "testing" | "approved" | "discarded";

/** Cada vez que você fez a receita: o que fez de diferente, como ficou e o que mudar na próxima. */
export interface Attempt {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** 0 a 5; 0 = sem nota. */
  rating: number;
  /** Como fez desta vez: quantidades, tempo, o que mudou. */
  how: string;
  /** Como ficou. */
  result: string;
  /** O que mudar na próxima vez. */
  next: string;
}

/** Um ingrediente da lista. Quantidade é texto para aceitar "1/2", "1,5" ou ficar vazia ("a gosto"). */
export interface Ingredient {
  id: string;
  amount: string;
  unit: string;
  name: string;
}

/** Unidades sugeridas no campo; qualquer outra também vale. */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "xícara",
  "colher de sopa",
  "colher de chá",
  "unidade",
  "dente",
  "fatia",
  "maço",
  "pitada",
  "lata",
  "pacote",
  "a gosto",
];

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  category: string;
  /** Receita de onde esta nasceu; vazio = receita base. */
  parentId: string;
  /** Só nas variações: o que muda em relação à receita de origem. */
  change: string;
  status: RecipeStatus;
  ingredients: Ingredient[];
  /** Um passo por linha. */
  steps: string;
  /** O que você já aprendeu fazendo: pontos de atenção, truques. */
  lessons: string;
  attempts: Attempt[];
  createdAt: string;
}

export const CATEGORIES = [
  "Acompanhamentos",
  "Bebidas",
  "Bolos e doces",
  "Café da manhã",
  "Carnes",
  "Massas",
  "Molhos e saladas",
  "Pães",
  "Peixes e frutos do mar",
  "Petiscos",
  "Sopas",
  "Vegetariano",
  "Outros",
];

export const RECIPE_ICONS = ["🍳", "🥗", "🍅", "🍝", "🍚", "🥩", "🍗", "🐟", "🍤", "🍞", "🍰", "🍪", "🍲", "🥘", "🌮", "🍕", "🥞", "☕", "🍹", "🍌", "🥭", "🧄", "🌶️", "🍄"];
