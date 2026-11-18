import { derive, dueLabel } from "@/modules/compromissos/logic";
import { useCommitments } from "@/modules/compromissos/store";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Gift, Package, Plus, Search, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, NoResults } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { shortDate, toISO, today } from "@/lib/dates";
import { money, plural } from "@/lib/format";
import { AssetForm } from "./AssetForm";
import { byValue, byWishPriority, PRIORITY_META, total, warranty } from "./logic";
import { useBens } from "./store";
import { ASSET_CATEGORIES, type Asset, type Wish } from "./types";
import { WishForm } from "./WishForm";

type Tab = "bens" | "desejos";
type GroupBy = "category" | "brand" | "store" | "none";
type SortBy = "value" | "recent" | "oldest";

const GROUP_BY: { value: GroupBy; label: string; empty: string }[] = [
  { value: "category", label: "Por categoria", empty: "Sem categoria" },
  { value: "brand", label: "Por marca", empty: "Sem marca" },
  { value: "store", label: "Por loja", empty: "Sem loja" },
  { value: "none", label: "Sem grupos", empty: "Todos os bens" },
];

const SORT_BY: { value: SortBy; label: string }[] = [
  { value: "value", label: "Mais caros" },
  { value: "recent", label: "Compra mais recente" },
  { value: "oldest", label: "Compra mais antiga" },
];

/** Por data da compra; os bens sem data ficam no fim, do mais caro ao mais barato. */
function sorter(by: SortBy): (a: Asset, b: Asset) => number {
  if (by === "value") return byValue;
  const dir = by === "recent" ? -1 : 1;
  return (a, b) => {
    if (!a.purchaseDate || !b.purchaseDate) return Number(!a.purchaseDate) - Number(!b.purchaseDate) || byValue(a, b);
    return dir * a.purchaseDate.localeCompare(b.purchaseDate) || byValue(a, b);
  };
}

function groupKey(a: Asset, by: GroupBy): string {
  if (by === "none") return "";
  const v = by === "category" ? a.category : by === "brand" ? a.brand : a.store;
  return v?.trim() ?? "";
}

const ASSET_GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_8rem_10rem_7.5rem] md:items-center md:gap-x-5";

export function BensPage() {
  const { assets, wishes } = useBens();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("aba") === "desejos" ? "desejos" : "bens";
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [sortBy, setSortBy] = useState<SortBy>("value");
  const [assetForm, setAssetForm] = useState<{ open: boolean; asset?: Asset }>({ open: false });
  const [wishForm, setWishForm] = useState<{ open: boolean; wish?: Wish }>({ open: false });

  const categories = useMemo(() => {
    const present = new Set(assets.map((a) => a.category));
    const known = ASSET_CATEGORIES.filter((c) => present.has(c));
    const extra = [...present].filter((c) => !ASSET_CATEGORIES.includes(c)).sort();
    return [...known, ...extra];
  }, [assets]);

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const visible = assets
      .filter((a) => category === "all" || a.category === category)
      .filter((a) => !q || [a.name, a.brand, a.store].some((t) => t?.toLocaleLowerCase("pt-BR").includes(q)));
    // Por categoria segue a ordem das categorias; por marca ou loja, a de maior valor primeiro.
    const keys =
      groupBy === "category"
        ? categories
        : [...new Set(visible.map((a) => groupKey(a, groupBy)))];
    const empty = GROUP_BY.find((g) => g.value === groupBy)!.empty;
    const list = keys
      .map((k) => ({
        category: k || empty,
        unnamed: !k,
        items: visible.filter((a) => groupKey(a, groupBy) === k).sort(sorter(sortBy)),
      }))
      .filter((g) => g.items.length > 0);
    if (groupBy === "brand" || groupBy === "store") {
      list.sort((x, y) => Number(x.unnamed) - Number(y.unnamed) || total(y.items) - total(x.items) || x.category.localeCompare(y.category, "pt-BR"));
    }
    return list;
  }, [assets, categories, category, query, groupBy, sortBy]);

  const sortedWishes = useMemo(() => [...wishes].sort(byWishPriority), [wishes]);
  const wishTotal = wishes.reduce((sum, w) => sum + w.price, 0);
  const filtering = category !== "all" || query.trim() !== "";

  const openNew = () =>
    tab === "bens" ? setAssetForm({ open: true }) : setWishForm({ open: true });

  return (
    <>
      <PageHeader
        title="Bens e desejos"
        description={
          tab === "bens"
            ? assets.length === 0
              ? "O que você tem, quanto custou e até quando vai a garantia."
              : `${plural(assets.length, "bem", "bens")} somando ${money(total(assets))} em valor de compra.`
            : wishes.length === 0
              ? "O que você quer comprar, com preço e prioridade."
              : `${plural(wishes.length, "desejo", "desejos")} somando ${money(wishTotal)}.`
        }
        action={
          <Button onClick={openNew}>
            <Plus />
            {tab === "bens" ? "Novo bem" : "Novo desejo"}
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented<Tab>
          label="Bens ou lista de desejos"
          value={tab}
          onChange={(t) => setParams(t === "desejos" ? { aba: "desejos" } : {}, { replace: true })}
          options={[
            { value: "bens", label: "Meus bens", count: assets.length },
            { value: "desejos", label: "Lista de desejos", count: wishes.length },
          ]}
        />
        {tab === "bens" && (
          <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <Select
              aria-label="Agrupar bens"
              className="sm:w-36"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              {GROUP_BY.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Ordenar bens"
              className="sm:w-48"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              {SORT_BY.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por categoria"
              className="sm:w-48"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <div className="relative w-full sm:w-52">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
              />
              <Input
                type="search"
                aria-label="Buscar bem"
                placeholder="Buscar bens"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        {tab === "bens" ? (
          assets.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum bem cadastrado"
              description="Comece pelos mais caros: notebook, celular, geladeira, carro."
              action={
                <Button onClick={openNew}>
                  <Plus />
                  Novo bem
                </Button>
              }
            />
          ) : groups.length === 0 ? (
            <NoResults
              query={query}
              onClear={
                filtering
                  ? () => {
                      setCategory("all");
                      setQuery("");
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div
                aria-hidden
                className={cn(
                  "hidden border-b border-border px-3 pb-2 text-sm text-muted-foreground",
                  ASSET_GRID,
                )}
              >
                <span>Bem</span>
                <span>Comprado em</span>
                <span>Garantia</span>
                <span className="text-right">Valor</span>
              </div>
              <div className="flex flex-col gap-5 pt-4">
                {groups.map(({ category: c, items }) => (
                  <section key={c}>
                    <h2 className="flex items-baseline gap-2 px-1 text-sm font-semibold">
                      {c}
                      <span className="font-normal text-subtle-foreground tabular-nums">
                        {items.length}
                      </span>
                      <span className="ml-auto pr-2 font-medium tabular-nums">
                        {money(total(items))}
                      </span>
                    </h2>
                    <ul className="mt-1.5 overflow-hidden rounded-lg border border-border bg-surface">
                      {items.map((a) => (
                        <AssetRow key={a.id} asset={a} onOpen={() => setAssetForm({ open: true, asset: a })} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )
        ) : wishes.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Lista de desejos vazia"
            description="Anote o que você quer comprar para decidir com calma, sem perder de vista."
            action={
              <Button onClick={openNew}>
                <Plus />
                Novo desejo
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {sortedWishes.map((w) => (
              <WishRow key={w.id} wish={w} onOpen={() => setWishForm({ open: true, wish: w })} />
            ))}
          </ul>
        )}
      </div>

      <AssetForm
        open={assetForm.open}
        asset={assetForm.asset}
        onOpenChange={(open) => setAssetForm((s) => ({ ...s, open }))}
      />
      <WishForm
        open={wishForm.open}
        wish={wishForm.wish}
        onOpenChange={(open) => setWishForm((s) => ({ ...s, open }))}
      />
    </>
  );
}

const row =
  "relative border-b border-border px-3 py-2.5 transition-colors duration-(--motion-fast) last:border-b-0 hover:bg-surface-hover";

function IconTile({ icon }: { icon: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg">
      {icon}
    </span>
  );
}

function AssetRow({ asset: a, onOpen }: { asset: Asset; onOpen: () => void }) {
  const w = warranty(a);
  const detail = [a.brand, a.store, a.location].filter(Boolean).join(" · ");
  // Manutenção ligada ao bem que já pede atenção aparece na própria linha.
  const due = useCommitments()
    .commitments.filter((c) => c.assetId === a.id)
    .map((c) => ({ c, d: derive(c) }))
    .find(({ d }) => d.status === "overdue" || d.status === "soon");
  const warrantyText = w ? (
    <span
      className={cn(
        "text-sm",
        w.state === "ending"
          ? "font-medium text-warning-strong"
          : w.state === "expired"
            ? "text-subtle-foreground"
            : "text-muted-foreground",
      )}
    >
      {w.label}
    </span>
  ) : null;

  return (
    <li className={cn(row, "flex flex-wrap items-center gap-x-3 gap-y-1", ASSET_GRID)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconTile icon={a.icon} />
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
          >
            {a.name}
          </button>
          <p className="truncate text-sm text-muted-foreground">
            {detail}
            {a.purchaseDate && (
              <span className="md:hidden">
                {detail ? " · " : ""}
                {shortDate(a.purchaseDate)}
              </span>
            )}
            {due && (
              <span className={due.d.status === "overdue" ? "text-danger-strong" : "text-warning-strong"}>
                {detail ? ", " : a.purchaseDate ? <span className="md:hidden">, </span> : ""}
                {due.c.name.toLowerCase()} {dueLabel(due.d).toLowerCase()}
              </span>
            )}
          </p>
        </div>
      </div>
      <span className="hidden text-sm text-muted-foreground md:block">
        {a.purchaseDate ? shortDate(a.purchaseDate) : "–"}
      </span>
      <span className="hidden md:block">
        {warrantyText ?? <span className="text-sm text-subtle-foreground">–</span>}
      </span>
      <span className="text-right font-medium tabular-nums">{money(a.value)}</span>
      {w && w.state !== "expired" && (
        <span className="basis-full pl-11 lowercase first-letter:uppercase md:hidden">
          <span className="text-sm text-muted-foreground">Garantia: </span>
          {warrantyText}
        </span>
      )}
    </li>
  );
}

function WishRow({ wish: w, onOpen }: { wish: Wish; onOpen: () => void }) {
  const meta = PRIORITY_META[w.priority];
  return (
    <li className={cn(row, "flex flex-wrap items-center gap-x-4 gap-y-2")}>
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-56">
        <IconTile icon={w.icon} />
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium after:absolute after:inset-0"
          >
            {w.name}
          </button>
          <p className="truncate text-sm text-muted-foreground">
            {w.targetDate ? `Comprar até ${shortDate(w.targetDate)}` : "Sem data"}
          </p>
        </div>
      </div>
      <Badge tone={meta.tone}>
        <span className="sm:hidden">{meta.label}</span>
        <span className="hidden sm:inline">Prioridade {meta.label.toLowerCase()}</span>
      </Badge>
      <span className="ml-auto text-right font-medium tabular-nums sm:ml-0 sm:w-24">{money(w.price)}</span>
      <div className="relative z-10 flex items-center gap-1">
        {w.link ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Abrir o link de ${w.name}`}
            onClick={() => window.open(w.link, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink />
          </Button>
        ) : (
          <span className="hidden w-7 sm:block" />
        )}
        <BuyWish wish={w} />
      </div>
    </li>
  );
}

/** "Comprei": registra a compra e move o desejo para os bens. */
function BuyWish({ wish }: { wish: Wish }) {
  const { buyWish, removeAsset, restoreWish } = useBens();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const max = toISO(today());
  const [date, setDate] = useState(max);
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const paid = Number(value);
    if (!date || Number.isNaN(paid) || paid < 0) return;
    const asset = buyWish(wish, { value: paid, purchaseDate: date, category });
    setOpen(false);
    toast({
      message: `${wish.name} agora está nos seus bens`,
      action: {
        label: "Desfazer",
        onClick: () => {
          removeAsset(asset.id);
          restoreWish(wish);
        },
      },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDate(max);
          setValue(String(wish.price));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <ShoppingBag />
          Comprei
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field label="Quanto pagou (R$)">
            {(id) => (
              <Input
                placeholder="0,00"
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={value}
                required
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </Field>
          <Field label="Quando comprou">
            {(id) => (
              <Input placeholder="Quando comprou" id={id} type="date" max={max} value={date} required onChange={(e) => setDate(e.target.value)} />
            )}
          </Field>
          <Field label="Categoria do bem">
            {(id) => (
              <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Mover para meus bens
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
