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
  /** Peitoril da janela na planta (o vão aparece claro, como no desenho). */
  windowSill: string;
  /** Fundo das cubas e assento do vaso, armário sob a pia e frisos. */
  basin: string;
  cabinet: string;
  seam: string;
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
  parede: "#fbfbf9",
  tela: "#9aa3a8",
  cobertura: "#dfe9ee",
};

const planMaterials: Record<Material, string> = {
  madeira: "#e3ded0",
  branco: "#e3e4e6",
  tecido: "#c3d2e5",
  escuro: "#59606b",
  metal: "#d7dbe0",
  planta: "#8fb89a",
  vidro: "#dfe7f1",
  tapete: "#f2efe6",
  pedra: "#d3ccba",
  parede: "#1e3d66",
  tela: "#8fa3bd",
  cobertura: "#c3d2e5",
};

const PALETTES: Record<ViewMode, Record<"light" | "dark", Palette>> = {
  "3d": {
    light: {
      background: "#eef1ec",
      wall: "#fbfbf9",
      wallTop: "#e2e2de",
      floor: { madeira: "#d9b78e", piso: "#e8e2d6", grama: "#a9c99a", deck: "#b98c5e", pedra: "#cfcac0", branco: "#f2f1ed" },
      focusFloor: null,
      material: realMaterials,
      highlight: "#1e3d66",
      windowSill: "#fbfbf9",
      basin: "#e4e6e8",
      cabinet: "#f3efe7",
      seam: "#9a958c",
      shadows: true,
      shading: "standard",
      hemisphere: 1.5,
      sun: 2.2,
    },
    dark: {
      background: "#15191c",
      wall: "#e2e2df",
      wallTop: "#c2c2bd",
      floor: { madeira: "#b8946c", piso: "#c9c3b7", grama: "#7fa274", deck: "#9c7650", pedra: "#b3aea4", branco: "#d4d3cf" },
      focusFloor: null,
      material: realMaterials,
      highlight: "#9bb5da",
      windowSill: "#e2e2df",
      basin: "#cfd2d6",
      cabinet: "#e6e0d4",
      seam: "#6f6a61",
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
      floor: { madeira: "#ffffff", piso: "#ffffff", grama: "#dcebdc", deck: "#efe4d2", pedra: "#ecebe6", branco: "#ffffff" },
      focusFloor: "#dfe7f1",
      material: planMaterials,
      highlight: "#1e3d66",
      windowSill: "#eef2f7",
      basin: "#cfd5dc",
      cabinet: "#ece8de",
      seam: "#b9b3a6",
      shadows: true,
      shading: "flat",
      hemisphere: 1.9,
      sun: 1.6,
    },
    dark: {
      background: "#111418",
      wall: "#9bb5da",
      wallTop: "#9bb5da",
      floor: { madeira: "#1d2127", piso: "#1d2127", grama: "#1f3326", deck: "#2e2a24", pedra: "#272a2e", branco: "#1d2127" },
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
        parede: "#9bb5da",
        tela: "#5f7088",
        cobertura: "#2f4a6e",
      },
      highlight: "#9bb5da",
      windowSill: "#2a3a52",
      basin: "#3a414b",
      cabinet: "#3a3f47",
      seam: "#2a2f37",
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
