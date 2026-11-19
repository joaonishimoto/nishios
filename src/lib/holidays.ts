import { addDays, format, getDaysInMonth } from "date-fns";

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const FIXED = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];
const cache = new Map<number, Set<string>>();

/**
 * Dias sem expediente bancário no Brasil, em yyyy-MM-dd: os feriados nacionais,
 * a Sexta-feira Santa, o Carnaval (segunda e terça) e Corpus Christi.
 * Feriados estaduais e municipais ficam de fora.
 */
export function holidays(year: number): Set<string> {
  let set = cache.get(year);
  if (!set) {
    const e = easter(year);
    const mobile = [-48, -47, -2, 60].map((d) => format(addDays(e, d), "yyyy-MM-dd"));
    set = new Set([...FIXED.map((d) => `${year}-${d}`), ...mobile]);
    cache.set(year, set);
  }
  return set;
}

/** Segunda a sexta, fora dos feriados. */
export function isBusinessDay(date: Date): boolean {
  const wd = date.getDay();
  return wd !== 0 && wd !== 6 && !holidays(date.getFullYear()).has(format(date, "yyyy-MM-dd"));
}

/**
 * O n-ésimo dia útil de um mês (yyyy-MM), em yyyy-MM-dd. Se o mês tiver menos
 * dias úteis que isso, devolve o último.
 */
export function nthBusinessDay(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = getDaysInMonth(new Date(y, m - 1, 1));
  let count = 0;
  let last = `${month}-01`;
  for (let d = 1; d <= total; d++) {
    const date = new Date(y, m - 1, d);
    if (!isBusinessDay(date)) continue;
    count++;
    last = format(date, "yyyy-MM-dd");
    if (count === n) return last;
  }
  return last;
}
