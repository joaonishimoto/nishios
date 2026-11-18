import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** "modal" centraliza; "sheet" abre um painel lateral, como a espiada do Notion. */
  variant?: "modal" | "sheet";
  hideTitle?: boolean;
  className?: string;
  children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "modal",
  hideTitle,
  className,
  children,
}: Props) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-overlay animate-fade-in bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-dialog flex flex-col bg-surface-raised shadow-md focus:outline-none",
            variant === "modal"
              ? "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-pop-in rounded-xl"
              : "inset-y-0 right-0 w-full max-w-md animate-sheet-in border-l border-border",
            className,
          )}
        >
          <div
            className={cn(
              "flex items-start justify-between gap-4 px-6 pt-5",
              hideTitle && "absolute top-0 right-0 z-10 px-3 pt-3",
            )}
          >
            <div className={cn(hideTitle && "sr-only")}>
              <RadixDialog.Title className="text-xl font-semibold tracking-tight">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar" className="-mr-2 -mt-1">
                <X />
              </Button>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Corpo rolável. Os filhos diretos não encolhem (`*:shrink-0`): num corpo em coluna flex, quando o
 * conteúdo passa da altura, o navegador encolheria primeiro os que rolam por dentro (textarea), até
 * sumirem. Foi o que escondeu o nome no painel de skills.
 */
export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5 *:shrink-0", className)}>{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3.5">
      {children}
    </div>
  );
}
