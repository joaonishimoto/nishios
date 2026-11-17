import type { FloorKind, Material, ViewMode } from "./types";

/**
 * Cores da cena 3D. O WebGL não lê variáveis CSS, então as cores ficam aqui, separadas
 * por vista e tema. A vista 3D usa cores de material de verdade (madeira, tecido, metal);
 * a planta segue a paleta do app (creme e Azul Nishi).
 */
export interface Palette {
  background: string;
  wall: string;
  wallTop: string;
  floor: Record<FloorKind, string>;
  focusFloor: string | null;
  material: Record<Material, string>;
  highlight: string;
  shadows: boolean;
  /** Material com luz e sombra (3D) ou chapado (planta). */
  shading: "standard" | "flat";
  hemisphere: number;
  sun: number;
}

const realMaterials: Record<Material, string> = {
  madeira: "#a8703f",
  branco: "#f7f5f0",
  tecido: "#5f8a72",
  escuro: "#2c3440",
  metal: "#c9ced4",
  planta: "#4f9a5b",
  vidro: "#bfe0ea",
  tapete: "#e9d9c3",
  pedra: "#ded9d0",
};

const planMaterials: Record<Material, string> = {
  madeira: "#e3ded0",
  branco: "#fdfcfa",
  tecido: "#c3d2e5",
  escuro: "#59606b",
  metal: "#d7dbe0",
  planta: "#8fb89a",
  vidro: "#dfe7f1",
  tapete: "#f2efe6",
  pedra: "#b8af9b",
};

const PALETTES: Record<ViewMode, Record<"light" | "dark", Palette>> = {
  "3d": {
    light: {
      background: "#eef1ec",
      wall: "#f6f1e7",
      wallTop: "#e0d8c8",
      floor: { madeira: "#d9b78e", piso: "#e8e2d6", grama: "#a9c99a" },
      focusFloor: null,
      material: realMaterials,
      highlight: "#1e3d66",
      shadows: true,
      shading: "standard",
      hemisphere: 1.5,
      sun: 2.2,
    },
    dark: {
      background: "#15191c",
      wall: "#d8d2c6",
      wallTop: "#b9b1a2",
      floor: { madeira: "#b8946c", piso: "#c9c3b7", grama: "#7fa274" },
      focusFloor: null,
      material: realMaterials,
      highlight: "#9bb5da",
      shadows: true,
      shading: "standard",
      hemisphere: 1.1,
      sun: 1.8,
    },
  },
  planta: {
    light: {
      background: "#faf9f5",
      wall: "#1e3d66",
      wallTop: "#1e3d66",
      floor: { madeira: "#ffffff", piso: "#ffffff", grama: "#dcebdc" },
      focusFloor: "#dfe7f1",
      material: planMaterials,
      highlight: "#1e3d66",
      shadows: true,
      shading: "flat",
      hemisphere: 1.9,
      sun: 1.6,
    },
    dark: {
      background: "#111418",
      wall: "#9bb5da",
      wallTop: "#9bb5da",
      floor: { madeira: "#1d2127", piso: "#1d2127", grama: "#1f3326" },
      focusFloor: "#213350",
      material: {
        madeira: "#3a3f47",
        branco: "#4a505a",
        tecido: "#2f4a6e",
        escuro: "#8b9099",
        metal: "#555c66",
        planta: "#3f6b4c",
        vidro: "#2a3a52",
        tapete: "#2a2f37",
        pedra: "#5c6370",
      },
      highlight: "#9bb5da",
      shadows: true,
      shading: "flat",
      hemisphere: 1.6,
      sun: 1.0,
    },
  },
};

export function paletteFor(mode: ViewMode, dark: boolean): Palette {
  return PALETTES[mode][dark ? "dark" : "light"];
}
