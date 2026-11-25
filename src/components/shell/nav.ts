import {
  Building2,
  Car,
  CalendarClock,
  CalendarDays,
  ChefHat,
  CircleCheckBig,
  Dumbbell,
  GraduationCap,
  House,
  Package,
  PawPrint,
  Ruler,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Sem rota = módulo de uma fase futura, ainda não construído. */
  to?: string;
}

export interface NavGroup {
  /** Sem rótulo = o grupo do topo, que não precisa de nome. */
  label?: string;
  items: NavItem[];
}

/** A barra lateral, agrupada por assunto. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Início", icon: House, to: "/" },
      { label: "Calendário", icon: CalendarDays, to: "/calendario" },
    ],
  },
  {
    label: "Dia a dia",
    items: [
      { label: "Tarefas", icon: CircleCheckBig, to: "/tarefas" },
      { label: "Rotina e metas", icon: Target, to: "/rotina" },
      { label: "Compromissos", icon: CalendarClock, to: "/compromissos" },
      { label: "Pessoas", icon: Users, to: "/pessoas" },
      { label: "Pets", icon: PawPrint, to: "/pets" },
    ],
  },
  {
    label: "Saúde",
    items: [
      { label: "Treinos", icon: Dumbbell, to: "/treinos" },
      { label: "Corpo", icon: Ruler, to: "/corpo" },
    ],
  },
  {
    // Tudo o que é seu e tem valor: o dinheiro e as coisas que ele compra.
    label: "Patrimônio",
    items: [
      { label: "Finanças", icon: Wallet, to: "/financas" },
      { label: "Imóveis", icon: Building2, to: "/imoveis" },
      { label: "Veículos", icon: Car, to: "/veiculos" },
      { label: "Bens e desejos", icon: Package, to: "/bens" },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { label: "Skills", icon: GraduationCap, to: "/skills" },
      { label: "Culinária", icon: ChefHat, to: "/culinaria" },
    ],
  },
];

/** Todas as páginas com rota, na ordem da barra lateral. */
export const MAIN_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.to);

/** Módulos planejados, ainda sem tela. */
export const UPCOMING_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items).filter((i) => !i.to);
