import { sub, type Duration } from "date-fns";
import { toISO, today } from "./logic";
import type { Commitment } from "./types";

/**
 * Dados de exemplo. As datas são relativas a hoje para a demonstração sempre
 * mostrar um pouco de cada situação (atrasado, próximo, em dia, sem registro).
 */
export function seedCommitments(): Commitment[] {
  const now = today();
  const ago = (d: Duration, ...more: Duration[]) =>
    [d, ...more].map((x) => toISO(sub(now, x)));

  return [
    {
      id: "corte-cabelo",
      name: "Cortar o cabelo",
      icon: "💈",
      category: "Cuidados pessoais",
      intervalValue: 30,
      intervalUnit: "days",
      warnDays: 5,
      notes: "Barbearia do Léo. Máquina 2 nas laterais, tesoura em cima.",
      history: ago({ days: 34 }, { days: 66 }, { days: 95 }, { days: 127 }),
    },
    {
      id: "escova-dentes",
      name: "Trocar a escova de dentes",
      icon: "🪥",
      category: "Cuidados pessoais",
      intervalValue: 3,
      intervalUnit: "months",
      warnDays: 7,
      notes: "",
      history: ago({ months: 3, days: 9 }, { months: 6, days: 12 }),
    },
    {
      id: "dentista",
      name: "Consulta no dentista",
      icon: "🦷",
      category: "Saúde",
      intervalValue: 6,
      intervalUnit: "months",
      warnDays: 21,
      notes: "Dra. Camila. Pedir limpeza e avaliar o siso.",
      history: ago({ months: 5, days: 19 }, { months: 12, days: 2 }),
    },
    {
      id: "revisao-carro",
      name: "Revisão do carro",
      icon: "🚗",
      category: "Carro",
      intervalValue: 1,
      intervalUnit: "years",
      warnDays: 30,
      notes: "Ou a cada 10.000 km, o que vier primeiro.",
      assetId: "a11",
      history: ago({ months: 11, days: 12 }),
    },
    {
      id: "oftalmologista",
      name: "Oftalmologista",
      icon: "👓",
      category: "Saúde",
      intervalValue: 1,
      intervalUnit: "years",
      warnDays: 30,
      notes: "",
      history: [],
    },
    {
      id: "exame-sangue",
      name: "Exame de sangue de rotina",
      icon: "🩸",
      category: "Saúde",
      intervalValue: 1,
      intervalUnit: "years",
      warnDays: 30,
      notes: "Hemograma, colesterol, glicemia e vitamina D. Jejum de 8 horas.",
      history: ago({ months: 4, days: 3 }, { years: 1, months: 5 }),
    },
    {
      id: "filtro-purificador",
      name: "Trocar o filtro do purificador",
      icon: "🚰",
      category: "Casa",
      intervalValue: 6,
      intervalUnit: "months",
      warnDays: 14,
      notes: "",
      history: ago({ months: 2, days: 6 }, { months: 8, days: 1 }),
    },
    {
      id: "ar-condicionado",
      name: "Limpeza do ar-condicionado",
      icon: "❄️",
      category: "Casa",
      intervalValue: 6,
      intervalUnit: "months",
      warnDays: 14,
      notes: "",
      history: ago({ months: 1, days: 2 }),
    },
    {
      id: "dermatologista",
      name: "Dermatologista",
      icon: "🩺",
      category: "Saúde",
      intervalValue: 1,
      intervalUnit: "years",
      warnDays: 30,
      notes: "Mapear as pintas das costas.",
      history: ago({ months: 7 }),
    },
  ];
}
