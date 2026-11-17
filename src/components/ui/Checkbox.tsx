import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Check redondo, no estilo de status do ClickUp. Sempre precisa de um rótulo acessível. */
export function Checkbox({
  checked,
  onChange,
  label,
  size = "md",
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-(--motion-fast) disabled:opacity-40",
        size === "md" ? "size-[1.125rem]" : "size-6",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input-hover bg-surface text-transparent hover:border-primary hover:text-primary/50",
        className,
      )}
    >
      <Check className={size === "md" ? "size-3" : "size-4"} strokeWidth={3} />
    </button>
  );
}
