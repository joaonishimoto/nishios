import { useMemo, useRef, useState, type ReactNode } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Cloud, Download, Eraser, LogOut, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { useCloud, useSyncStatus } from "@/components/cloud/CloudGate";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  applyBackup,
  clearToEmpty,
  clearToExample,
  downloadBackup,
  lastBackupAt,
  parseBackup,
  readBackup,
  summarize,
  type Backup,
} from "@/lib/backup";
import { formatDate, today } from "@/lib/dates";
import { LOCAL_COPY_KEY } from "@/lib/sync";

const STATUS: Record<string, string> = {
  off: "Sincronização desligada.",
  syncing: "Sincronizando…",
  synced: "Tudo sincronizado.",
  offline: "Sem internet. O que mudar aqui sobe quando a conexão voltar.",
  error: "A última sincronização falhou. O app tenta de novo sozinho.",
};

function savedLocalCopy(): Backup | null {
  try {
    const raw = localStorage.getItem(LOCAL_COPY_KEY);
    const parsed = raw ? parseBackup(raw) : null;
    return parsed && typeof parsed !== "string" ? parsed : null;
  } catch {
    return null;
  }
}

function download(backup: Backup, name: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CloudBlock() {
  const cloud = useCloud();
  const sync = useSyncStatus();
  const [copy] = useState(savedLocalCopy);
  const [busy, setBusy] = useState(false);
  if (!cloud) return null;
  return (
    <Block title="Nuvem">
      <p className="max-w-[60ch] text-muted-foreground">
        Conectado como <span className="font-medium text-foreground">{cloud.email}</span>. O que você cadastra aqui
        sobe para o Supabase e aparece nos seus outros aparelhos ao abrir o app.
      </p>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cloud className="size-4" />
        {STATUS[sync.status]}
        {sync.lastSyncAt && sync.status !== "syncing" && ` Última vez: ${new Date(sync.lastSyncAt).toLocaleString("pt-BR")}.`}
      </p>
      {sync.status === "error" && sync.error && <p className="text-sm text-danger-strong">{sync.error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await cloud.syncNow();
            setBusy(false);
          }}
        >
          <RefreshCw />
          Sincronizar agora
        </Button>
        <Button variant="ghost" onClick={() => void cloud.signOut()}>
          <LogOut />
          Sair
        </Button>
      </div>
      {copy && (
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Quando este navegador entrou pela primeira vez, a nuvem já tinha dados e eles passaram a valer aqui. O que
          havia antes neste navegador ficou guardado:{" "}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => download(copy, `nishios-copia-local-${copy.exportedAt.slice(0, 10)}.json`)}
          >
            baixar essa cópia
          </button>
          .
        </p>
      )}
    </Block>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 flex flex-col items-start gap-3">{children}</div>
    </section>
  );
}

function Summary({ backup }: { backup: Backup }) {
  const rows = summarize(backup);
  if (rows.length === 0) return <p className="text-muted-foreground">Nenhum item cadastrado.</p>;
  return (
    <ul className="grid w-full max-w-xl grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
      {rows.map((r) => (
        <li key={r.label} className="flex items-baseline gap-1.5">
          <span className="font-medium tabular-nums">{r.count}</span>
          <span className="truncate text-muted-foreground">{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

function lastLabel(iso: string): string {
  if (!iso) return "Você ainda não baixou nenhum backup neste navegador.";
  const days = differenceInCalendarDays(today(), new Date(iso));
  const when = days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  return `Último backup baixado ${when}.`;
}

type Confirm = { kind: "restore"; backup: Backup; fileName: string } | { kind: "example" } | { kind: "empty" };

export function DadosPage() {
  const toast = useToast();
  const cloud = useCloud();
  const [last, setLast] = useState(lastBackupAt);
  const current = useMemo(readBackup, []);
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (typeof parsed === "string") {
      setError(parsed);
      return;
    }
    setError("");
    setConfirm({ kind: "restore", backup: parsed, fileName: file.name });
  }

  /** As três trocas mexem direto no que está salvo; recarregar faz o app inteiro ler de novo. */
  function run() {
    if (!confirm) return;
    if (confirm.kind === "restore") applyBackup(confirm.backup);
    else if (confirm.kind === "example") clearToExample();
    else clearToEmpty();
    window.location.assign("/");
  }

  const titles = {
    restore: "Restaurar este backup?",
    example: "Voltar aos dados de exemplo?",
    empty: "Começar do zero?",
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dados e backup"
        description={
          cloud
            ? "Seus dados ficam na nuvem e neste navegador. O backup continua valendo como cópia de segurança fora do Supabase."
            : "Tudo o que você cadastra fica salvo só neste navegador. Baixe um backup de vez em quando para não perder nada e para levar seus dados a outro computador."
        }
      />

      <CloudBlock />

      <Block title="Baixar um backup">
        <p className="max-w-[60ch] text-muted-foreground">
          Um arquivo com tudo: tarefas, rotina, metas, compromissos, calendário, pessoas, treinos, corpo, bens, casa,
          pets e skills.
        </p>
        <Summary backup={current} />
        <Button
          onClick={() => {
            const b = downloadBackup();
            setLast(b.exportedAt);
            toast({ message: "Backup baixado" });
          }}
        >
          <Download />
          Baixar backup
        </Button>
        <p className="text-sm text-muted-foreground">{lastLabel(last)}</p>
      </Block>

      <Block title="Restaurar de um arquivo">
        <p className="max-w-[60ch] text-muted-foreground">
          Escolha um backup baixado aqui. Ele substitui o que está salvo neste navegador{cloud && " e na nuvem"}, então baixe um backup do
          estado atual antes, se quiser guardar.
        </p>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Arquivo de backup"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Upload />
          Escolher arquivo
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger-strong">
            {error}
          </p>
        )}
      </Block>

      <Block title="Recomeçar">
        <p className="max-w-[60ch] text-muted-foreground">
          O app vem com dados de exemplo para você ver como cada tela funciona. Quando quiser usar de verdade, comece
          do zero: as listas ficam vazias e a casa, o tema e as modalidades de treino continuam.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirm({ kind: "empty" })}>
            <Eraser />
            Começar do zero
          </Button>
          <Button variant="outline" onClick={() => setConfirm({ kind: "example" })}>
            <RotateCcw />
            Voltar aos dados de exemplo
          </Button>
        </div>
      </Block>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? titles[confirm.kind] : ""}
      >
        {confirm && (
          <>
            <DialogBody className="flex flex-col gap-3">
              {confirm.kind === "restore" ? (
                <>
                  <p>
                    {confirm.fileName}
                    {confirm.backup.exportedAt && `, salvo em ${formatDate(new Date(confirm.backup.exportedAt))}`}.
                  </p>
                  <Summary backup={confirm.backup} />
                  <p className="text-muted-foreground">
                    O que está salvo neste navegador{cloud && " e na nuvem"} será substituído.
                  </p>
                </>
              ) : confirm.kind === "example" ? (
                <p className="text-muted-foreground">
                  Tudo o que você cadastrou será substituído pelos dados de exemplo. Baixe um backup antes se quiser
                  guardar.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Tarefas, hábitos, metas, compromissos, eventos, pessoas, treinos, medições, bens, desejos, pets e
                  skills serão apagados. Baixe um backup antes se quiser guardar.
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button variant={confirm.kind === "restore" ? "primary" : "danger"} onClick={run}>
                {confirm.kind === "restore" ? "Restaurar backup" : confirm.kind === "example" ? "Voltar aos exemplos" : "Apagar e começar do zero"}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
