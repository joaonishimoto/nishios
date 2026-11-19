import { supabase } from "./supabase";

/**
 * Vídeos enviados do aparelho (os passos de dança usam). Não cabem no localStorage, então:
 * - com login, vão para o bucket privado "nishios-videos" do Supabase Storage, numa pasta
 *   com o id do usuário (só o dono lê), e valem em todos os aparelhos;
 * - sem Supabase, ficam no IndexedDB deste navegador.
 * A referência guardada nos dados diz onde está: "sb:<caminho>" ou "idb:<id>".
 */
const BUCKET = "nishios-videos";
/** Limite do plano gratuito do Supabase por arquivo. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const DB_NAME = "nishios-videos";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function extension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] || "mp4";
}

/** Envia o vídeo e devolve a referência para guardar no passo. */
export async function uploadVideo(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error("O vídeo passa de 50 MB. Corte ou comprima antes de enviar.");
  const id = crypto.randomUUID();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw new Error("Entre de novo para enviar vídeos.");
    const path = `${uid}/${id}.${extension(file)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
    if (error) throw new Error(`Não deu para enviar o vídeo: ${error.message}`);
    return `sb:${path}`;
  }
  await idb("readwrite", (s) => s.put(file, id));
  return `idb:${id}`;
}

const cache = new Map<string, { url: string; until: number }>();

/** Endereço para tocar o vídeo: link assinado por uma hora, ou um blob local. */
export async function videoUrl(ref: string): Promise<string> {
  const hit = cache.get(ref);
  if (hit && hit.until > Date.now()) return hit.url;
  let url = "";
  let until = Number.POSITIVE_INFINITY;
  if (ref.startsWith("sb:")) {
    if (!supabase) throw new Error("Este vídeo está na nuvem; entre para ver.");
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ref.slice(3), 3600);
    if (error || !data) throw new Error("Não deu para abrir o vídeo.");
    url = data.signedUrl;
    until = Date.now() + 50 * 60 * 1000;
  } else if (ref.startsWith("idb:")) {
    const blob = await idb<Blob | undefined>("readonly", (s) => s.get(ref.slice(4)));
    if (!blob) throw new Error("Este vídeo foi enviado em outro navegador.");
    url = URL.createObjectURL(blob);
  } else {
    throw new Error("Vídeo desconhecido.");
  }
  cache.set(ref, { url, until });
  return url;
}

/** Apaga o arquivo. Falhar aqui não impede tirar o vídeo do passo. */
export async function deleteVideo(ref: string): Promise<void> {
  cache.delete(ref);
  try {
    if (ref.startsWith("sb:") && supabase) await supabase.storage.from(BUCKET).remove([ref.slice(3)]);
    else if (ref.startsWith("idb:")) await idb("readwrite", (s) => s.delete(ref.slice(4)));
  } catch {
    /* fica um arquivo órfão; não atrapalha o app */
  }
}

/** Link do YouTube ou do Vimeo vira o endereço do player embutido; os outros abrem fora. */
export function embedUrl(link: string): string | null {
  try {
    const u = new URL(link);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[2]}`;
    }
    if (host === "vimeo.com") {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {
    /* não é um link */
  }
  return null;
}
