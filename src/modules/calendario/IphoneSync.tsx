import { useMemo, useRef, useState } from "react";
import { add } from "date-fns";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { plural } from "@/lib/format";
import { buildICS, deliverICS, parseICS } from "./ics";
import { useCalendar } from "./store";
import { useCalendarItems } from "./useCalendarItems";

/** Quanto do futuro vai para o iPhone. */
const MONTHS_AHEAD = 12;

export function IphoneSync({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Calendário do iPhone"
      description="Leve o NishiOS para o app Calendário da Apple e traga de lá os seus eventos."
    >
      {open && <Content />}
    </Dialog>
  );
}

function Content() {
  const { events, hidden, replaceImported } = useCalendar();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const now = today();
  const from = toISO(add(now, { years: -2 }));
  const to = toISO(add(now, { months: MONTHS_AHEAD }));
  // O arquivo leva os valores de verdade, mesmo com o olhinho fechado.
  const { items } = useCalendarItems(from, to, { reveal: true });

  const own = useMemo(
    () => (hidden.includes("eventos") ? [] : events.filter((e) => e.origin === "nishios")),
    [events, hidden],
  );
  const imported = events.filter((e) => e.origin === "iphone");
  const ics = useMemo(() => buildICS(own, items), [own, items]);
  const count = (ics.match(/BEGIN:VEVENT/g) ?? []).length;

  async function send() {
    const how = await deliverICS(ics);
    if (how === "downloaded") toast({ message: "Arquivo nishios.ics baixado" });
  }

  async function receive(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const result = parseICS(await file.text());
      if (result.events.length === 0) {
        setError(
          result.skippedOwn > 0
            ? "Esse arquivo só tem eventos que saíram do próprio NishiOS. Exporte um calendário do iPhone."
            : "Não encontrei eventos nesse arquivo. Confira se ele termina em .ics.",
        );
        return;
      }
      const before = imported;
      replaceImported(result.events);
      toast({
        message: `${plural(result.events.length, "evento trazido", "eventos trazidos")} do iPhone`,
        action: { label: "Desfazer", onClick: () => replaceImported(before) },
      });
    } catch {
      setError("Não consegui ler esse arquivo. Exporte de novo pelo app Calendário e tente outra vez.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <DialogBody className="flex flex-col gap-6 pb-6">
      <section>
        <h3 className="font-semibold">Enviar para o iPhone</h3>
        <p className="mt-1 text-muted-foreground">
          Gera um arquivo com {plural(count, "evento", "eventos")}: tudo o que está visível no calendário, de hoje
          até daqui a {MONTHS_AHEAD} meses. Aniversários e eventos que se repetem vão com a repetição.
        </p>
        <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-muted-foreground">
          <li>No Mac, clique no botão abaixo e abra o arquivo baixado. Ele entra no Calendário e o iCloud leva para o iPhone.</li>
          <li>Direto no iPhone, o mesmo botão abre o compartilhamento: escolha Calendário e depois Adicionar todos.</li>
        </ol>
        <Button className="mt-4" onClick={send} disabled={count === 0}>
          <Download />
          Enviar para o iPhone
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          Enviar de novo atualiza os eventos que já estão lá, sem duplicar. Para escolher o que vai, ligue ou desligue as
          camadas do calendário antes.
        </p>
      </section>

      <section className="border-t border-border pt-5">
        <h3 className="font-semibold">Trazer do iPhone</h3>
        <p className="mt-1 text-muted-foreground">
          No Mac, abra o Calendário, escolha Arquivo, Exportar, Exportar e selecione o arquivo aqui. Os eventos aparecem
          na camada iPhone.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".ics,text/calendar"
          className="sr-only"
          aria-label="Arquivo do calendário do iPhone"
          onChange={(e) => receive(e.target.files?.[0])}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload />
            Escolher arquivo .ics
          </Button>
          {imported.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                const before = imported;
                replaceImported([]);
                toast({
                  message: "Eventos do iPhone removidos",
                  action: { label: "Desfazer", onClick: () => replaceImported(before) },
                });
              }}
            >
              Remover os {imported.length} trazidos
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger-strong">
            {error}
          </p>
        )}
        {imported.length > 0 && !error && (
          <p className="mt-3 text-sm text-muted-foreground">
            Trazer um arquivo novo substitui os eventos trazidos antes.
          </p>
        )}
      </section>

      <p className="rounded-md bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
        Por enquanto a troca é por arquivo, porque o NishiOS roda só no seu computador. Quando ele for publicado na
        internet, o iPhone passa a assinar o calendário e se atualiza sozinho, usando este mesmo formato.
      </p>
    </DialogBody>
  );
}
