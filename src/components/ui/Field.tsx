import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { control } from "./control";
import { DatePicker } from "./DatePicker";

// A lista suspensa é a do design system, não a do navegador.
export { Select } from "./Select";

/**
 * Todo campo tem placeholder (o tipo exige). Ele mostra um exemplo ou o que o vazio significa,
 * nunca repete o rótulo:
 * - texto: um exemplo real, "Ex.: Cortar o cabelo";
 * - número: o formato ou a unidade, "0,00", "45";
 * - data opcional: o que acontece se ficar em branco, "Sem prazo";
 * - texto longo: as ideias do que anotar, terminando em reticências.
 * Campos de hora (`type="time"`) não mostram placeholder no navegador, por isso ficam de fora.
 */
type WithPlaceholder<T> = Omit<T, "placeholder"> & { placeholder: string };
export type InputProps =
  | WithPlaceholder<InputHTMLAttributes<HTMLInputElement>>
  | (Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type: "time" | "hidden" });
export type TextareaProps = WithPlaceholder<TextareaHTMLAttributes<HTMLTextAreaElement>>;

/**
 * Campo de texto. Com `type="date"` vira o seletor de data do design system,
 * com a mesma forma de usar (`value` em yyyy-MM-dd e `e.target.value` no `onChange`).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    if (props.type === "date") {
      return (
        <DatePicker
          id={props.id}
          value={props.value === undefined ? undefined : String(props.value)}
          onChange={props.onChange}
          min={props.min === undefined ? undefined : String(props.min)}
          max={props.max === undefined ? undefined : String(props.max)}
          required={props.required}
          disabled={props.disabled}
          placeholder={props.placeholder}
          aria-label={props["aria-label"]}
          className={className}
        />
      );
    }
    return <input ref={ref} className={cn(control, "h-9", className)} {...props} />;
  },
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-20 resize-y py-2", className)} {...props} />
));
Textarea.displayName = "Textarea";


/** Rótulo + controle + ajuda/erro. Passa o id para o filho por função. */
export function Field({
  label,
  tip,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  /** Ajuda opcional ao lado do rótulo, normalmente um `<InfoTip>`. */
  tip?: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {tip ? (
        <div className="flex h-5 items-center gap-1">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {tip}
        </div>
      ) : (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-sm text-danger-strong">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
