import { add, sub, type Duration } from "date-fns";
import { toISO, today } from "@/lib/dates";
import type { Asset, Wish } from "./types";

export function seedAssets(): Asset[] {
  const now = today();
  const ago = (d: Duration) => toISO(sub(now, d));
  const ahead = (d: Duration) => toISO(add(now, d));
  const base = { notes: "", warrantyUntil: "", location: "" };

  return [
    { ...base, id: "a1", name: "MacBook Air M3", icon: "💻", category: "Eletrônicos", value: 9499, purchaseDate: ago({ months: 8 }), warrantyUntil: ahead({ months: 4 }), location: "Escritório", notes: "Nota fiscal no e-mail, pasta Compras." },
    { ...base, id: "a2", name: "iPhone 15", icon: "📱", category: "Eletrônicos", value: 5299, purchaseDate: ago({ months: 14 }), warrantyUntil: ago({ months: 2 }) },
    { ...base, id: "a3", name: "Monitor 27 polegadas", icon: "🖥️", category: "Eletrônicos", value: 1899, purchaseDate: ago({ months: 20 }), location: "Escritório" },
    { ...base, id: "a4", name: "Fone com cancelamento de ruído", icon: "🎧", category: "Eletrônicos", value: 1499, purchaseDate: ago({ months: 5 }), warrantyUntil: ahead({ months: 7 }) },
    { ...base, id: "a5", name: "Geladeira frost free", icon: "🧊", category: "Eletrodomésticos", value: 4199, purchaseDate: ago({ years: 2, days: -18 }), warrantyUntil: ahead({ days: 18 }), location: "Cozinha", notes: "Garantia estendida de 2 anos." },
    { ...base, id: "a6", name: "Máquina de lavar 12 kg", icon: "🧺", category: "Eletrodomésticos", value: 2899, purchaseDate: ago({ years: 1, months: 3 }), location: "Área de serviço" },
    { ...base, id: "a7", name: "Air fryer", icon: "🍳", category: "Eletrodomésticos", value: 499.9, purchaseDate: ago({ months: 10 }), warrantyUntil: ahead({ months: 2 }), location: "Cozinha" },
    { ...base, id: "a8", name: "Sofá de 3 lugares", icon: "🛋️", category: "Móveis", value: 3200, purchaseDate: ago({ years: 2, months: 2 }), location: "Sala" },
    { ...base, id: "a9", name: "Cama box queen", icon: "🛏️", category: "Móveis", value: 2600, purchaseDate: ago({ years: 3 }), location: "Quarto" },
    { ...base, id: "a10", name: "Mesa de escritório", icon: "🪑", category: "Móveis", value: 1150, purchaseDate: ago({ months: 20 }), location: "Escritório" },
    { ...base, id: "a11", name: "Onix 2021", icon: "🚗", category: "Veículos", value: 62000, purchaseDate: ago({ years: 2, months: 6 }), location: "Garagem" },
    { ...base, id: "a12", name: "Bicicleta aro 29", icon: "🚲", category: "Esporte e lazer", value: 2400, purchaseDate: ago({ years: 1, months: 1 }), location: "Garagem" },
    { ...base, id: "a13", name: "Luvas e caneleiras de muay thai", icon: "🥊", category: "Esporte e lazer", value: 480, purchaseDate: ago({ months: 6 }) },
  ];
}

export function seedWishes(): Wish[] {
  const now = today();
  const ahead = (d: Duration) => toISO(add(now, d));
  const base = { notes: "", link: "", targetDate: "" };

  return [
    { ...base, id: "w1", name: "Cadeira ergonômica", icon: "🪑", price: 1890, priority: "high", targetDate: ahead({ months: 1 }), notes: "Com apoio lombar e de braço ajustáveis." },
    { ...base, id: "w2", name: "Saco de pancada", icon: "🥊", price: 650, priority: "medium", targetDate: ahead({ months: 2 }) },
    { ...base, id: "w3", name: "Kindle Paperwhite", icon: "📖", price: 799, priority: "medium", link: "https://www.amazon.com.br/kindle" },
    { ...base, id: "w4", name: "Relógio com GPS para corrida", icon: "⌚", price: 2499, priority: "low" },
    { ...base, id: "w5", name: "Viagem para o Japão", icon: "✈️", price: 18000, priority: "low", targetDate: ahead({ months: 14 }), notes: "Duas semanas, na primavera." },
  ];
}
