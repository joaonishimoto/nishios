import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { supabase } from "@/lib/supabase";
import { GoogleSignInButton } from "./GoogleSignInButton";

/** O Supabase devolve este texto quando o gatilho de acesso recusa uma conta nova. */
function friendly(error: Error): string {
  const m = error.message.toLowerCase();
  if (m.includes("database error") || m.includes("não tem acesso")) return "Este e-mail não tem acesso ao NishiOS.";
  if (m.includes("provider is not enabled")) return "O login com Google ainda não foi ativado no Supabase.";
  if (m.includes("rate limit")) return "Muitas tentativas. Espere um minuto e tente de novo.";
  return error.message;
}

export function LoginScreen({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState(notice ?? "");

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setSending(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(friendly(error));
    else setSentTo(email.trim());
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-lg bg-brand text-brand-cream">
            <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12V4l8 8V4" />
            </svg>
          </span>
          <h1 className="font-brand text-2xl font-medium tracking-tight text-brand">nishiOS</h1>
          <p className="text-muted-foreground">Sistema pessoal. Entre para ver e sincronizar seus dados.</p>
        </div>

        <GoogleSignInButton onError={(e) => setError(friendly(e))} />

        <div className="flex items-center gap-3 text-sm text-subtle-foreground">
          <span className="h-px flex-1 bg-border" />
          ou com um link no e-mail
          <span className="h-px flex-1 bg-border" />
        </div>

        {sentTo ? (
          <p className="rounded-md border border-border bg-surface p-3 text-center">
            Mandamos um link para <strong className="font-medium">{sentTo}</strong>. Abra neste mesmo navegador.
          </p>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-2">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              aria-label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={sending}>
              <Mail />
              {sending ? "Enviando…" : "Receber link de acesso"}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-center text-sm text-danger-strong">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
