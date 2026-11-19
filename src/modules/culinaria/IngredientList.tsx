import { useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, ShoppingBasket, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { parseIngredient } from "./logic";
import { newId } from "./store";
import { UNITS, type Ingredient } from "./types";

/**
 * No computador, uma linha: quantidade, unidade, ingrediente e ações. No celular, o nome vem em cima,
 * com a largura toda, e quantidade e unidade embaixo.
 */
const ROW = "grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-1.5 sm:grid-cols-[4.5rem_9rem_minmax(0,1fr)_auto]";
const QTY = "row-start-2 col-start-1 sm:row-start-1";
const UNIT = "row-start-2 col-start-2 sm:row-start-1";
const NAME = "row-start-1 col-start-1 col-span-2 sm:col-start-3 sm:col-span-1";
const ACTIONS = "row-start-1 col-start-3 sm:col-start-4";

/** Lista de ingredientes: cada um com quantidade, unidade e nome, editáveis na hora. */
export function IngredientList({ items, onChange }: { items: Ingredient[]; onChange: (items: Ingredient[]) => void }) {
  const [draft, setDraft] = useState({ amount: "", unit: "", name: "" });
  const nameRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Ingredient>) => onChange(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const move = (index: number, step: -1 | 1) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + step, 0, item);
    onChange(next);
  };

  function add(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    onChange([...items, { id: newId(), amount: draft.amount.trim(), unit: draft.unit.trim(), name: draft.name.trim() }]);
    setDraft({ amount: "", unit: "", name: "" });
    nameRef.current?.focus();
  }

  // Colar várias linhas (de um site ou anotação) vira um item por linha.
  function paste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    onChange([...items, ...lines.map((l) => ({ id: newId(), ...parseIngredient(l) }))]);
  }

  return (
    <div>
      <datalist id="unidades-receita">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <div className={`${ROW} hidden px-0.5 pb-1 text-sm text-muted-foreground sm:grid`} aria-hidden>
        <span className={QTY}>Qtd.</span>
        <span className={UNIT}>Unidade</span>
        <span className={NAME}>Ingrediente</span>
        <span className={`${ACTIONS} w-14`} />
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border-strong px-3 py-3 text-sm text-muted-foreground">
          <ShoppingBasket className="size-4 shrink-0" aria-hidden />
          Nenhum ingrediente ainda. Adicione abaixo ou cole uma lista inteira no campo do ingrediente.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 sm:gap-1.5">
          {items.map((i, index) => (
            <li key={i.id} className={`${ROW} border-b border-border pb-2 sm:border-0 sm:pb-0`}>
              <Input
                aria-label={`Quantidade de ${i.name}`}
                value={i.amount}
                placeholder="—"
                inputMode="decimal"
                className={`${QTY} h-8 text-right tabular-nums`}
                onChange={(e) => patch(i.id, { amount: e.target.value })}
              />
              <Input
                aria-label={`Unidade de ${i.name}`}
                list="unidades-receita"
                value={i.unit}
                placeholder="—"
                className={`${UNIT} h-8`}
                onChange={(e) => patch(i.id, { unit: e.target.value })}
              />
              <Input
                aria-label="Ingrediente"
                value={i.name}
                placeholder="Ex.: Tomate"
                className={`${NAME} h-8`}
                onChange={(e) => patch(i.id, { name: e.target.value })}
              />
              <div className={`${ACTIONS} flex`}>
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Subir ${i.name}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="flex h-4 w-6 items-center justify-center rounded-sm text-subtle-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${i.name}`}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex h-4 w-6 items-center justify-center rounded-sm text-subtle-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-subtle-foreground"
                  aria-label={`Remover ${i.name}`}
                  onClick={() => onChange(items.filter((x) => x.id !== i.id))}
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className={`${ROW} mt-3 sm:mt-2`} onSubmit={add}>
        <Input
          aria-label="Quantidade do novo ingrediente"
          value={draft.amount}
          placeholder="2"
          inputMode="decimal"
          className={`${QTY} h-8 text-right tabular-nums`}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
        />
        <Input
          aria-label="Unidade do novo ingrediente"
          list="unidades-receita"
          value={draft.unit}
          placeholder="xícara"
          className={`${UNIT} h-8`}
          onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
        />
        <Input
          ref={nameRef}
          aria-label="Novo ingrediente"
          value={draft.name}
          placeholder="Ex.: Farinha de trigo"
          className={`${NAME} h-8`}
          onPaste={paste}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Adicionar ingrediente" className={`${ACTIONS} ml-6 size-8`}>
          <Plus />
        </Button>
      </form>
    </div>
  );
}
