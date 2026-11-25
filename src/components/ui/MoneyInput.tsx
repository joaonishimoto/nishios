import { forwardRef, useLayoutEffect, useRef, type ClipboardEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { control } from "./control";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Até R$ 99 bilhões: mais dígitos que isso é dedo escorregando. */
const MAX_DIGITS = 13;

/** "R$ 1.234,56", com o espaço comum (o Intl usa um espaço fino que não combina com o resto). */
export function formatMoneyInput(value: number): string {
  return brl.format(value).replace(/\s/g, " ");
}

/**
 * Lê um valor colado ou ditado: "R$ 1.234,56", "1234,56", "1234.56", "1.234" e "1234" viram número.
 * Vírgula é sempre o decimal. Ponto só é decimal quando sobra um ou dois dígitos depois dele.
 */
export function parseMoney(text: string): number | undefined {
  let s = text.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".").replace(/,/g, "");
  else {
    const last = s.lastIndexOf(".");
    const decimals = last === -1 ? 0 : s.length - last - 1;
    s = decimals > 0 && decimals <= 2 && s.indexOf(".") === last ? s : s.replace(/\./g, "");
  }
  const n = Math.abs(Number(s));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

function digitsOf(value: number | null | undefined): string {
  return value == null ? "" : String(Math.round(Math.abs(value) * 100));
}

function fromDigits(digits: string): number | undefined {
  const d = digits.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
  return d === "" ? undefined : Number(d) / 100;
}

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "placeholder"> & {
  /** Em reais. `undefined` ou `null` deixa o campo vazio. */
  value: number | null | undefined;
  /** Recebe o número em reais (1234.56), ou `undefined` quando o campo fica vazio. */
  onValueChange: (value: number | undefined) => void;
  /** O padrão é "R$ 0,00". */
  placeholder?: string;
};

/**
 * Campo de dinheiro com máscara de real: os dígitos entram pela direita, como no app do banco
 * (1 → R$ 0,01, 12 → R$ 0,12, 1234 → R$ 12,34). Colar "1.234,56" também funciona.
 * Mostra "R$ 1.234,56" e devolve o número.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, placeholder = "R$ 0,00", className, onKeyDown, onPaste, onFocus, ...props }, forwarded) => {
    const inner = useRef<HTMLInputElement | null>(null);
    const text = value == null ? "" : formatMoneyInput(value);

    // O cursor fica sempre no fim, onde os dígitos entram.
    useLayoutEffect(() => {
      const el = inner.current;
      if (el && document.activeElement === el) el.setSelectionRange(text.length, text.length);
    }, [text]);

    function setRef(el: HTMLInputElement | null) {
      inner.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    }

    function keyDown(e: KeyboardEvent<HTMLInputElement>) {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const el = e.currentTarget;
      const collapsed = el.selectionStart === el.selectionEnd;
      // Apagar tira o último dígito, mesmo com o cursor em cima de um ponto ou da vírgula.
      if ((e.key === "Backspace" || e.key === "Delete") && collapsed) {
        e.preventDefault();
        onValueChange(fromDigits(digitsOf(value).slice(0, -1)));
      }
    }

    function paste(e: ClipboardEvent<HTMLInputElement>) {
      onPaste?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      const n = parseMoney(e.clipboardData.getData("text"));
      if (n !== undefined) onValueChange(n);
    }

    return (
      <input
        ref={setRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className={cn(control, "h-9 tabular-nums", className)}
        value={text}
        onChange={(e) => onValueChange(fromDigits(e.target.value))}
        onKeyDown={keyDown}
        onPaste={paste}
        onFocus={(e) => {
          onFocus?.(e);
          const el = e.currentTarget;
          requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
        }}
        {...props}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";
