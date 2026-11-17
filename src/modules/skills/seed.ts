import { sub, type Duration } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Skill } from "./types";

export function seedSkills(): Skill[] {
  const now = today();
  const ago = (d: Duration) => toISO(sub(now, d));
  let n = 0;
  const id = () => `seed-${++n}`;
  const skill = (s: Omit<Skill, "id" | "createdAt"> & { created: Duration }): Skill => {
    const { created, ...rest } = s;
    return { ...rest, id: id(), createdAt: `${ago(created)}T12:00:00.000Z` };
  };
  const res = (title: string, done = false, url = "") => ({ id: id(), title, url, done });
  const log = (d: Duration, text: string) => ({ id: id(), date: ago(d), text });

  return [
    skill({
      name: "React e TypeScript",
      type: "hard",
      category: "Tecnologia",
      status: "learned",
      level: 4,
      notes: "Base de tudo que construo. Falta aprofundar em performance e testes.",
      resources: [res("Documentação nova do React", true, "https://react.dev"), res("Total TypeScript", true)],
      log: [log({ months: 2 }, "Migrei o NishiStack para React 19 sem dor.")],
      created: { years: 2 },
    }),
    skill({
      name: "Copywriting para anúncios",
      type: "hard",
      category: "Negócios",
      status: "learned",
      level: 3,
      notes: "",
      resources: [res("Livro: Copywriting, de Paulo Maccedo", true)],
      log: [],
      created: { years: 1 },
    }),
    skill({
      name: "Inglês para reuniões",
      type: "hard",
      category: "Idiomas",
      status: "learning",
      level: 3,
      notes: "Entendo bem, travo na hora de falar. Meta: conduzir uma reunião inteira sem tradutor.",
      resources: [
        res("Aulas de conversação, 2 vezes por semana"),
        res("Série sem legenda, 3 episódios por semana", true),
        res("Podcast All Ears English", false, "https://www.allearsenglish.com"),
      ],
      log: [
        log({ days: 3 }, "Conduzi 20 minutos de call sem travar. Vocabulário de negócios ainda fraco."),
        log({ days: 17 }, "Primeira aula de conversação. Nível avaliado: B2."),
      ],
      created: { months: 3 },
    }),
    skill({
      name: "Falar em público",
      type: "soft",
      category: "Comunicação",
      status: "learning",
      level: 2,
      notes: "Gravar um vídeo por semana para perder a vergonha da câmera.",
      resources: [res("Livro: TED Talks, de Chris Anderson", true), res("Gravar 10 Reels falando para a câmera")],
      log: [log({ days: 8 }, "Gravei o terceiro Reel. Menos vícios de linguagem que no primeiro.")],
      created: { months: 2 },
    }),
    skill({
      name: "Banco de dados e SQL",
      type: "hard",
      category: "Tecnologia",
      status: "learning",
      level: 2,
      notes: "",
      resources: [res("Curso de PostgreSQL"), res("Modelar o banco do NishiOS", false)],
      log: [],
      created: { months: 1 },
    }),
    skill({
      name: "Negociação",
      type: "soft",
      category: "Negócios",
      status: "want",
      level: 1,
      notes: "Fechar contratos maiores sem dar desconto no primeiro pedido.",
      resources: [res("Livro: Negocie como se sua vida dependesse disso")],
      log: [],
      created: { days: 20 },
    }),
    skill({
      name: "Delegar e liderar",
      type: "soft",
      category: "Liderança",
      status: "want",
      level: 0,
      notes: "",
      resources: [],
      log: [],
      created: { days: 12 },
    }),
    skill({
      name: "Edição de vídeo",
      type: "hard",
      category: "Criatividade",
      status: "want",
      level: 1,
      notes: "",
      resources: [res("Curso de DaVinci Resolve")],
      log: [],
      created: { days: 5 },
    }),
    skill({
      name: "Organização e foco",
      type: "soft",
      category: "Pessoal",
      status: "learned",
      level: 4,
      notes: "",
      resources: [],
      log: [],
      created: { years: 1, months: 6 },
    }),
  ];
}
