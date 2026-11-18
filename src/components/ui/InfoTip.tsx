import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

/**
 * Ícone de ajuda que abre uma explicação curta. Abre no clique (e no toque, no celular),
 * por isso é um popover e não um tooltip de hover.
 */
export function InfoTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          className,
        )}
      >
        <CircleHelp className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
