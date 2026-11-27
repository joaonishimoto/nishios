import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/cn";

/**
 * Grade e card de patrimônio, iguais em Veículos e Imóveis: mesma largura, mesma altura de
 * imagem, mesmas linhas (título, subtítulo, etiquetas, três números, parcelas e rodapé).
 * Cada card é uma "vaga" com a faixa tracejada embaixo da imagem.
 */
export function AssetGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </ul>
  );
}

export interface AssetStat {
  label: string;
  value: string;
  tone?: "up" | "down" | "muted";
}

export interface AssetProgress {
  /** 0 a 1. */
  value: number;
  /** "Parcelas" */
  title: string;
  /** "12 de 48 pagas" */
  left: string;
  /** "36 faltam" */
  right?: string;
  ariaLabel: string;
}

export interface AssetFooter {
  icon: LucideIcon;
  text: ReactNode;
  tone?: "warning" | "muted";
}

const SHELL =
  "flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-[linear-gradient(to_bottom,var(--color-surface)_0%,var(--color-surface-muted)_100%)] text-left transition-colors duration-(--motion-fast) hover:border-border-strong hover:bg-surface-hover/60 focus-visible:border-border-strong focus-visible:outline-none";

/** Botão no canto da imagem (Editar, Ver 3D). Fica fora do link do card, para não abrir os detalhes. */
export interface AssetAction {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  to?: string;
}

const ACTION =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface/90 px-2 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-sm transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-foreground [&_svg]:size-3.5";

export function AssetCard({
  actions,
  to,
  onClick,
  picture,
  title,
  titleExtra,
  subtitle,
  chips,
  stats,
  progress,
  footer,
}: {
  to?: string;
  onClick?: () => void;
  picture: ReactNode;
  title: string;
  titleExtra?: ReactNode;
  subtitle: string;
  chips?: ReactNode;
  stats: AssetStat[];
  progress?: AssetProgress | null;
  footer: AssetFooter;
  actions?: AssetAction[];
}) {
  const body = (
    <>
      <div className="relative flex h-44 items-end justify-center border-b border-dashed border-border-strong px-6 pt-11 pb-3">
        {picture}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{title}</span>
            {titleExtra}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex min-h-5.5 flex-wrap gap-1.5">{chips}</div>

        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted/60 px-3 py-2.5">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
              <dd
                className={cn(
                  "mt-0.5 truncate text-sm font-semibold tabular-nums",
                  s.tone === "up" && "text-success-strong",
                  s.tone === "down" && "text-danger-strong",
                  s.tone === "muted" && "font-normal text-subtle-foreground",
                )}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Reserva o espaço da barra mesmo sem parcelas, para os cards ficarem alinhados. */}
        <div className="min-h-9">
          {progress && (
            <>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {progress.title} <span className="font-medium text-foreground tabular-nums">{progress.left}</span>
                </span>
                {progress.right && <span className="text-muted-foreground tabular-nums">{progress.right}</span>}
              </div>
              <Progress value={progress.value} label={progress.ariaLabel} className="mt-1.5 h-1.5 w-full bg-border" />
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 border-t border-border px-4 py-2.5 text-sm",
          footer.tone === "warning" ? "text-warning-strong" : "text-muted-foreground",
        )}
      >
        <footer.icon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{footer.text}</span>
      </div>
    </>
  );

  return (
    <li className="relative min-w-0">
      {to ? (
        <Link to={to} className={SHELL}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={SHELL}>
          {body}
        </button>
      )}
      {actions && actions.length > 0 && (
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          {actions.map((a) =>
            a.to ? (
              <Link key={a.label} to={a.to} className={ACTION}>
                <a.icon />
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={ACTION}>
                <a.icon />
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
    </li>
  );
}

/** A vaga livre: mesmo tamanho dos cards, com borda tracejada. */
export function AssetAddCard({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onClick}
        className="group flex h-full min-h-40 w-full sm:min-h-76 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong px-5 py-6 text-center text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-hover/60 hover:text-foreground"
      >
        <span className="grid size-12 place-items-center rounded-full border border-dashed border-border-strong transition-transform duration-300 group-hover:scale-110">
          <Plus className="size-5" />
        </span>
        <span className="mt-2 font-medium">{title}</span>
        <span className="text-sm">{hint}</span>
      </button>
    </li>
  );
}
