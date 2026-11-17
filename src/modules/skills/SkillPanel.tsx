import { useState, type FormEvent } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { LevelDots } from "@/components/ui/LevelDots";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { LEVEL_LABELS, resourceProgress, STATUS_META, STATUS_ORDER, TYPE_LABEL } from "./logic";
import { newId, useSkills } from "./store";
import { CATEGORIES, type Skill, type SkillStatus, type SkillType } from "./types";

/** Painel lateral da skill. Cada campo salva na hora. */
export function SkillPanel({ skill, onClose }: { skill: Skill | undefined; onClose: () => void }) {
  return (
    <Dialog
      variant="sheet"
      open={!!skill}
      onOpenChange={(o) => !o && onClose()}
      title={skill?.name || "Skill"}
      hideTitle
    >
      {skill && <PanelContent skill={skill} onClose={onClose} />}
    </Dialog>
  );
}

function PanelContent({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const { update, remove, restore } = useSkills();
  const toast = useToast();
  const categories = CATEGORIES.includes(skill.category) ? CATEGORIES : [...CATEGORIES, skill.category];
  const progress = resourceProgress(skill);
  const [resource, setResource] = useState("");
  const [entry, setEntry] = useState("");

  function addResource(e: FormEvent) {
    e.preventDefault();
    const text = resource.trim();
    if (!text) return;
    // Um link colado vira recurso clicável; o resto é só o título.
    const isUrl = /^https?:\/\/\S+$/.test(text);
    const title = isUrl ? new URL(text).hostname.replace(/^www\./, "") : text;
    update(skill.id, {
      resources: [...skill.resources, { id: newId(), title, url: isUrl ? text : "", done: false }],
    });
    setResource("");
  }

  function addEntry(e: FormEvent) {
    e.preventDefault();
    const text = entry.trim();
    if (!text) return;
    update(skill.id, { log: [{ id: newId(), date: toISO(today()), text }, ...skill.log] });
    setEntry("");
  }

  return (
    <>
      <DialogBody className="flex flex-col gap-6 pt-12">
        <textarea
          aria-label="Nome da skill"
          value={skill.name}
          rows={1}
          placeholder="Sem nome"
          onChange={(e) => update(skill.id, { name: e.target.value.replace(/\n/g, "") })}
          className="field-sizing-content min-w-0 resize-none bg-transparent text-xl font-semibold tracking-tight placeholder:text-subtle-foreground focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Situação">
            {(id) => (
              <Select
                id={id}
                value={skill.status}
                onChange={(e) => update(skill.id, { status: e.target.value as SkillStatus })}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={skill.type} onChange={(e) => update(skill.id, { type: e.target.value as SkillType })}>
                <option value="hard">{TYPE_LABEL.hard}</option>
                <option value="soft">{TYPE_LABEL.soft}</option>
              </Select>
            )}
          </Field>
          <Field label="Área" className="col-span-2">
            {(id) => (
              <Select id={id} value={skill.category} onChange={(e) => update(skill.id, { category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium">Nível hoje</p>
          <div className="mt-1 flex items-center gap-3">
            <LevelDots value={skill.level} onChange={(level) => update(skill.id, { level })} className="-ml-1.5" />
            <span className="text-muted-foreground">{LEVEL_LABELS[skill.level]}</span>
          </div>
        </div>

        <Field label="Por que e aonde quero chegar">
          {(id) => (
            <Textarea
              id={id}
              value={skill.notes}
              placeholder="O que muda quando você dominar isso?"
              onChange={(e) => update(skill.id, { notes: e.target.value })}
            />
          )}
        </Field>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">Plano de estudo</h3>
            {progress.total > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {progress.done} de {progress.total}
              </span>
            )}
          </div>
          {progress.total > 0 && <Progress value={progress.done / progress.total} label="Plano de estudo concluído" done={progress.done === progress.total} className="mt-2" />}
          <ul className="mt-2 flex flex-col">
            {skill.resources.map((r) => (
              <li key={r.id} className="group flex items-center gap-2.5 py-1">
                <Checkbox
                  checked={r.done}
                  label={`${r.done ? "Desmarcar" : "Concluir"} ${r.title}`}
                  onChange={() =>
                    update(skill.id, {
                      resources: skill.resources.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)),
                    })
                  }
                />
                <span className={r.done ? "min-w-0 flex-1 text-muted-foreground line-through" : "min-w-0 flex-1"}>
                  {r.title}
                </span>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${r.title}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-subtle-foreground"
                  aria-label={`Remover ${r.title}`}
                  onClick={() => update(skill.id, { resources: skill.resources.filter((x) => x.id !== r.id) })}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
          <form className="mt-1 flex gap-2" onSubmit={addResource}>
            <Input
              aria-label="Novo passo ou recurso"
              value={resource}
              placeholder="Curso, livro, prática ou link"
              onChange={(e) => setResource(e.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Adicionar ao plano">
              <Plus />
            </Button>
          </form>
        </section>

        <section>
          <h3 className="font-semibold">Diário de aprendizado</h3>
          <form className="mt-2 flex gap-2" onSubmit={addEntry}>
            <Input
              aria-label="Nova anotação no diário"
              value={entry}
              placeholder="O que você praticou ou aprendeu hoje?"
              onChange={(e) => setEntry(e.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Anotar no diário">
              <Plus />
            </Button>
          </form>
          {skill.log.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Anote cada avanço. Reler o diário mostra o quanto você já andou.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {skill.log.map((l) => (
                <li key={l.id} className="flex items-start gap-2 border-l-2 border-border pl-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{shortDate(l.date)}</p>
                    <p className="whitespace-pre-line">{l.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-subtle-foreground"
                    aria-label="Remover anotação"
                    onClick={() => update(skill.id, { log: skill.log.filter((x) => x.id !== l.id) })}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-muted-foreground">
          Adicionada em {formatDate(skill.createdAt.slice(0, 10))}. As alterações são salvas na hora.
        </p>
      </DialogBody>

      <div className="flex items-center border-t border-border px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 hover:bg-danger-soft hover:text-danger-strong"
          onClick={() => {
            remove(skill.id);
            onClose();
            toast({
              message: "Skill excluída",
              action: { label: "Desfazer", onClick: () => restore(skill) },
            });
          }}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>
    </>
  );
}
