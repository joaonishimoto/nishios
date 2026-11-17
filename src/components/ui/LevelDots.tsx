import { cn } from "@/lib/cn";

/**
 * Nível de 0 a `max` em bolinhas. Sem `onChange` é só leitura;
 * com `onChange` vira um seletor (clicar no nível atual volta um).
 */
export function LevelDots({
  value,
  max = 5,
  onChange,
  label = "Nível",
  className,
}: {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  label?: string;
  className?: string;
}) {
  const dots = Array.from({ length: max }, (_, i) => i + 1);

  if (!onChange) {
    return (
      <span role="img" aria-label={`${label} ${value} de ${max}`} className={cn("inline-flex gap-1", className)}>
        {dots.map((n) => (
          <span key={n} className={cn("size-1.5 rounded-full", n <= value ? "bg-primary" : "bg-border-strong")} />
        ))}
      </span>
    );
  }

  return (
    <div role="group" aria-label={label} className={cn("inline-flex gap-1", className)}>
      {dots.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label} ${n} de ${max}`}
          aria-pressed={n === value}
          onClick={() => onChange(n === value ? n - 1 : n)}
          className="group flex size-7 items-center justify-center rounded-sm hover:bg-surface-hover"
        >
          <span
            className={cn(
              "size-3.5 rounded-full border-[1.5px] transition-colors duration-(--motion-fast)",
              n <= value ? "border-primary bg-primary" : "border-border-strong group-hover:border-primary",
            )}
          />
        </button>
      ))}
    </div>
  );
}
