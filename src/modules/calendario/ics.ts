/**
 * Ponte com o calendário do iPhone (e qualquer outro que fale iCalendar).
 *
 * O formato .ics é o que o app Calendário da Apple lê e escreve. Hoje a troca
 * é por arquivo: `buildICS` gera o arquivo que o iPhone importa e `parseICS`
 * lê o arquivo exportado de lá. Quando o NishiOS tiver servidor, o mesmo
 * `buildICS` responde em uma URL e o iPhone assina essa URL (webcal://),
 * passando a se atualizar sozinho. Nada nas telas precisa mudar.
 */
import { add, format, parseISO } from "date-fns";
import { toISO } from "@/lib/dates";
import { spanDays } from "./events";
import { SOURCE } from "./sources";
import type { CalEvent, CalItem, Repeat } from "./types";

const PRODID = "-//NishiOS//Calendario//PT-BR";
const UID_DOMAIN = "nishios";

const FREQ: Record<Exclude<Repeat, "none">, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

const compact = (iso: string) => iso.replaceAll("-", "");
const nextDay = (iso: string, days = 1) => compact(toISO(add(parseISO(iso), { days })));

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Linhas de no máximo 75 octetos, como a especificação pede. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function rrule(repeat: Exclude<Repeat, "none">, interval: number, until?: string): string {
  const parts = [`FREQ=${FREQ[repeat]}`];
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (until) parts.push(`UNTIL=${compact(until)}`);
  return `RRULE:${parts.join(";")}`;
}

function vevent(lines: (string | false | undefined)[], stamp: string): string[] {
  return ["BEGIN:VEVENT", `DTSTAMP:${stamp}`, ...lines.filter((l): l is string => !!l), "END:VEVENT"];
}

/**
 * Monta o arquivo .ics.
 * - `events`: eventos criados no NishiOS, exportados inteiros (hora, repetição, vários dias).
 * - `items`: o resto do sistema (prazos, vencimentos, aniversários...), como eventos de dia inteiro.
 */
export function buildICS(events: CalEvent[], items: CalItem[], now: Date = new Date()): string {
  const stamp = `${format(new Date(now.getTime() + now.getTimezoneOffset() * 60000), "yyyyMMdd'T'HHmmss")}Z`;
  const todayISO = toISO(now);
  const out: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:NishiOS"];

  for (const e of events) {
    const timed = !e.allDay && !!e.start;
    const time = (hhmm: string) => `${hhmm.replace(":", "")}00`;
    const lastDay = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    out.push(
      ...vevent(
        [
          `UID:ev-${e.id}@${UID_DOMAIN}`,
          `SUMMARY:${escapeText(e.title || "Sem título")}`,
          // Hora "flutuante": vale o relógio do aparelho, sem conversão de fuso.
          timed ? `DTSTART:${compact(e.date)}T${time(e.start)}` : `DTSTART;VALUE=DATE:${compact(e.date)}`,
          timed
            ? `DTEND:${compact(lastDay)}T${time(e.end && e.end > e.start ? e.end : e.start)}`
            : `DTEND;VALUE=DATE:${nextDay(lastDay)}`,
          e.repeat !== "none" && rrule(e.repeat, e.interval, e.until || undefined),
          e.location && `LOCATION:${escapeText(e.location)}`,
          e.notes && `DESCRIPTION:${escapeText(e.notes)}`,
        ],
        stamp,
      ),
    );
  }

  const seenSeries = new Set<string>();
  for (const item of items) {
    if (item.eventId || item.state === "done") continue;
    if (item.series) {
      if (seenSeries.has(item.series.id)) continue;
      seenSeries.add(item.series.id);
    }
    const overdue = item.state === "overdue";
    // O que está atrasado vai para hoje: no passado ninguém veria.
    const date = overdue ? todayISO : item.date;
    const label = SOURCE[item.source].label;
    const title = `${item.icon ? `${item.icon} ` : ""}${item.title}${overdue ? " (atrasado)" : ""}`;
    out.push(
      ...vevent(
        [
          `UID:${item.series ? item.series.id : item.key}@${UID_DOMAIN}`,
          `SUMMARY:${escapeText(title)}`,
          `DTSTART;VALUE=DATE:${compact(date)}`,
          `DTEND;VALUE=DATE:${nextDay(date)}`,
          item.series && rrule(item.series.repeat, item.series.interval, item.series.until),
          `DESCRIPTION:${escapeText([!item.series && item.note, `NishiOS, ${label}`].filter(Boolean).join("\n"))}`,
          `CATEGORIES:${escapeText(label)}`,
          "TRANSP:TRANSPARENT",
        ],
        stamp,
      ),
    );
  }

  out.push("END:VCALENDAR");
  return out.map(fold).join("\r\n") + "\r\n";
}

/* ---------- Leitura ---------- */

function unescapeText(text: string): string {
  return text.replace(/\\n/gi, "\n").replace(/\\([;,\\])/g, "$1");
}

interface Prop {
  params: Record<string, string>;
  value: string;
}

/** "DTSTART;TZID=America/Sao_Paulo:20261117T140000" em nome, parâmetros e valor. */
function parseLine(line: string): [string, Prop] | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const [name, ...rest] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of rest) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return [name.toUpperCase(), { params, value: line.slice(colon + 1) }];
}

function parseMoment(prop: Prop): { date: string; time: string; allDay: boolean } | null {
  const m = prop.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , utc] = m;
  if (h === undefined) return { date: `${y}-${mo}-${d}`, time: "", allDay: true };
  if (utc) {
    const local = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    return { date: toISO(local), time: format(local, "HH:mm"), allDay: false };
  }
  // Com TZID ou flutuante: fica a hora de parede, que é o que a pessoa vê no iPhone.
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}`, allDay: false };
}

const FREQ_BACK: Record<string, Repeat> = { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", YEARLY: "yearly" };

export interface ParseResult {
  events: CalEvent[];
  /** Eventos que o NishiOS mesmo exportou e por isso foram ignorados. */
  skippedOwn: number;
}

/** Lê um arquivo .ics exportado do Calendário da Apple (ou Google, Outlook...). */
export function parseICS(text: string): ParseResult {
  // Desfaz a dobra de linhas: continuação começa com espaço ou tab.
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: CalEvent[] = [];
  let skippedOwn = 0;
  let current: Record<string, Prop> | null = null;
  let nested = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (!current) continue;
    // Alarmes e afins dentro do evento não interessam.
    if (line.startsWith("BEGIN:")) nested++;
    else if (line.startsWith("END:") && line !== "END:VEVENT") nested--;
    else if (line === "END:VEVENT") {
      const event = toEvent(current);
      if (event === "own") skippedOwn++;
      else if (event) events.push(event);
      current = null;
      nested = 0;
    } else if (nested === 0) {
      const parsed = parseLine(line);
      if (parsed && !(parsed[0] in current)) current[parsed[0]] = parsed[1];
    }
  }
  return { events, skippedOwn };
}

function toEvent(props: Record<string, Prop>): CalEvent | "own" | null {
  const uid = props.UID?.value ?? "";
  if (uid.endsWith(`@${UID_DOMAIN}`)) return "own";
  const start = props.DTSTART && parseMoment(props.DTSTART);
  if (!start) return null;
  const end = props.DTEND && parseMoment(props.DTEND);

  let endDate = "";
  if (end && end.date > start.date) {
    // Em dia inteiro, o DTEND é o dia seguinte ao último.
    const last = start.allDay ? toISO(add(parseISO(end.date), { days: -1 })) : end.date;
    if (last > start.date) endDate = last;
  }

  let repeat: Repeat = "none";
  let interval = 1;
  let until = "";
  if (props.RRULE) {
    const rule = Object.fromEntries(props.RRULE.value.split(";").map((p) => p.split("=") as [string, string]));
    repeat = FREQ_BACK[rule.FREQ] ?? "none";
    interval = Math.max(1, Number(rule.INTERVAL) || 1);
    const u = rule.UNTIL?.match(/^(\d{4})(\d{2})(\d{2})/);
    if (u) until = `${u[1]}-${u[2]}-${u[3]}`;
    else if (rule.COUNT && repeat !== "none") {
      const unit = { daily: "days", weekly: "weeks", monthly: "months", yearly: "years" }[repeat];
      until = toISO(add(parseISO(start.date), { [unit]: (Number(rule.COUNT) - 1) * interval }));
    }
  }

  const event: CalEvent = {
    id: `iphone-${uid || crypto.randomUUID()}`,
    title: unescapeText(props.SUMMARY?.value ?? "") || "Sem título",
    date: start.date,
    endDate,
    allDay: start.allDay,
    start: start.time,
    end: end && !end.allDay ? end.time : "",
    location: unescapeText(props.LOCATION?.value ?? ""),
    notes: unescapeText(props.DESCRIPTION?.value ?? ""),
    repeat,
    interval,
    until,
    origin: "iphone",
  };
  // Evento sem fim e com mais de 60 dias de duração costuma ser lixo de exportação.
  return spanDays(event) > 60 ? { ...event, endDate: "" } : event;
}

/**
 * Entrega o arquivo: no iPhone abre a folha de compartilhamento (de onde dá
 * para mandar ao Calendário); no computador, baixa.
 */
export async function deliverICS(content: string, filename = "nishios.ics"): Promise<"shared" | "downloaded"> {
  const file = new File([content], filename, { type: "text/calendar" });
  const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "NishiOS" });
      return "shared";
    } catch (e) {
      // Cancelou o compartilhamento: não insiste com download.
      if ((e as DOMException).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
