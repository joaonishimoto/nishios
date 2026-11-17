import { cn } from "@/lib/cn";

export type CycleStatus = "overdue" | "soon" | "ok" | "never";

const fill: Record<CycleStatus, string> = {
  overdue: "bg-danger",
  soon: "bg-warning",
  ok: "bg-primary",
  never: "bg-transparent",
};

/**
 * A trilha do ciclo: da última vez (esquerda) até a próxima (direita).
 * Serve para tudo que se repete: compromissos, contato com pessoas...
 * O preenchimento mostra quanto do período já passou; o anel à direita é o vencimento.
 */
export function CycleTrack({
  derived,
  size = "sm",
  className,
}: {
  derived: { status: CycleStatus; progress: number };
  size?: "sm" | "lg";
  className?: string;
}) {
  const { status, progress } = derived;
  const pct = Math.round(progress * 100);
  const never = status === "never";

  return (
    <div
      role="img"
      aria-label={never ? "Ciclo ainda não iniciado" : `${pct}% do período já passou`}
      className={cn("flex items-center gap-1", className)}
    >
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full",
          size === "sm" ? "h-1.5" : "h-2",
          never
            ? "bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_4px,transparent_4px_8px)]"
            : "bg-surface-muted",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-(--motion-slow) ease-(--ease-out)",
            fill[status],
          )}
          style={{ width: `${never ? 0 : Math.max(pct, 3)}%` }}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full border-[1.5px]",
          size === "sm" ? "size-2" : "size-2.5",
          status === "overdue" ? "border-danger bg-danger" : "border-border-strong",
          status === "soon" && "border-warning",
        )}
      />
    </div>
  );
}
