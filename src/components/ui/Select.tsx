import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { control } from "./control";

interface Option {
  value: string;
  label: ReactNode;
  /** Texto puro, para a busca ao digitar. */
  text: string;
  disabled?: boolean;
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Lê os `<option>` passados como filhos, inclusive dentro de listas e fragmentos. */
function readOptions(children: ReactNode, out: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    if (child.type === "option") {
      const text = textOf(child.props.children);
      out.push({
        value: child.props.value !== undefined ? String(child.props.value) : text,
        label: child.props.children,
        text,
        disabled: child.props.disabled,
      });
    } else if (child.type === Fragment || child.type === "optgroup") {
      readOptions(child.props.children, out);
    }
  });
  return out;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Lista suspensa do NishiOS. Recebe `<option>` como filhos e chama `onChange`
 * com `e.target.value`, como o `<select>` do navegador, então troca um pelo outro
 * sem mexer em quem usa. Setas, Home, End, Enter e digitar o começo do nome funcionam.
 */
export function Select({
  id,
  value,
  defaultValue,
  onChange,
  className,
  children,
  disabled,
  "aria-label": ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = readOptions(children);
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number) {
    const o = options[index];
    if (!o || o.disabled) return;
    if (value === undefined) setInner(o.value);
    if (o.value !== current) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  function move(from: number, step: number) {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  }

  function typeahead(key: string) {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + fold(key), at: now };
    const q = typed.current.text;
    const start = q.length === 1 ? active + 1 : active;
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (!options[i].disabled && fold(options[i].text).replace(/^\P{L}+/u, "").startsWith(q)) return i;
    }
    return null;
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => move(i, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? move(-1, 1) : move(options.length, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const i = typeahead(e.key);
      if (i !== null) setActive(i);
    }
  }

  function onTriggerKey(e: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Fechado, digitar já troca a opção, como no select do navegador.
      const i = typeahead(e.key);
      if (i !== null) choose(i);
    }
  }

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(o) => {
        if (o) setActive(selectedIndex >= 0 ? selectedIndex : move(-1, 1));
        setOpen(o);
      }}
    >
      <RadixPopover.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onKeyDown={onTriggerKey}
          className={cn(
            control,
            "flex h-9 items-center gap-2 pr-2 text-left data-[state=open]:border-ring",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-subtle-foreground")}>
            {selected ? selected.label : "Escolher"}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-subtle-foreground transition-transform duration-(--motion-fast)",
              open && "rotate-180",
            )}
          />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            list.current?.focus();
          }}
          className="z-dialog w-(--radix-popover-trigger-width) min-w-44 animate-pop-in overflow-hidden rounded-lg border border-border bg-surface-raised shadow-md"
        >
          <ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKey}
            className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto p-1 outline-none"
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={`${o.value}-${i}`}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onPointerMove={() => !o.disabled && setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-base",
                    i === active && "bg-surface-hover",
                    isSelected && "font-medium",
                    o.disabled && "opacity-50",
                  )}
                >
                  <span className="min-w-0 flex-1">{o.label}</span>
                  <Check aria-hidden className={cn("size-4 shrink-0 text-primary", !isSelected && "invisible")} />
                </li>
              );
            })}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
