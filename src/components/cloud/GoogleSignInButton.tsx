import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase";

// Google Identity Services: o popup do Google roda na origem do próprio app e devolve um
// ID token, então a tela do Google mostra o domínio do app e não <ref>.supabase.co
// (o fluxo de redirect, signInWithOAuth, passa pelo domínio do Supabase).
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Só as origens cadastradas em "Origens JavaScript autorizadas" do cliente Google funcionam;
// nas outras (previews) o botão usa o redirect. Domínios extras vêm de VITE_APP_HOSTS.
const GSI_HOSTS = [
  "localhost",
  ...((import.meta.env.VITE_APP_HOSTS as string | undefined) ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
];

export const isGoogleIdentityAvailable = Boolean(GOOGLE_CLIENT_ID) && GSI_HOSTS.includes(window.location.hostname);

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce: string;
    use_fedcm_for_button?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

let gsiScript: Promise<void> | null = null;

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScript = null;
      reject(new Error("Falha ao carregar o Google"));
    };
    document.head.appendChild(script);
  });
  return gsiScript;
}

// O Google recebe o SHA-256 do nonce dentro do ID token; o Supabase recebe o valor bruto e confere.
async function createNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

/** Redirect pelo Supabase: funciona em qualquer origem, mas a tela do Google mostra o supabase.co. */
export async function signInWithGoogleRedirect() {
  if (!supabase) return { error: new Error("Supabase não configurado") };
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
  });
}

interface Props {
  disabled?: boolean;
  onError: (error: Error) => void;
}

// O botão do Google não aceita estilo, então fica invisível por cima do botão do app:
// a pessoa vê o botão do NishiOS e o clique cai no iframe do Google.
export function GoogleSignInButton({ disabled, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isGoogleIdentityAvailable || !GOOGLE_CLIENT_ID || !supabase) return;
    const client = supabase;
    let cancelled = false;

    (async () => {
      try {
        const [{ raw, hashed }] = await Promise.all([createNonce(), loadGsi()]);
        const container = containerRef.current;
        if (cancelled || !container || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            setSigningIn(true);
            const { error } = await client.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            setSigningIn(false);
            // Deu certo: a sessão nova chega pelo onAuthStateChange e o app abre.
            if (error) onErrorRef.current(error);
          },
        });

        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          size: "large",
          text: "signin_with",
          locale: "pt-BR",
          width: Math.min(400, Math.max(200, Math.floor(container.offsetWidth))),
        });
        setReady(true);
      } catch (err) {
        // Script bloqueado ou sem rede: o botão visível continua funcionando pelo redirect.
        console.warn("[GoogleSignIn] usando o redirect:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const overlayActive = ready && !disabled && !signingIn;

  return (
    <div className="group relative w-full">
      <Button
        variant="outline"
        className={cn("w-full", overlayActive && "group-hover:border-input-hover group-hover:bg-surface-hover")}
        onClick={async () => {
          const { error } = await signInWithGoogleRedirect();
          if (error) onError(error);
        }}
        disabled={disabled || signingIn}
        tabIndex={overlayActive ? -1 : undefined}
      >
        {signingIn ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        Entrar com Google
      </Button>
      {/* color-scheme: light deixa o iframe do Google transparente no tema escuro */}
      <div
        ref={containerRef}
        style={{ colorScheme: "light" }}
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.01] [&_iframe]:!w-full",
          !overlayActive && "pointer-events-none",
        )}
      />
    </div>
  );
}
