import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedAssets, seedWishes } from "./seed";
import type { Asset, AssetDraft, Wish, WishDraft } from "./types";

const ASSETS_KEY = "nishios:bens:v1";
const WISHES_KEY = "nishios:desejos:v1";

interface Store {
  assets: Asset[];
  wishes: Wish[];
  createAsset: (draft: AssetDraft) => Asset;
  updateAsset: (id: string, draft: AssetDraft) => void;
  removeAsset: (id: string) => void;
  restoreAsset: (asset: Asset) => void;
  createWish: (draft: WishDraft) => void;
  updateWish: (id: string, draft: WishDraft) => void;
  removeWish: (id: string) => void;
  restoreWish: (wish: Wish) => void;
  /** Tira o desejo da lista e o registra como bem. Devolve o bem criado. */
  buyWish: (wish: Wish, purchase: Pick<Asset, "value" | "purchaseDate" | "category">) => Asset;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function BensProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = usePersistentState<Asset[]>(ASSETS_KEY, seedAssets);
  const [wishes, setWishes] = usePersistentState<Wish[]>(WISHES_KEY, seedWishes);

  const store = useMemo<Store>(() => {
    const createAsset = (draft: AssetDraft) => {
      const asset = { ...draft, id: crypto.randomUUID() };
      setAssets((list) => [...list, asset]);
      return asset;
    };
    const removeWish = (id: string) => setWishes((list) => list.filter((w) => w.id !== id));

    return {
      assets,
      wishes,
      createAsset,
      updateAsset(id, draft) {
        setAssets((list) => list.map((a) => (a.id === id ? { ...a, ...draft } : a)));
      },
      removeAsset(id) {
        setAssets((list) => list.filter((a) => a.id !== id));
      },
      restoreAsset(asset) {
        setAssets((list) => (list.some((a) => a.id === asset.id) ? list : [...list, asset]));
      },
      createWish(draft) {
        setWishes((list) => [...list, { ...draft, id: crypto.randomUUID() }]);
      },
      updateWish(id, draft) {
        setWishes((list) => list.map((w) => (w.id === id ? { ...w, ...draft } : w)));
      },
      removeWish,
      restoreWish(wish) {
        setWishes((list) => (list.some((w) => w.id === wish.id) ? list : [...list, wish]));
      },
      buyWish(wish, purchase) {
        removeWish(wish.id);
        return createAsset({
          name: wish.name,
          icon: wish.icon,
          notes: wish.notes,
          warrantyUntil: "",
          location: "",
          ...purchase,
        });
      },
      resetToExample() {
        setAssets(seedAssets());
        setWishes(seedWishes());
      },
    };
  }, [assets, wishes, setAssets, setWishes]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useBens(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useBens precisa estar dentro de BensProvider");
  return store;
}
