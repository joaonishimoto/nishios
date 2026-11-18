import { seedPets } from "@/modules/pets/seed";
import { markDeleted, markDirty } from "./sync";

/**
 * Backup de tudo o que o app guarda. Os dados vivem no localStorage deste
 * navegador, em chaves que começam com "nishios:"; o backup é um JSON com todas.
 */
const PREFIX = "nishios:";
/** Quando foi o último download; não entra no arquivo. */
const LAST_KEY = "nishios:ultimo-backup";

export interface Backup {
  app: "nishios";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Listas que o resumo conta, na ordem em que aparecem na tela. */
export const COUNTED: { key: string; one: string; many: string }[] = [
  { key: "nishios:tarefas:v1", one: "tarefa", many: "tarefas" },
  { key: "nishios:rotina:habitos:v1", one: "hábito", many: "hábitos" },
  { key: "nishios:rotina:metas:v1", one: "meta", many: "metas" },
  { key: "nishios:compromissos:v1", one: "compromisso", many: "compromissos" },
  { key: "nishios:calendario:v1", one: "evento", many: "eventos" },
  { key: "nishios:pessoas:v1", one: "pessoa", many: "pessoas" },
  { key: "nishios:treinos:sessoes:v1", one: "treino", many: "treinos" },
  { key: "nishios:corpo:v1", one: "medição", many: "medições" },
  { key: "nishios:bens:v1", one: "bem", many: "bens" },
  { key: "nishios:desejos:v1", one: "desejo", many: "desejos" },
  { key: "nishios:pets:v1", one: "pet", many: "pets" },
  { key: "nishios:skills:v1", one: "skill", many: "skills" },
];

function keys(): string[] {
  const found: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX) && k !== LAST_KEY) found.push(k);
  }
  return found.sort();
}

export function readBackup(): Backup {
  const data: Record<string, unknown> = {};
  for (const k of keys()) {
    const raw = localStorage.getItem(k) ?? "";
    try {
      data[k] = JSON.parse(raw);
    } catch {
      // O tema é texto puro, não JSON.
      data[k] = raw;
    }
  }
  return { app: "nishios", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Lê um arquivo de backup; devolve uma frase de erro quando não é um. */
export function parseBackup(text: string): Backup | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "Este arquivo não é um backup do NishiOS.";
  }
  const b = parsed as Partial<Backup> | null;
  if (!b || b.app !== "nishios" || typeof b.data !== "object" || b.data === null) {
    return "Este arquivo não é um backup do NishiOS.";
  }
  const names = Object.keys(b.data);
  if (names.length === 0 || names.some((k) => !k.startsWith(PREFIX))) {
    return "Este arquivo não tem dados do NishiOS dentro.";
  }
  return { app: "nishios", version: 1, exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : "", data: b.data as Record<string, unknown> };
}

/** Quantos itens de cada tipo um backup tem, só os que não estão vazios. */
export function summarize(backup: Backup): { label: string; count: number }[] {
  return COUNTED.flatMap(({ key, one, many }) => {
    const list = backup.data[key];
    if (!Array.isArray(list) || list.length === 0) return [];
    return [{ label: list.length === 1 ? one : many, count: list.length }];
  });
}

/** Troca tudo o que está salvo pelo conteúdo do backup. Recarregue a página em seguida. */
export function applyBackup(backup: Backup) {
  const before = keys();
  for (const k of before) localStorage.removeItem(k);
  for (const [k, value] of Object.entries(backup.data)) {
    localStorage.setItem(k, typeof value === "string" ? value : JSON.stringify(value));
  }
  // Com login, o backup restaurado também vale para a nuvem e os outros aparelhos.
  markDeleted(before.filter((k) => !(k in backup.data)));
  markDirty(Object.keys(backup.data));
}

/** Apaga o que está salvo; ao recarregar, o app volta aos dados de exemplo. */
export function clearToExample() {
  const gone = keys().filter((k) => k !== "nishios:tema");
  for (const k of gone) localStorage.removeItem(k);
  markDeleted(gone);
}

const PETS_KEY = "nishios:pets:v1";
const CASA_PREFIX = "nishios:casa:";
/** Maki e Gojo moram na Casa em 3D: continuam em Pets quando se começa do zero. */
const HOUSE_PETS = new Set(["pet-maki", "pet-gojo"]);

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/**
 * Esvazia as listas para começar a usar com dados seus. Ficam a casa (sem os vínculos com
 * bens, que são apagados), o tema, as modalidades de treino e os pets da casa, só com a
 * ficha: vacinas, consultas e pesos saem.
 */
export function clearToEmpty() {
  const saved = readJson(PETS_KEY);
  const pets: { id?: string }[] = Array.isArray(saved) ? saved : seedPets();
  const housePets = pets.filter((p) => HOUSE_PETS.has(p?.id ?? "")).map((p) => ({ ...p, cares: [], health: [], weights: [] }));

  for (const { key } of COUNTED) localStorage.setItem(key, "[]");
  localStorage.setItem(PETS_KEY, JSON.stringify(housePets));

  const touched = COUNTED.map((c) => c.key);
  for (const k of keys()) {
    if (!k.startsWith(CASA_PREFIX)) continue;
    const home = readJson(k) as { pieces?: { assetId?: string }[] } | null;
    if (!home || !Array.isArray(home.pieces)) continue;
    home.pieces = home.pieces.map(({ assetId: _gone, ...piece }) => piece);
    localStorage.setItem(k, JSON.stringify(home));
    touched.push(k);
  }
  markDirty(touched);
}

export function downloadBackup(): Backup {
  const backup = readBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nishios-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    localStorage.setItem(LAST_KEY, backup.exportedAt);
  } catch {
    /* sem armazenamento */
  }
  return backup;
}

export function lastBackupAt(): string {
  try {
    return localStorage.getItem(LAST_KEY) ?? "";
  } catch {
    return "";
  }
}
