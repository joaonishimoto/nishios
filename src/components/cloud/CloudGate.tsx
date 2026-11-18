import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { pull, pushPending, startSync, stopSync, subscribeSync, syncSnapshot } from "@/lib/sync";
import { LoginScreen } from "./LoginScreen";

interface Cloud {
  email: string;
  signOut: () => Promise<void>;
  /** Envia e traz agora; relê o app se algo veio de outro aparelho. */
  syncNow: () => Promise<void>;
}

const Ctx = createContext<Cloud | null>(null);

/** Nulo quando o app roda sem Supabase (só no navegador). */
export function useCloud(): Cloud | null {
  return useContext(Ctx);
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribeSync, syncSnapshotCached);
}

let lastSnap = syncSnapshot();
function syncSnapshotCached() {
  const next = syncSnapshot();
  if (next.status !== lastSnap.status || next.error !== lastSnap.error || next.lastSyncAt !== lastSnap.lastSyncAt) {
    lastSnap = next;
  }
  return lastSnap;
}

function Splash({ text }: { text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">{text}</main>
  );
}

/** Erro que o Supabase devolve no endereço depois do redirect (ex.: conta recusada). */
function urlError(): string {
  const params = new URLSearchParams(window.location.search + "&" + window.location.hash.slice(1));
  const desc = params.get("error_description");
  if (!desc) return "";
  window.history.replaceState(null, "", window.location.pathname);
  return /database error|acesso/i.test(desc) ? "Este e-mail não tem acesso ao NishiOS." : desc;
}

/**
 * Com Supabase configurado, o app só abre depois do login, e os dados da nuvem chegam
 * antes de os stores lerem o localStorage. Sem Supabase, o app abre como sempre.
 */
export function CloudGate({ children }: { children: (generation: number) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [readyFor, setReadyFor] = useState("");
  const [generation, setGeneration] = useState(0);
  const [notice] = useState(urlError);
  const userId = session?.user.id ?? "";

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void startSync(userId).then(() => {
      if (!cancelled) setReadyFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (await pull()) setGeneration((g) => g + 1);
  }, []);

  // Ao voltar para a aba, a cada minuto com ela aberta e quando a rede volta.
  useEffect(() => {
    if (!readyFor) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
      else void pushPending();
    };
    const timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), 60_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [readyFor, refresh]);

  if (!supabase) return <>{children(0)}</>;
  if (session === undefined) return <Splash text="Abrindo…" />;
  if (!session) return <LoginScreen notice={notice} />;
  if (readyFor !== userId) return <Splash text="Sincronizando seus dados…" />;

  const cloud: Cloud = {
    email: session.user.email ?? "",
    async signOut() {
      await pushPending();
      stopSync();
      setReadyFor("");
      await supabase!.auth.signOut();
    },
    syncNow: refresh,
  };

  return <Ctx.Provider value={cloud}>{children(generation)}</Ctx.Provider>;
}
