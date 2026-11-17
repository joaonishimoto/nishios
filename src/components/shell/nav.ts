import {
  CalendarClock,
  CircleCheckBig,
  Dumbbell,
  GraduationCap,
  House,
  Package,
  PawPrint,
  Swords,
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

export const MAIN_NAV: NavItem[] = [
  { label: "Início", icon: House, to: "/" },
  { label: "Tarefas", icon: CircleCheckBig, to: "/tarefas" },
  { label: "Rotina e metas", icon: Target, to: "/rotina" },
  { label: "Compromissos", icon: CalendarClock, to: "/compromissos" },
  { label: "Bens e desejos", icon: Package, to: "/bens" },
  { label: "Pessoas", icon: Users, to: "/pessoas" },
];

/** Módulos planejados, na ordem das próximas fases. */
export const UPCOMING_NAV: NavItem[] = [
  { label: "Finanças", icon: Wallet },
  { label: "Academia", icon: Dumbbell },
  { label: "Luta", icon: Swords },
  { label: "Pets", icon: PawPrint },
  { label: "Skills", icon: GraduationCap },
];
