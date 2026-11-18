import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedHome } from "./seed";
import type { Home } from "./types";

// v10: sem o shaft ao lado do chuveiro do banheiro.
const KEY = "nishios:casa:v10";

interface Store {
  home: Home;
  /** Liga (ou desliga, com `null`) um móvel da planta a um bem. */
  linkPiece: (pieceId: string, assetId: string | null) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export function CasaProvider({ children }: { children: ReactNode }) {
  const [home, setHome] = usePersistentState<Home>(KEY, seedHome);

  const store = useMemo<Store>(
    () => ({
      home,
      linkPiece(pieceId, assetId) {
        setHome((h) => ({
          ...h,
          pieces: h.pieces.map((p) => {
            if (p.id === pieceId) return { ...p, assetId: assetId ?? undefined };
            // Um bem fica em um móvel só.
            if (assetId && p.assetId === assetId) return { ...p, assetId: undefined };
            return p;
          }),
        }));
      },
      resetToExample() {
        setHome(seedHome());
      },
    }),
    [home, setHome],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCasa(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useCasa precisa estar dentro de CasaProvider");
  return store;
}
