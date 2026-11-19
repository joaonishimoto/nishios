import { sub, type Duration } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Attempt, Recipe } from "./types";

/** Exemplo: uma família de vinagretes, para mostrar as variações em árvore, e duas receitas soltas. */
export function seedRecipes(): Recipe[] {
  const now = today();
  const ago = (d: Duration) => toISO(sub(now, d));
  let n = 0;
  const id = () => `seed-receita-${++n}`;
  const attempt = (d: Duration, rating: number, how: string, result: string, next = ""): Attempt => ({
    id: id(),
    date: ago(d),
    rating,
    how,
    result,
    next,
  });
  const recipe = (r: Omit<Recipe, "createdAt" | "id"> & { id: string; created: Duration }): Recipe => {
    const { created, ...rest } = r;
    return { ...rest, createdAt: `${ago(created)}T12:00:00.000Z` };
  };

  return [
    recipe({
      id: "seed-vinagrete",
      name: "Vinagrete padrão",
      icon: "🍅",
      category: "Molhos e saladas",
      parentId: "",
      change: "",
      status: "approved",
      ingredients: "3 tomates sem semente\n1 cebola roxa\n1/2 pimentão verde\nCheiro-verde a gosto\n3 colheres de azeite\n2 colheres de vinagre de vinho\nSal e pimenta",
      steps: "Picar tudo em cubos pequenos, do mesmo tamanho\nDeixar a cebola 5 minutos no vinagre antes de juntar\nMisturar, temperar e descansar 15 minutos na geladeira",
      lessons: "Cebola roxa no vinagre antes tira o ardido.\nSal só na hora de servir, senão o tomate solta água demais.",
      attempts: [
        attempt({ days: 4 }, 5, "Cebola 5 min no vinagre e sal só no fim.", "Firme, sem água no fundo. Ficou perfeito com o churrasco."),
        attempt({ weeks: 3 }, 4, "Sal junto com tudo, descansou 30 min.", "Bom, mas soltou muita água.", "Salgar só na hora de servir."),
        attempt({ months: 2 }, 3, "Receita da internet, cebola branca.", "Cebola ardida demais.", "Testar cebola roxa."),
      ],
      created: { months: 2 },
    }),
    recipe({
      id: "seed-vinagrete-banana",
      name: "Vinagrete com banana",
      icon: "🍌",
      category: "Molhos e saladas",
      parentId: "seed-vinagrete",
      change: "Troca o pimentão por banana-da-terra em cubos, levemente dourada na manteiga.",
      status: "testing",
      ingredients: "3 tomates sem semente\n1 cebola roxa\n1 banana-da-terra madura\nCoentro\n3 colheres de azeite\n2 colheres de vinagre de maçã\nSal e pimenta",
      steps: "Dourar a banana em cubos na manteiga e deixar esfriar\nPicar o resto como no padrão\nJuntar a banana só no fim, para não desmanchar",
      lessons: "",
      attempts: [
        attempt({ days: 10 }, 3, "Banana crua em cubos.", "Doce demais e ficou mole.", "Dourar a banana antes e usar vinagre de maçã."),
      ],
      created: { weeks: 2 },
    }),
    recipe({
      id: "seed-vinagrete-banana-pimenta",
      name: "Vinagrete com banana e pimenta",
      icon: "🌶️",
      category: "Molhos e saladas",
      parentId: "seed-vinagrete-banana",
      change: "Mais uma pimenta dedo-de-moça sem semente, para equilibrar o doce da banana.",
      status: "testing",
      ingredients: "",
      steps: "",
      lessons: "",
      attempts: [],
      created: { days: 3 },
    }),
    recipe({
      id: "seed-vinagrete-manga",
      name: "Vinagrete com manga",
      icon: "🥭",
      category: "Molhos e saladas",
      parentId: "seed-vinagrete",
      change: "Manga no lugar do pimentão.",
      status: "discarded",
      ingredients: "",
      steps: "",
      lessons: "A manga briga com o vinagre de vinho. Se tentar de novo, usar limão.",
      attempts: [attempt({ weeks: 5 }, 2, "Manga Palmer em cubos no lugar do pimentão.", "Ácido e doce ao mesmo tempo, não combinou.")],
      created: { weeks: 6 },
    }),
    recipe({
      id: "seed-arroz",
      name: "Arroz soltinho",
      icon: "🍚",
      category: "Acompanhamentos",
      parentId: "",
      change: "",
      status: "approved",
      ingredients: "1 xícara de arroz agulhinha\n2 xícaras de água fervendo\n1/2 cebola\n1 dente de alho\nÓleo e sal",
      steps: "Refogar cebola e alho\nFritar o arroz até ficar opaco\nJuntar a água fervendo e o sal\nFogo baixo, tampado, até secar\nDescansar 5 minutos tampado",
      lessons: "Água fervendo é o que deixa soltinho.",
      attempts: [attempt({ weeks: 1 }, 5, "Do jeito da receita.", "Soltinho.")],
      created: { months: 4 },
    }),
    recipe({
      id: "seed-risoto",
      name: "Risoto de cogumelos",
      icon: "🍄",
      category: "Vegetariano",
      parentId: "",
      change: "",
      status: "testing",
      ingredients: "1 xícara de arroz arbóreo\n200 g de cogumelos paris\n1 litro de caldo de legumes quente\n1/2 taça de vinho branco\n1/2 cebola\n2 colheres de manteiga\nParmesão ralado",
      steps: "Dourar os cogumelos e reservar\nRefogar a cebola, tostar o arroz\nVinho, deixar evaporar\nCaldo concha a concha, mexendo\nDesligar com manteiga e parmesão",
      lessons: "",
      attempts: [
        attempt({ days: 18 }, 3, "Caldo frio, de tablete.", "Demorou e o arroz cozinhou desigual.", "Caldo quente o tempo todo."),
        attempt({ days: 6 }, 4, "Caldo caseiro quente, 18 min mexendo.", "Bem melhor. Ainda um pouco salgado.", "Menos sal, o parmesão já salga."),
      ],
      created: { months: 1 },
    }),
  ];
}
