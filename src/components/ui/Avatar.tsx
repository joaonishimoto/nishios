import { cn } from "@/lib/cn";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}

/** Círculo com as iniciais da pessoa. */
export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground",
        size === "md" ? "size-8 text-xs" : "size-14 text-lg",
      )}
    >
      {initials(name)}
    </span>
  );
}
