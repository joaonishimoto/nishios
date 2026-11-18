export interface Asset {
  id: string;
  name: string;
  icon: string;
  category: string;
  /** Quanto custou, em reais. */
  value: number;
  /** Data da compra em yyyy-MM-dd; vazio quando não se sabe. */
  purchaseDate: string;
  /** Fim da garantia em yyyy-MM-dd; vazio quando não tem. */
  warrantyUntil: string;
  /** Onde fica: cômodo, garagem, mochila... */
  location: string;
  /** Marca do produto; vazio ou ausente quando não se sabe. */
  brand?: string;
  /** Onde comprou: Amazon, Mercado Livre, uma loja física... */
  store?: string;
  notes: string;
}

export type AssetDraft = Omit<Asset, "id">;

export type WishPriority = "high" | "medium" | "low";

export interface Wish {
  id: string;
  name: string;
  icon: string;
  /** Preço estimado, em reais. */
  price: number;
  priority: WishPriority;
  /** Quando pretende comprar (yyyy-MM-dd); vazio quando não tem data. */
  targetDate: string;
  link: string;
  notes: string;
}

export type WishDraft = Omit<Wish, "id">;

export const ASSET_CATEGORIES = [
  "Eletrônicos",
  "Eletrodomésticos",
  "Móveis",
  "Veículos",
  "Esporte e lazer",
  "Outros",
];

export const ASSET_ICONS = [
  "💻", "📱", "🖥️", "⌚", "🎧", "📷", "🎮", "📺",
  "🧊", "🧺", "🍳", "☕", "🛋️", "🛏️", "🪑", "💡",
  "🚗", "🏍️", "🚲", "🥊", "🏋️", "🎸", "📖", "✈️",
  "🏠", "📦", "👟", "🧳", "⌨️", "🖨️", "🔧", "💍",
];
