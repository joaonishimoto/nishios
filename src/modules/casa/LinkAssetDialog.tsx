import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { NoResults } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { byValue } from "@/modules/bens/logic";
import type { Asset } from "@/modules/bens/types";
import type { Home, Piece } from "./types";

/** Escolhe o bem que um móvel da planta representa, ou pede para criar um novo. */
export function LinkAssetDialog({
  piece,
  home,
  assets,
  onOpenChange,
  onPick,
  onCreateNew,
}: {
  piece: Piece | null;
  home: Home;
  assets: Asset[];
  onOpenChange: (open: boolean) => void;
  onPick: (asset: Asset) => void;
  onCreateNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const usedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of home.pieces) if (p.assetId) map.set(p.assetId, p.name);
    return map;
  }, [home]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return [...assets]
      .filter((a) => !q || a.name.toLocaleLowerCase("pt-BR").includes(q))
      .sort(byValue);
  }, [assets, query]);

  return (
    <Dialog
      open={!!piece}
      onOpenChange={(open) => {
        if (!open) setQuery("");
        onOpenChange(open);
      }}
      title="Ligar a um bem"
      description={piece ? `Qual dos seus bens é "${piece.name}"? O valor e a garantia passam a aparecer na Casa.` : undefined}
    >
      <DialogBody className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nos seus bens"
            className="pl-8"
            autoFocus
          />
        </div>
        <ul className="-mx-2 flex flex-col">
          {visible.map((a) => {
            const current = piece?.assetId === a.id;
            const elsewhere = !current ? usedBy.get(a.id) : undefined;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onPick(a)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover",
                    current && "bg-surface-selected",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-base">
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {elsewhere ? `Hoje ligado a ${elsewhere}` : a.location || a.category}
                    </span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{money(a.value)}</span>
                  {current && <Check className="size-4 text-primary" />}
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li>
              <NoResults size="sm" query={query} onClear={query ? () => setQuery("") : undefined} />
            </li>
          )}
        </ul>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onCreateNew}>
          <Plus />
          Criar bem novo
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
