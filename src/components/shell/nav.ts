import {
  CalendarClock,
  CalendarDays,
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

export const MAIN_NAV: NavItem[] = [
  { label: "Início", icon: House, to: "/" },
  { label: "Calendário", icon: CalendarDays, to: "/calendario" },
  { label: "Tarefas", icon: CircleCheckBig, to: "/tarefas" },
  { label: "Rotina e metas", icon: Target, to: "/rotina" },
  { label: "Compromissos", icon: CalendarClock, to: "/compromissos" },
  { label: "Treinos", icon: Dumbbell, to: "/treinos" },
  { label: "Corpo", icon: Ruler, to: "/corpo" },
  { label: "Bens e desejos", icon: Package, to: "/bens" },
  { label: "Pessoas", icon: Users, to: "/pessoas" },
  { label: "Pets", icon: PawPrint, to: "/pets" },
  { label: "Skills", icon: GraduationCap, to: "/skills" },
];

/** Módulos planejados, na ordem das próximas fases. */
export const UPCOMING_NAV: NavItem[] = [
  { label: "Finanças", icon: Wallet },
];
