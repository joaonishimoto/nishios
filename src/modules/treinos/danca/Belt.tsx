import { cn } from "@/lib/cn";
import { LEVEL_META, levelIndex } from "./levels";
import { LEVEL_ORDER, type DanceLevel } from "./types";

/** A faixa desenhada: um retângulo na cor do nível. "Não aprendi" fica vazada. */
export function BeltSwatch({ level, className }: { level: DanceLevel; className?: string }) {
  const meta = LEVEL_META[level];
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-6 shrink-0 rounded-[3px] border", level === "nao" && "border-dashed", className)}
      style={{ background: meta.color, borderColor: meta.border }}
    />
  );
}

/** Faixa com o nome, para listas e cabeçalhos. */
export function BeltLabel({ level, className }: { level: DanceLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", className)}>
      <BeltSwatch level={level} />
      <span className={level === "nao" ? "text-muted-foreground" : "font-medium"}>{LEVEL_META[level].label}</span>
    </span>
  );
}

/** As sete faixas em fila, preenchidas até o nível atual: mostra o caminho que falta. */
export function BeltTrack({ level, className }: { level: DanceLevel; className?: string }) {
  const at = levelIndex(level);
  return (
    <span
      role="img"
      aria-label={`Faixa ${LEVEL_META[level].label}, ${at} de ${LEVEL_ORDER.length - 1}`}
      className={cn("inline-flex gap-0.5", className)}
    >
      {LEVEL_ORDER.slice(1).map((l, i) => (
        <span
          key={l}
          className="h-1.5 w-3 rounded-[2px] border"
          style={
            i < at
              ? { background: LEVEL_META[l].color, borderColor: LEVEL_META[l].border }
              : { background: "transparent", borderColor: "var(--border)" }
          }
        />
      ))}
    </span>
  );
}
