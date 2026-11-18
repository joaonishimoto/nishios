import { supabase } from "./supabase";

/**
 * Sincroniza o localStorage com a tabela app_state do Supabase, chave por chave.
 *
 * O navegador continua sendo onde o app lê e grava (os stores não mudam). Esta camada:
 * - ao abrir, envia o que mudou aqui e ainda não subiu, e depois traz o que mudou na nuvem;
 * - a cada gravação, sobe a chave alguns instantes depois;
 * - ao voltar para a aba (ou a cada minuto), traz o que outro aparelho gravou.
 *
 * Conflito: vale a última gravação de cada chave. Uma alteração local que ainda não subiu
 * nunca é sobrescrita pela nuvem.
 */
const PREFIX = "nishios:";
/** Fica só neste aparelho. */
const DEVICE_ONLY = new Set(["nishios:tema", "nishios:ultimo-backup"]);
/** Estado da sincronização; fora do prefixo, então não entra no backup nem sobe. */
const META_KEY = "nishios-sync:estado";
/** O que este navegador tinha antes de receber os dados da nuvem pela primeira vez. */
export const LOCAL_COPY_KEY = "nishios-sync:copia-local";

interface Meta {
  /** Dono dos dados deste navegador; outro login recomeça do zero. */
  userId: string;
  /** updated_at da nuvem que este navegador já conhece, por chave. */
  known: Record<string, string>;
  /** Chaves alteradas aqui que ainda não subiram. */
  dirty: string[];
  /** Chaves apagadas aqui (recomeçar, restaurar backup) que precisam sumir da nuvem. */
  deleted: string[];
  lastSyncAt: string;
}

export type SyncStatus = "off" | "syncing" | "synced" | "offline" | "error";

let userId = "";
let status: SyncStatus = "off";
let lastError = "";
const listeners = new Set<() => void>();
const timers = new Map<string, number>();
/** Quantas vezes cada chave mudou nesta visita: diz se ela mudou de novo durante um envio. */
const edits = new Map<string, number>();
let pullInFlight: Promise<boolean> | null = null;

export const syncable = (key: string) => key.startsWith(PREFIX) && !DEVICE_ONLY.has(key);

function emptyMeta(): Meta {
  return { userId, known: {}, dirty: [], deleted: [], lastSyncAt: "" };
}

function readMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? ({ ...emptyMeta(), ...JSON.parse(raw) } as Meta) : null;
  } catch {
    return null;
  }
}

function meta(): Meta {
  return readMeta() ?? emptyMeta();
}

function writeMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* sem armazenamento */
  }
}

function setStatus(next: SyncStatus, error = "") {
  status = next;
  lastError = error;
  listeners.forEach((fn) => fn());
}

export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function syncSnapshot() {
  return { status, error: lastError, lastSyncAt: readMeta()?.lastSyncAt ?? "" };
}

function localKeys(): string[] {
  const found: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && syncable(k)) found.push(k);
  }
  return found;
}

function readLocal(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Tudo o que sincroniza é JSON (inclusive textos, que ficam entre aspas). */
function writeLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Marca chaves como alteradas aqui. Funciona mesmo antes do login: sobem quando ele acontecer. */
export function markDirty(keys: string[]) {
  if (!supabase) return;
  const m = meta();
  const set = new Set(m.dirty);
  const del = new Set(m.deleted);
  for (const k of keys) {
    if (!syncable(k)) continue;
    set.add(k);
    del.delete(k);
  }
  writeMeta({ ...m, dirty: [...set], deleted: [...del] });
}

/** Marca chaves como apagadas aqui, para apagar na nuvem também. */
export function markDeleted(keys: string[]) {
  if (!supabase) return;
  const m = meta();
  const dirty = new Set(m.dirty);
  const del = new Set(m.deleted);
  for (const k of keys) {
    if (!syncable(k)) continue;
    dirty.delete(k);
    del.add(k);
  }
  writeMeta({ ...m, dirty: [...dirty], deleted: [...del] });
}

/** Chamado a cada gravação no localStorage: marca a chave e sobe em seguida. */
export function queuePush(key: string) {
  if (!syncable(key) || !supabase) return;
  markDirty([key]);
  edits.set(key, (edits.get(key) ?? 0) + 1);
  if (!userId) return;
  window.clearTimeout(timers.get(key));
  timers.set(
    key,
    window.setTimeout(() => {
      timers.delete(key);
      void pushPending();
    }, 800),
  );
}

let pushing: Promise<void> | null = null;

/** Sobe tudo o que está marcado. Só uma rodada por vez; a seguinte pega o que sobrar. */
export function pushPending(): Promise<void> {
  if (!supabase || !userId) return Promise.resolve();
  if (pushing) return pushing.then(() => pushPending());
  pushing = (async () => {
    const m = meta();
    if (m.dirty.length === 0 && m.deleted.length === 0) return;
    const sentEdits = new Map(m.dirty.map((k) => [k, edits.get(k) ?? 0]));
    setStatus("syncing");
    try {
      if (m.deleted.length) {
        const { error } = await supabase.from("app_state").delete().eq("user_id", userId).in("key", m.deleted);
        if (error) throw error;
      }
      const rows = m.dirty.flatMap((key) => {
        const value = readLocal(key);
        return value === undefined ? [] : [{ user_id: userId, key, value }];
      });
      const known = { ...m.known };
      for (const k of m.deleted) delete known[k];
      if (rows.length) {
        const { data, error } = await supabase
          .from("app_state")
          .upsert(rows, { onConflict: "user_id,key" })
          .select("key, updated_at");
        if (error) throw error;
        for (const r of data ?? []) known[r.key as string] = r.updated_at as string;
      }
      // O que foi marcado durante o envio continua marcado para a próxima rodada.
      const now = meta();
      const sentDeleted = new Set(m.deleted);
      writeMeta({
        ...now,
        known,
        dirty: now.dirty.filter((k) => !sentEdits.has(k) || sentEdits.get(k) !== (edits.get(k) ?? 0)),
        deleted: now.deleted.filter((k) => !sentDeleted.has(k)),
        lastSyncAt: new Date().toISOString(),
      });
      setStatus("synced");
    } catch (err) {
      setStatus(navigator.onLine ? "error" : "offline", err instanceof Error ? err.message : String(err));
    }
  })().finally(() => {
    pushing = null;
  });
  return pushing;
}

/**
 * Traz da nuvem o que mudou em outro aparelho. Devolve true quando algo mudou aqui,
 * para o app reler os dados.
 */
export function pull(): Promise<boolean> {
  if (!supabase || !userId) return Promise.resolve(false);
  pullInFlight ??= (async () => {
    setStatus("syncing");
    try {
      await pushPending();
      const { data: heads, error } = await supabase.from("app_state").select("key, updated_at");
      if (error) throw error;
      const m = meta();
      const dirty = new Set(m.dirty);
      const known = { ...m.known };
      const remote = new Map((heads ?? []).map((r) => [r.key as string, r.updated_at as string]));
      const changed = [...remote].filter(([k, at]) => known[k] !== at && !dirty.has(k)).map(([k]) => k);
      let touched = false;

      if (changed.length) {
        const { data, error: e2 } = await supabase.from("app_state").select("key, value, updated_at").in("key", changed);
        if (e2) throw e2;
        for (const r of data ?? []) {
          const k = r.key as string;
          if (meta().dirty.includes(k)) continue;
          writeLocal(k, r.value);
          known[k] = r.updated_at as string;
          touched = true;
        }
      }
      // Apagado em outro aparelho: some daqui também.
      for (const k of Object.keys(known)) {
        if (!remote.has(k) && !dirty.has(k)) {
          localStorage.removeItem(k);
          delete known[k];
          touched = true;
        }
      }
      writeMeta({ ...meta(), known, lastSyncAt: new Date().toISOString() });
      setStatus("synced");
      return touched;
    } catch (err) {
      setStatus(navigator.onLine ? "error" : "offline", err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      pullInFlight = null;
    }
  })();
  return pullInFlight;
}

/**
 * Primeira sincronização depois do login, antes de o app montar.
 * - Nuvem vazia: tudo o que está neste navegador sobe (é a migração dos dados atuais).
 * - Nuvem com dados e navegador que nunca sincronizou: a nuvem vale, e o que havia aqui
 *   fica guardado em LOCAL_COPY_KEY para baixar em Dados e backup.
 */
export async function startSync(uid: string): Promise<void> {
  if (!supabase) return;
  userId = uid;
  const previous = readMeta();

  if (!previous || previous.userId !== uid) {
    setStatus("syncing");
    const { count, error } = await supabase.from("app_state").select("key", { count: "exact", head: true });
    if (error) {
      // Sem rede: abre com o que está aqui e tenta de novo depois.
      writeMeta({ ...emptyMeta(), userId: uid });
      setStatus(navigator.onLine ? "error" : "offline", error.message);
      return;
    }
    const keys = localKeys();
    if (!count) {
      writeMeta({ ...emptyMeta(), userId: uid, dirty: keys });
    } else {
      if (keys.length) {
        const copy: Record<string, unknown> = {};
        for (const k of keys) copy[k] = readLocal(k);
        try {
          localStorage.setItem(
            LOCAL_COPY_KEY,
            JSON.stringify({ app: "nishios", version: 1, exportedAt: new Date().toISOString(), data: copy }),
          );
        } catch {
          /* sem espaço: segue sem a cópia */
        }
        for (const k of keys) localStorage.removeItem(k);
      }
      writeMeta({ ...emptyMeta(), userId: uid });
    }
  }
  await pull();
}

/** Ao sair: para de sincronizar. Os dados continuam neste navegador. */
export function stopSync() {
  timers.forEach((t) => window.clearTimeout(t));
  timers.clear();
  userId = "";
  setStatus("off");
}
