import { useState, type FormEvent } from "react";
import { ExternalLink, Gift as GiftIcon, Heart, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/components/ui/Toast";
import { money } from "@/lib/format";
import { profileOf } from "./extras";
import { GiftForm } from "./GiftsTab";
import { usePeople } from "./store";
import type { GiftIdea, Person, Profile } from "./types";

type TextKey = Exclude<keyof Profile, "ideas">;

interface FieldDef {
  key: TextKey;
  label: string;
  placeholder: string;
  long?: boolean;
}

const SECTIONS: { title: string; fields: FieldDef[]; compact?: boolean }[] = [
  {
    title: "Gostos",
    fields: [
      { key: "likes", label: "Gosta de", placeholder: "Ex.: Café especial, livros de ficção, plantas", long: true },
      { key: "dislikes", label: "Não gosta de", placeholder: "Ex.: Perfume doce, roupa amarela", long: true },
      { key: "hobbies", label: "Hobbies", placeholder: "Ex.: Corrida, videogame, crochê" },
      { key: "food", label: "Comida", placeholder: "Ex.: Japonesa, chocolate amargo" },
      { key: "drinks", label: "Bebida", placeholder: "Ex.: Vinho tinto, não bebe álcool" },
      { key: "favorites", label: "Favoritos", placeholder: "Ex.: Cor azul, time Corinthians, banda Coldplay" },
    ],
  },
  {
    title: "Saúde",
    fields: [
      { key: "allergies", label: "Alergias e restrições", placeholder: "Ex.: Lactose, amendoim, vegetariana" },
    ],
  },
  {
    title: "Tamanhos",
    compact: true,
    fields: [
      { key: "shirtSize", label: "Camiseta", placeholder: "Ex.: M" },
      { key: "pantsSize", label: "Calça", placeholder: "Ex.: 40" },
      { key: "shoeSize", label: "Calçado", placeholder: "Ex.: 38" },
      { key: "ringSize", label: "Anel", placeholder: "Ex.: 16" },
    ],
  },
  {
    title: "Vida",
    fields: [
      { key: "partner", label: "Parceiro(a)", placeholder: "Ex.: Ana, namorada desde 2022" },
      { key: "children", label: "Filhos", placeholder: "Ex.: Theo, 4 anos" },
      { key: "pets", label: "Pets", placeholder: "Ex.: Bob, golden" },
      { key: "work", label: "Trabalho", placeholder: "Ex.: Engenheira na Copel" },
    ],
  },
  {
    title: "Contato e endereço",
    fields: [
      { key: "email", label: "E-mail", placeholder: "Ex.: nome@email.com" },
      { key: "instagram", label: "Instagram", placeholder: "Ex.: @usuario" },
      { key: "address", label: "Endereço", placeholder: "Para mandar presente: rua, número, CEP...", long: true },
      { key: "pixKey", label: "Chave Pix", placeholder: "Ex.: CPF, e-mail ou celular" },
    ],
  },
];

export function ProfileTab({ person: p }: { person: Person }) {
  const prof = profileOf(p);
  const [editing, setEditing] = useState(false);
  const filled = SECTIONS.map((s) => ({ ...s, fields: s.fields.filter((f) => prof[f.key].trim()) })).filter(
    (s) => s.fields.length > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <IdeasSection person={p} ideas={prof.ideas} />

      {filled.length === 0 ? (
        <EmptyState
          size="sm"
          icon={Heart}
          frame="dashed"
          title="Nada anotado ainda"
          description="Gostos, tamanhos, alergias, endereço: o que ajuda na hora de escolher um presente ou marcar um encontro."
          action={
            <Button size="sm" className="h-8" onClick={() => setEditing(true)}>
              <Pencil />
              Preencher
            </Button>
          }
        />
      ) : (
        <>
          {filled.map((s) => (
            <section key={s.title}>
              <h3 className="font-semibold">{s.title}</h3>
              {s.compact ? (
                <dl className="mt-2 grid grid-cols-4 gap-2">
                  {s.fields.map((f) => (
                    <div key={f.key} className="rounded-md border border-border bg-background px-2 py-1.5 text-center">
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="font-semibold">{prof[f.key]}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {s.fields.map((f) => (
                    <div key={f.key} className="contents">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="min-w-0 break-words whitespace-pre-wrap">
                        <Value field={f.key} value={prof[f.key]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
          <Button variant="outline" size="sm" className="h-8 self-start" onClick={() => setEditing(true)}>
            <Pencil />
            Editar gostos e informações
          </Button>
        </>
      )}

      <ProfileForm person={p} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

function Value({ field, value }: { field: TextKey; value: string }) {
  if (field === "email") {
    return (
      <a href={`mailto:${value}`} className="text-primary hover:underline">
        {value}
      </a>
    );
  }
  if (field === "instagram") {
    const user = value.replace(/^@/, "").trim();
    return (
      <a href={`https://instagram.com/${encodeURIComponent(user)}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        @{user}
      </a>
    );
  }
  return <>{value}</>;
}

function IdeasSection({ person: p, ideas }: { person: Person; ideas: GiftIdea[] }) {
  const { saveProfile } = usePeople();
  const toast = useToast();
  const [text, setText] = useState("");
  const [price, setPrice] = useState<number | undefined>();
  const [giving, setGiving] = useState<GiftIdea | null>(null);
  const first = p.name.split(" ")[0];

  const setIdeas = (next: GiftIdea[]) => saveProfile(p.id, { ...profileOf(p), ideas: next });

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setIdeas([...ideas, { id: crypto.randomUUID(), text: text.trim(), price, link: "" }]);
    setText("");
    setPrice(undefined);
  }

  return (
    <section>
      <h3 className="font-semibold">Ideias de presente</h3>
      <p className="text-sm text-muted-foreground">
        Anote quando {first} comentar que quer algo. Quando der, ele vai para os presentes.
      </p>
      {ideas.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {ideas.map((idea) => (
            <li key={idea.id} className="group flex items-center gap-2 border-b border-border py-2 last:border-b-0">
              <GiftIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                {idea.text}
                {idea.link && (
                  <a href={idea.link} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex text-primary" aria-label="Abrir link">
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </span>
              {idea.price != null && <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{money(idea.price)}</span>}
              <Button size="sm" variant="outline" className="h-7" onClick={() => setGiving(idea)}>
                Dei
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Remover a ideia ${idea.text}`}
                onClick={() => {
                  const before = ideas;
                  setIdeas(ideas.filter((x) => x.id !== idea.id));
                  toast({ message: "Ideia removida", action: { label: "Desfazer", onClick: () => setIdeas(before) } });
                }}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex gap-2">
        <Input value={text} placeholder="Ex.: Fone com cancelamento de ruído" className="min-w-0 flex-1" aria-label="Nova ideia de presente" onChange={(e) => setText(e.target.value)} />
        <MoneyInput value={price} onValueChange={setPrice} placeholder="Preço" className="w-28" aria-label="Preço aproximado" />
        <Button type="submit" variant="outline" size="icon" className="size-9" aria-label="Adicionar ideia" disabled={!text.trim()}>
          <Plus />
        </Button>
      </form>

      <GiftForm
        person={p}
        editing={giving ? "dei" : null}
        initial={giving ? { item: giving.text, value: giving.price } : undefined}
        onClose={() => setGiving(null)}
        onSaved={() => giving && setIdeas(ideas.filter((x) => x.id !== giving.id))}
      />
    </section>
  );
}

function ProfileForm({ person, open, onOpenChange }: { person: Person; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Gostos e informações" description={`O que é útil saber sobre ${person.name.split(" ")[0]}.`}>
      {open && <ProfileFormContent person={person} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ProfileFormContent({ person, onClose }: { person: Person; onClose: () => void }) {
  const { saveProfile } = usePeople();
  const toast = useToast();
  const [draft, setDraft] = useState<Profile>(profileOf(person));

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = { ...draft };
    for (const s of SECTIONS) for (const f of s.fields) clean[f.key] = clean[f.key].trim();
    // Lê as ideias da hora de salvar, para não desfazer o que mudou fora do formulário.
    saveProfile(person.id, { ...clean, ideas: profileOf(person).ideas });
    toast({ message: "Informações salvas" });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <fieldset key={s.title} className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{s.title}</legend>
            <div className={s.compact ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid gap-3 sm:grid-cols-2"}>
              {s.fields.map((f) => (
                <Field key={f.key} label={f.label} className={f.long ? "sm:col-span-2" : undefined}>
                  {(id) =>
                    f.long ? (
                      <Textarea id={id} value={draft[f.key]} placeholder={f.placeholder} className="min-h-16" onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                    ) : (
                      <Input id={id} value={draft[f.key]} placeholder={f.placeholder} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                    )
                  }
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
}
