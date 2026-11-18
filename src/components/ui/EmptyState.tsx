import type { ReactNode } from "react";
import { Inbox, SearchX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type Size = "md" | "sm";
type Tone = "neutral" | "success";
type Frame = "dashed" | "solid" | "none";

/**
 * Estado vazio do design system. Sempre diz o que aconteceu e o que fazer em seguida.
 *
 * - `size="md"` (padrão): ocupa o lugar de uma lista ou página inteira, com moldura tracejada.
 * - `size="sm"`: dentro de um cartão, painel ou lista curta, sem moldura.
 * - `frame`: a moldura. Tracejada (padrão do `md`) é o lugar de algo que ainda vai existir;
 *   sólida acompanha as listas em cartão; `none` (padrão do `sm`) para dentro de painéis e menus.
 * - `tone="success"`: quando vazio é bom sinal ("Tudo em dia").
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  tone = "neutral",
  frame = size === "md" ? "dashed" : "none",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: Size;
  tone?: Tone;
  frame?: Frame;
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        sm ? "gap-1 px-4 py-6" : "gap-1.5 px-6 py-12",
        frame === "dashed" && "rounded-lg border border-dashed border-border-strong bg-surface-muted/40",
        frame === "solid" && "rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-full",
          sm ? "mb-1 size-8 [&_svg]:size-4" : "mb-2 size-11 [&_svg]:size-5",
          tone === "success"
            ? "bg-success-soft text-success-strong"
            : sm
              ? "bg-surface-muted text-muted-foreground"
              : "border border-border bg-surface text-muted-foreground shadow-xs",
        )}
      >
        <Icon />
      </span>
      <p className={cn("text-foreground", sm ? "text-sm font-medium" : "text-lg font-medium")}>{title}</p>
      {description && (
        <p className={cn("max-w-sm text-muted-foreground", sm && "text-sm")}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", sm ? "mt-2" : "mt-4")}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/**
 * Busca ou filtro sem resultado. Mostra o termo buscado e oferece limpar os filtros.
 */
export function NoResults({
  query,
  onClear,
  size,
  className,
}: {
  query?: string;
  onClear?: () => void;
  size?: Size;
  className?: string;
}) {
  const q = query?.trim();
  return (
    <EmptyState
      icon={SearchX}
      size={size}
      className={className}
      title={q ? `Nada encontrado para “${q}”` : "Nada encontrado"}
      description={
        q
          ? "Confira a grafia ou tente outra palavra. A busca também respeita os filtros escolhidos."
          : "Nenhum item combina com os filtros escolhidos. Tente outra combinação."
      }
      action={
        onClear && (
          <Button variant="outline" size={size === "sm" ? "sm" : undefined} onClick={onClear}>
            Limpar filtros
          </Button>
        )
      }
    />
  );
}
