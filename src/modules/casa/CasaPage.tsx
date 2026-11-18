import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, Lightbulb, Link2, Ruler, Sofa, Unlink } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";
import { money, plural } from "@/lib/format";
import { AssetForm } from "@/modules/bens/AssetForm";
import { warranty } from "@/modules/bens/logic";
import { useBens } from "@/modules/bens/store";
import type { Asset, Wish } from "@/modules/bens/types";
import { LinkAssetDialog } from "./LinkAssetDialog";
import { indoorArea, roomSize, suggestions, summarize } from "./logic";
import { PROPOSALS, withProposal, type Proposal } from "./proposals";
import { useCasa } from "./store";
import type { Home, Piece, Room, ViewMode } from "./types";
import { WALL_DEFAULT, WALL_MIN, WALL_REAL } from "./walls";
import { estimate, inWishes, wishesFor } from "./wishes";

// O three.js só é baixado quando a página Casa abre.
const HouseScene = lazy(() => import("./HouseScene"));

const WALL_KEY = "nishios:casa:paredes";

function readWallHeight(): number {
  try {
    const v = Number(localStorage.getItem(WALL_KEY));
    if (v >= WALL_MIN && v <= WALL_REAL) return v;
  } catch {
    // Sem localStorage, começa na altura padrão.
  }
  return WALL_DEFAULT;
}

const area = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const WARRANTY_TONE: Record<string, Tone> = { active: "success", ending: "warning", expired: "neutral" };

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function CasaPage() {
  const { home: real, linkPiece } = useCasa();
  const { assets, updateAsset, wishes, restoreWish, removeWish } = useBens();
  const toast = useToast();
  const dark = useIsDark();
  const [params, setParams] = useSearchParams();
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [linking, setLinking] = useState<Piece | null>(null);
  const [creating, setCreating] = useState<Piece | null>(null);

  const mode: ViewMode =
    params.get("vista") === "planta" || (params.get("vista") !== "3d" && window.innerWidth < 768)
      ? "planta"
      : "3d";
  // Uma proposta de móveis é só para ver: troca a área externa e os móveis, sem mexer na casa salva.
  const proposal = PROPOSALS.find((p) => p.id === params.get("proposta")) ?? null;
  const home = useMemo(() => withProposal(real, proposal), [real, proposal]);
  const focus = home.rooms.find((r) => r.id === params.get("comodo")) ?? null;
  const dims = params.get("cotas") === "1";
  // Altura das paredes no 3D: fica guardada neste navegador.
  const [wallHeight, setWallHeight] = useState(readWallHeight);
  const changeWallHeight = (v: number) => {
    setWallHeight(v);
    try {
      localStorage.setItem(WALL_KEY, String(v));
    } catch {
      // Sem localStorage, a altura vale só até recarregar.
    }
  };

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const focusRoom = (id: string | null) => {
    setSelectedPieceId(null);
    setParam("comodo", id);
  };

  const whole = useMemo(() => summarize(home, assets), [home, assets]);
  const chips = home.rooms.filter((r) => r.id !== "circ");

  // Ligar um móvel a um bem também atualiza o "Onde fica" do bem.
  const link = (piece: Piece, asset: Asset) => {
    linkPiece(piece.id, asset.id);
    const room = home.rooms.find((r) => r.id === piece.roomId);
    if (room && asset.location !== room.name) {
      const { id, ...draft } = asset;
      updateAsset(id, { ...draft, location: room.name });
    }
    setLinking(null);
    toast({ message: `${piece.name} agora é ${asset.name} nos seus bens` });
  };

  // Móveis da proposta viram desejos em Bens, com desfazer.
  const addWishes = (pieces: Piece[]) => {
    if (!proposal) return;
    const roomName = (id: string) => home.rooms.find((r) => r.id === id)?.name ?? "";
    const fresh: Wish[] = wishesFor(proposal, pieces, roomName, wishes);
    if (fresh.length === 0) {
      toast({ message: "Já está na sua lista de desejos" });
      return;
    }
    fresh.forEach(restoreWish);
    toast({
      message:
        fresh.length === 1
          ? `${fresh[0].name} foi para a lista de desejos`
          : `${fresh.length} desejos novos em Bens, somando ${money(fresh.reduce((s, w) => s + w.price, 0))}`,
      action: { label: "Desfazer", onClick: () => fresh.forEach((w) => removeWish(w.id)) },
    });
  };

  const unlink = (piece: Piece) => {
    const previous = piece.assetId;
    linkPiece(piece.id, null);
    toast({
      message: `${piece.name} ficou só na planta`,
      action: previous ? { label: "Desfazer", onClick: () => linkPiece(piece.id, previous) } : undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Casa"
        description={`${home.name} térreo com ${area.format(indoorArea(home))} m² de área interna, ${plural(whole.pieces.length, "móvel", "móveis")} e ${money(whole.value)} em bens ligados à planta.`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Segmented<string>
              label="Móveis"
              value={proposal?.id ?? "vazia"}
              onChange={(v) => {
                setSelectedPieceId(null);
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    if (v === "vazia") next.delete("proposta");
                    else next.set("proposta", v);
                    // O cômodo pode não existir na outra proposta (a área externa muda).
                    next.delete("comodo");
                    return next;
                  },
                  { replace: true },
                );
              }}
              options={[
                { value: "vazia", label: "Vazia" },
                ...PROPOSALS.map((p) => ({ value: p.id, label: p.id.toUpperCase() })),
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              aria-pressed={dims}
              onClick={() => setParam("cotas", dims ? null : "1")}
              className={cn("h-8", dims && "border-primary text-primary hover:border-primary hover:text-primary")}
            >
              <Ruler />
              Cotas
            </Button>
            <Segmented<ViewMode>
              label="Vista"
              value={mode}
              onChange={(v) => setParam("vista", v)}
              options={[
                { value: "3d", label: "3D" },
                { value: "planta", label: "Planta" },
              ]}
            />
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Cômodos">
        <RoomChip active={!focus} onClick={() => focusRoom(null)}>
          {focus && <ArrowLeft className="size-3.5" />}
          Casa inteira
        </RoomChip>
        {chips.map((r) => (
          <RoomChip key={r.id} active={focus?.id === r.id} onClick={() => focusRoom(r.id)}>
            {r.name}
          </RoomChip>
        ))}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative h-[56vh] min-h-[340px] overflow-hidden rounded-lg border border-border bg-surface lg:h-[min(70vh,680px)]">
          <Suspense
            fallback={
              <p className="grid size-full place-items-center text-muted-foreground">Montando a casa…</p>
            }
          >
            <HouseScene
              className="size-full"
              home={home}
              mode={mode}
              dark={dark}
              focusId={focus?.id ?? null}
              selectedPieceId={selectedPieceId}
              dims={dims}
              wallHeight={wallHeight}
              onPickRoom={(id) => focusRoom(id)}
              onPickPiece={(id) => setSelectedPieceId((cur) => (cur === id ? null : id))}
            />
          </Suspense>
          {mode === "3d" && !focus && (
            <label className="absolute right-3 top-3 flex items-center gap-2 rounded-md bg-surface/90 px-2 py-1 text-xs text-muted-foreground">
              Paredes
              <input
                type="range"
                min={WALL_MIN}
                max={WALL_REAL}
                step={0.05}
                value={wallHeight}
                onChange={(e) => changeWallHeight(Number(e.target.value))}
                className="w-28 accent-primary"
                aria-label="Altura das paredes"
              />
              <span className="w-12 tabular-nums text-foreground">{wallHeight.toFixed(2).replace(".", ",")} m</span>
            </label>
          )}
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-surface/90 px-2 py-1 text-xs text-muted-foreground">
            {focus
              ? "Clique em um móvel para ver o bem ligado a ele."
              : mode === "3d"
                ? "Arraste para girar, role para aproximar. Clique em um cômodo para ver de perto."
                : "Arraste para mover, role para aproximar. Clique em um cômodo para ver de perto."}
          </p>
        </div>

        <aside className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface lg:max-h-[min(70vh,680px)]">
          {focus ? (
            <RoomPanel
              room={focus}
              assets={assets}
              selectedPieceId={selectedPieceId}
              onSelectPiece={(id) => setSelectedPieceId((cur) => (cur === id ? null : id))}
              home={home}
              proposal={proposal}
              isWished={(piece) => !!proposal && inWishes(proposal, piece, wishes)}
              onWish={(piece) => addWishes([piece])}
              onLink={setLinking}
              onUnlink={unlink}
            />
          ) : (
            <HomePanel
              home={home}
              proposal={proposal}
              onPickRoom={focusRoom}
              onWishAll={() => addWishes(home.pieces)}
            />
          )}
        </aside>
      </div>

      <LinkAssetDialog
        piece={linking}
        home={home}
        assets={assets}
        onOpenChange={(open) => !open && setLinking(null)}
        onPick={(asset) => linking && link(linking, asset)}
        onCreateNew={() => {
          setCreating(linking);
          setLinking(null);
        }}
      />
      <AssetForm
        open={!!creating}
        onOpenChange={(open) => !open && setCreating(null)}
        initial={
          creating
            ? {
                name: creating.name,
                icon: creating.icon,
                category: creating.category,
                location: home.rooms.find((r) => r.id === creating.roomId)?.name ?? "",
              }
            : undefined
        }
        onCreated={(asset) => creating && linkPiece(creating.id, asset.id)}
      />
    </>
  );
}

function RoomChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-sm transition-colors duration-(--motion-fast)",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-surface-muted px-2.5 py-2">
      <p className="font-semibold whitespace-nowrap tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function HomePanel({
  home,
  proposal,
  onPickRoom,
  onWishAll,
}: {
  home: Home;
  proposal: Proposal | null;
  onPickRoom: (id: string) => void;
  onWishAll: () => void;
}) {
  const { assets } = useBens();
  const whole = summarize(home, assets);
  const rooms = home.rooms.filter((r) => r.id !== "circ");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-border p-4">
        <h2 className="text-xl font-semibold tracking-tight">{home.name}</h2>
        <p className="text-sm text-muted-foreground">
          {area.format(indoorArea(home))} m² de área interna, mais a área externa.
        </p>
        <div className="mt-3 grid grid-cols-[1fr_1.45fr_1fr] gap-2">
          <Stat value={String(rooms.length)} label="ambientes" />
          <Stat value={String(whole.pieces.length)} label="móveis" />
          <Stat value={money(Math.round(whole.value))} label="em bens" />
        </div>
      </div>
      {proposal && (
        <div className="border-b border-border p-4">
          <h3 className="flex items-center gap-1.5 font-medium">
            <Sofa className="size-4 text-primary" />
            Proposta {proposal.id.toUpperCase()}: {proposal.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{proposal.tagline}</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
            {proposal.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="mt-3" onClick={onWishAll}>
            <Heart />
            Levar os móveis para os desejos
          </Button>
        </div>
      )}
      <ul className="p-2 lg:flex-1 lg:overflow-y-auto">
        {rooms.map((room) => {
          const s = summarize(home, assets, room);
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onPickRoom(room.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{room.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {plural(s.pieces.length, "móvel", "móveis")}
                    {s.linked.length > 0 && `, ${s.linked.length} em Bens`}
                  </span>
                </span>
                {s.value > 0 && <span className="text-sm font-medium tabular-nums">{money(s.value)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoomPanel({
  room,
  assets,
  selectedPieceId,
  onSelectPiece,
  home,
  proposal,
  isWished,
  onWish,
  onLink,
  onUnlink,
}: {
  room: Room;
  assets: Asset[];
  selectedPieceId: string | null;
  onSelectPiece: (id: string) => void;
  home: Home;
  proposal: Proposal | null;
  isWished: (piece: Piece) => boolean;
  onWish: (piece: Piece) => void;
  onLink: (piece: Piece) => void;
  onUnlink: (piece: Piece) => void;
}) {
  const s = summarize(home, assets, room);
  const tips = proposal ? (proposal.notes[room.id] ?? []) : suggestions(room, s);
  const assetOf = (piece: Piece) => s.linked.find((l) => l.piece.id === piece.id)?.asset;

  return (
    <>
      <div className="border-b border-border p-4">
        <h2 className="text-xl font-semibold tracking-tight">{room.name}</h2>
        <p className="text-sm text-muted-foreground">{roomSize(room)}</p>
        <div className="mt-3 grid grid-cols-[1fr_1.45fr_1fr] gap-2">
          <Stat value={String(s.pieces.length)} label="móveis" />
          <Stat value={money(Math.round(s.value))} label="em bens" />
          <Stat value={String(s.activeWarranties)} label={s.activeWarranties === 1 ? "garantia" : "garantias"} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {s.pieces.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">Nenhum móvel neste cômodo ainda.</p>
        ) : (
          <ul className="p-2">
            {s.pieces.map((piece) => {
              const asset = assetOf(piece);
              const w = asset ? warranty(asset) : null;
              const selected = piece.id === selectedPieceId;
              return (
                <li key={piece.id} className={cn("rounded-md", selected && "bg-surface-selected")}>
                  <button
                    type="button"
                    onClick={() => onSelectPiece(piece.id)}
                    aria-expanded={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-(--motion-fast)",
                      !selected && "hover:bg-surface-hover",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-base">
                      {asset?.icon ?? piece.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{piece.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {proposal
                          ? isWished(piece)
                            ? "Na lista de desejos"
                            : estimate(piece.name) > 0
                              ? `Cerca de ${money(estimate(piece.name))}`
                              : "Da proposta"
                          : asset
                            ? asset.name === piece.name
                              ? "Em Bens"
                              : `Em Bens como ${asset.name}`
                            : "Só na planta"}
                      </span>
                    </span>
                    {asset && <span className="text-sm font-medium tabular-nums">{money(asset.value)}</span>}
                  </button>
                  {selected && proposal && (
                    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2.5 pl-13">
                      {isWished(piece) ? (
                        <Link
                          to="/bens?aba=desejos"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          <Check className="size-4" />
                          Na lista de desejos
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onWish(piece)}>
                          <Heart />
                          Adicionar aos desejos
                        </Button>
                      )}
                    </div>
                  )}
                  {selected && !proposal && (
                    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2.5 pl-13">
                      {w && <Badge tone={WARRANTY_TONE[w.state]}>Garantia: {w.label.toLowerCase()}</Badge>}
                      {asset ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => onLink(piece)}>
                            <Link2 />
                            Trocar bem
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onUnlink(piece)}>
                            <Unlink />
                            Desligar
                          </Button>
                          <Link
                            to="/bens"
                            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Ver em Bens
                          </Link>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onLink(piece)}>
                          <Link2 />
                          Ligar a um bem
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {s.outsidePlan.length > 0 && !proposal && (
          <div className="border-t border-border px-4 py-3">
            <h3 className="text-sm font-medium">Em Bens, mas fora da planta</h3>
            <p className="text-sm text-muted-foreground">
              {s.outsidePlan.map((a) => a.name).join(", ")}. Estão marcados como "{room.name}" em Bens, mas
              não têm um móvel na planta.
            </p>
          </div>
        )}

        {tips.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Lightbulb className="size-4 text-warning" />
              {proposal ? `Por que assim (proposta ${proposal.id.toUpperCase()})` : "Sugestões"}
            </h3>
            {tips.map((tip) => (
              <p key={tip} className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                {tip}
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
