import { cn } from "@/lib/cn";

/** Barra de progresso de 0 a 1. */
export function Progress({
  value,
  label,
  done,
  className,
}: {
  value: number;
  label: string;
  done?: boolean;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-(--motion-slow) ease-(--ease-out)",
          done ? "bg-success" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
