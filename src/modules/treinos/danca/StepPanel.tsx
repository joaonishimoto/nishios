import { useRef, useState, type FormEvent } from "react";
import { ExternalLink, Lightbulb, Link2, Loader2, Plus, Trash2, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { deleteVideo, MAX_VIDEO_BYTES, uploadVideo } from "@/lib/videos";
import { BeltLabel, BeltSwatch } from "./Belt";
import { LevelChart } from "./LevelChart";
import { currentLevel, LEVEL_META, sortedHistory } from "./levels";
import { newId, useDance } from "./store";
import { VideoView } from "./VideoView";
import { LEVEL_ORDER, type DanceLevel, type DanceStep } from "./types";

/** Um passo recém-criado que fechou sem nome e sem nada preenchido é descartado. */
function isBlank(step: DanceStep) {
  return !step.name.trim() && step.videos.length === 0 && step.tips.length === 0 && step.history.length === 0;
}

/** Painel lateral do passo. Cada campo salva na hora. */
export function StepPanel({
  step,
  onClose,
  categories,
}: {
  step: DanceStep | undefined;
  onClose: () => void;
  categories: string[];
}) {
  const { removeStep } = useDance();
  function close() {
    if (step && isBlank(step)) removeStep(step.id);
    onClose();
  }
  return (
    <Dialog variant="sheet" open={!!step} onOpenChange={(o) => !o && close()} title={step?.name || "Novo passo"} hideTitle>
      {step && <PanelContent key={step.id} step={step} onClose={onClose} categories={categories} />}
    </Dialog>
  );
}

function PanelContent({ step, onClose, categories }: { step: DanceStep; onClose: () => void; categories: string[] }) {
  const { updateStep, setLevel, removeStep, restoreStep } = useDance();
  const toast = useToast();
  const level = currentLevel(step);
  const history = sortedHistory(step);
  const [pending, setPending] = useState<{ level: DanceLevel; date: string; note: string } | null>(null);
  const [tip, setTip] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function confirmLevel(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setLevel(step.id, pending.level, pending.date || toISO(today()), pending.note.trim());
    toast({ message: `${step.name || "Passo"} agora está em ${LEVEL_META[pending.level].label}` });
    setPending(null);
  }

  function addTip(e: FormEvent) {
    e.preventDefault();
    const text = tip.trim();
    if (!text) return;
    updateStep(step.id, { tips: [...step.tips, { id: newId(), text }] });
    setTip("");
  }

  function addLink(e: FormEvent) {
    e.preventDefault();
    const raw = link.trim();
    if (!raw) return;
    const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    let title = url;
    try {
      title = new URL(url).hostname.replace(/^www\.|^m\./, "");
    } catch {
      toast({ message: "Esse link não parece um endereço válido." });
      return;
    }
    updateStep(step.id, {
      videos: [...step.videos, { id: newId(), title, source: "link", url, addedAt: new Date().toISOString() }],
    });
    setLink("");
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ message: "O vídeo passa de 50 MB. Corte ou comprima antes de enviar." });
      return;
    }
    setUploading(true);
    try {
      const ref = await uploadVideo(file);
      const title = file.name.replace(/\.[^.]+$/, "") || "Vídeo";
      updateStep(step.id, {
        videos: [...step.videos, { id: newId(), title, source: "upload", url: ref, addedAt: new Date().toISOString() }],
      });
      toast({ message: "Vídeo enviado" });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Não deu para enviar o vídeo." });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <>
      <DialogBody className="flex flex-col gap-6 pt-12">
        <div className="-mx-2 flex flex-col gap-1">
          <textarea
            aria-label="Nome do passo"
            value={step.name}
            rows={1}
            maxLength={120}
            placeholder="Ex.: Giro da dama"
            autoFocus={!step.name}
            onChange={(e) => updateStep(step.id, { name: e.target.value.replace(/\n/g, "") })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="field-sizing-content min-h-10 min-w-0 resize-none rounded-md bg-transparent px-2 py-1 text-xl font-semibold tracking-tight transition-colors duration-(--motion-fast) placeholder:text-subtle-foreground hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
          />
          {!step.name.trim() && (
            <p className="px-2 text-sm text-muted-foreground">Se fechar sem nome e sem preencher nada, o passo é descartado.</p>
          )}
        </div>

        <Field label="Grupo" hint="Estilo ou tipo de passo, para filtrar o catálogo.">
          {(id) => (
            <>
              <Input
                id={id}
                list="grupos-de-passos"
                value={step.category}
                placeholder="Ex.: Básicos, Giros, Forró"
                onChange={(e) => updateStep(step.id, { category: e.target.value })}
              />
              <datalist id="grupos-de-passos">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">Quão bem eu faço</h3>
            <BeltLabel level={level} />
          </div>
          <p className="text-sm text-muted-foreground">Toque na faixa em que você está agora. Cada mudança fica no histórico.</p>
          <div role="group" aria-label="Faixa do passo" className="mt-2 grid grid-cols-4 gap-1.5">
            {LEVEL_ORDER.map((l) => {
              const active = (pending?.level ?? level) === l;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={l === level}
                  onClick={() =>
                    setPending(l === level ? null : { level: l, date: toISO(today()), note: pending?.note ?? "" })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-xs transition-colors duration-(--motion-fast)",
                    active ? "border-primary bg-surface-selected font-medium" : "border-border hover:bg-surface-hover",
                  )}
                >
                  <BeltSwatch level={l} className="h-3 w-8" />
                  <span className="leading-tight">{LEVEL_META[l].label}</span>
                </button>
              );
            })}
          </div>

          {pending && (
            <form onSubmit={confirmLevel} className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/50 p-3">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <BeltLabel level={level} />
                <span aria-hidden>→</span>
                <BeltLabel level={pending.level} />
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
                <Field label="Quando">
                  {(id) => (
                    <DatePicker
                      id={id}
                      required
                      max={toISO(today())}
                      value={pending.date}
                      onChange={(e) => setPending((p) => p && { ...p, date: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Anotação (opcional)">
                  {(id) => (
                    <Input
                      id={id}
                      value={pending.note}
                      placeholder="O que melhorou?"
                      onChange={(e) => setPending((p) => p && { ...p, note: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="h-8">
                  Registrar mudança
                </Button>
              </div>
            </form>
          )}
        </section>

        <section>
          <h3 className="font-semibold">Evolução</h3>
          {history.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Ainda em Não aprendi. A primeira faixa que você marcar começa o gráfico.</p>
          ) : (
            <>
              <LevelChart history={history} className="mt-2" />
              <ol className="mt-3 flex flex-col gap-2.5">
                {[...history].reverse().map((h) => {
                  const i = history.indexOf(h);
                  const from = i > 0 ? history[i - 1].level : "nao";
                  return (
                    <li key={h.id} className="flex items-start gap-2 border-l-2 border-border pl-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">{shortDate(h.date)}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-sm">
                          <BeltLabel level={from} />
                          <span aria-hidden>→</span>
                          <BeltLabel level={h.level} />
                        </p>
                        {h.note && <p className="mt-0.5 whitespace-pre-line">{h.note}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-subtle-foreground"
                        aria-label="Apagar esta mudança"
                        onClick={() => {
                          const before = step.history;
                          updateStep(step.id, { history: step.history.filter((x) => x.id !== h.id) });
                          toast({
                            message: "Mudança apagada",
                            action: { label: "Desfazer", onClick: () => updateStep(step.id, { history: before }) },
                          });
                        }}
                      >
                        <X />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        <section>
          <h3 className="font-semibold">Vídeos</h3>
          {step.videos.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Video}
              frame="dashed"
              className="mt-2"
              title="Nenhum vídeo"
              description="Cole o link de uma aula ou envie um vídeo seu dançando para comparar depois."
            />
          ) : (
            <ul className="mt-2 flex flex-col gap-4">
              {step.videos.map((v) => (
                <li key={v.id}>
                  <VideoView video={v} />
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      aria-label="Nome do vídeo"
                      value={v.title}
                      onChange={(e) =>
                        updateStep(step.id, {
                          videos: step.videos.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)),
                        })
                      }
                      className="min-w-0 flex-1 rounded-sm bg-transparent px-1 py-0.5 text-sm font-medium hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {v.source === "upload" ? "Enviado" : "Link"} em {shortDate(v.addedAt.slice(0, 10))}
                    </span>
                    {v.source === "link" && (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${v.title}`}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-subtle-foreground"
                      aria-label={`Remover ${v.title}`}
                      onClick={() => {
                        updateStep(step.id, { videos: step.videos.filter((x) => x.id !== v.id) });
                        if (v.source === "upload") {
                          // O arquivo some de vez; não tem desfazer.
                          void deleteVideo(v.url);
                          toast({ message: "Vídeo apagado" });
                        } else {
                          toast({
                            message: "Link removido",
                            action: { label: "Desfazer", onClick: () => updateStep(step.id, { videos: step.videos }) },
                          });
                        }
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form className="mt-2 flex gap-2" onSubmit={addLink}>
            <div className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <Input
                aria-label="Link do vídeo"
                className="pl-8"
                value={link}
                inputMode="url"
                placeholder="Link do YouTube, Instagram, TikTok..."
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" size="icon" aria-label="Adicionar link">
              <Plus />
            </Button>
          </form>
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => void upload(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-8"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Enviando..." : "Enviar vídeo do aparelho"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Até 50 MB por vídeo.</p>
        </section>

        <section>
          <h3 className="font-semibold">Dicas</h3>
          {step.tips.length === 0 ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lightbulb className="size-4" aria-hidden />O que o professor falou, o que destravou o passo para você.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col">
              {step.tips.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 py-1">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden />
                  <span className="min-w-0 flex-1 whitespace-pre-line">{t.text}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-subtle-foreground"
                    aria-label="Remover dica"
                    onClick={() => updateStep(step.id, { tips: step.tips.filter((x) => x.id !== t.id) })}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form className="mt-1 flex gap-2" onSubmit={addTip}>
            <Input aria-label="Nova dica" value={tip} placeholder="Nova dica" onChange={(e) => setTip(e.target.value)} />
            <Button type="submit" variant="outline" size="icon" aria-label="Adicionar dica">
              <Plus />
            </Button>
          </form>
        </section>
      </DialogBody>

      <div className="flex items-center gap-3 border-t border-border px-6 py-3">
        <p className="min-w-0 text-sm text-muted-foreground">Adicionado em {formatDate(step.createdAt.slice(0, 10))}</p>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 shrink-0 hover:bg-danger-soft hover:text-danger-strong"
          onClick={() => {
            removeStep(step.id);
            onClose();
            toast({ message: "Passo excluído", action: { label: "Desfazer", onClick: () => restoreStep(step) } });
          }}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>
    </>
  );
}
