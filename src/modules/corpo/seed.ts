import { sub } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Entry, Profile } from "./types";

export const seedProfile = (): Profile => ({ height: 178 });

/** Cinco meses perdendo peso devagar, com as medidas completas uma vez por mês. */
export function seedEntries(): Entry[] {
  const now = today();
  const day = (ago: number) => toISO(sub(now, { days: ago }));
  let n = 0;
  const entry = (ago: number, weight: number, rest: Partial<Entry> = {}): Entry => ({
    id: `corpo-${++n}`,
    date: day(ago),
    weight,
    bodyFat: 0,
    measures: {},
    notes: "",
    ...rest,
  });

  return [
    entry(150, 84.2, {
      bodyFat: 22.5,
      measures: { pescoco: 39.5, ombros: 118, peito: 103, braco: 36, antebraco: 29.5, cintura: 92, abdomen: 96, quadril: 102, coxa: 59, panturrilha: 38.5 },
      notes: "Começo do acompanhamento.",
    }),
    entry(136, 83.9),
    entry(122, 83.4, {
      bodyFat: 21.8,
      measures: { pescoco: 39.5, ombros: 118.5, peito: 103, braco: 36.5, antebraco: 29.5, cintura: 91, abdomen: 95, quadril: 101.5, coxa: 59, panturrilha: 38.5 },
    }),
    entry(108, 83.6),
    entry(94, 82.8, {
      bodyFat: 20.9,
      measures: { pescoco: 39, ombros: 119, peito: 103.5, braco: 37, antebraco: 30, cintura: 89.5, abdomen: 93, quadril: 101, coxa: 59.5, panturrilha: 38.5 },
    }),
    entry(80, 82.3),
    entry(66, 82.5),
    entry(52, 81.7, {
      bodyFat: 19.8,
      measures: { pescoco: 39, ombros: 119.5, peito: 104, braco: 37.5, antebraco: 30, cintura: 88, abdomen: 91.5, quadril: 100.5, coxa: 60, panturrilha: 39 },
    }),
    entry(38, 81.4),
    entry(24, 81.0, {
      bodyFat: 19.1,
      measures: { pescoco: 38.5, ombros: 120, peito: 104.5, braco: 38, antebraco: 30.5, cintura: 87, abdomen: 90, quadril: 100, coxa: 60.5, panturrilha: 39 },
    }),
    entry(10, 80.6),
    entry(3, 80.4, { measures: { cintura: 86.5, braco: 38 } }),
  ];
}
