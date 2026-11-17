import { useRef, useState } from "react";
import { EMOJI_GROUPS, firstEmoji } from "@/lib/emojis";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

/**
 * Botão com o emoji atual que abre a biblioteca de emojis.
 * `icons` são as sugestões do módulo e aparecem primeiro; depois vem a
 * biblioteca inteira por assunto, e um campo para colar qualquer outro emoji.
 */
export function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const groups = [{ label: "Sugeridos", emojis: icons }, ...EMOJI_GROUPS];

  function pick(icon: string) {
    onChange(icon);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Ícone</span>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setCustom("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Ícone atual: ${value}. Trocar ícone`}
            className="flex size-9 items-center justify-center rounded-md border border-input bg-input-background text-lg hover:border-input-hover hover:bg-surface-hover"
          >
            {value}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-[19.5rem] max-w-[calc(100vw-1.5rem)] flex-col p-0">
          <div className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5">
            {groups.map((g, i) => (
              <button
                key={g.label}
                type="button"
                title={g.label}
                aria-label={`Ir para ${g.label}`}
                onClick={() =>
                  scroller.current
                    ?.querySelector(`[data-group="${i}"]`)
                    ?.scrollIntoView({ block: "start" })
                }
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-base hover:bg-surface-hover"
              >
                {i === 0 ? "⭐" : g.emojis[0]}
              </button>
            ))}
          </div>
          <div
            ref={scroller}
            // O Dialog trava a rolagem fora dele; estes eventos mantêm a lista rolável.
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="max-h-64 overflow-y-auto overscroll-contain px-2 pb-2"
          >
            {groups.map((g, i) => (
              <section key={g.label} data-group={i} aria-label={g.label}>
                <h3 className="sticky top-0 bg-surface-raised px-1 pt-2.5 pb-1 text-xs font-medium text-muted-foreground">
                  {g.label}
                </h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {g.emojis.map((icon, n) => (
                    <button
                      key={`${icon}-${n}`}
                      type="button"
                      aria-label={`Usar ${icon}`}
                      aria-pressed={icon === value}
                      onClick={() => pick(icon)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-sm text-lg hover:bg-surface-hover",
                        icon === value && "bg-surface-selected",
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-2">
            <input
              aria-label="Colar outro emoji"
              value={custom}
              placeholder="Não achou? Cole ou digite um emoji"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const emoji = firstEmoji(custom);
                if (emoji) pick(emoji);
              }}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-input-background px-2 text-sm placeholder:text-subtle-foreground focus:border-ring focus:outline-none"
            />
            <button
              type="button"
              disabled={!firstEmoji(custom)}
              onClick={() => {
                const emoji = firstEmoji(custom);
                if (emoji) pick(emoji);
              }}
              className="h-8 shrink-0 rounded-md px-2.5 text-sm font-medium text-primary hover:bg-surface-hover disabled:text-subtle-foreground disabled:hover:bg-transparent"
            >
              Usar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
