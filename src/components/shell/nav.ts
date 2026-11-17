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
  { label: "Compromissos", icon: CalendarClock, to: "/compromissos" },
];

/** Módulos planejados, na ordem das próximas fases. */
export const UPCOMING_NAV: NavItem[] = [
  { label: "Tarefas", icon: CircleCheckBig },
  { label: "Rotina e metas", icon: Target },
  { label: "Finanças", icon: Wallet },
  { label: "Bens e desejos", icon: Package },
  { label: "Pessoas", icon: Users },
  { label: "Academia", icon: Dumbbell },
  { label: "Luta", icon: Swords },
  { label: "Pets", icon: PawPrint },
  { label: "Skills", icon: GraduationCap },
];
