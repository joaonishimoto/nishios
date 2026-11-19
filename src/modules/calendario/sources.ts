import {
  CalendarClock,
  CalendarDays,
  ChefHat,
  CircleCheckBig,
  Dumbbell,
  GraduationCap,
  Package,
  PawPrint,
  Ruler,
  Smartphone,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { SourceId } from "./types";

export interface SourceMeta {
  id: SourceId;
  label: string;
  /** O que essa camada mostra, para a lista de camadas. */
  hint: string;
  icon: LucideIcon;
  /** Token de cor em tokens.css. */
  color: string;
}

export const SOURCES: SourceMeta[] = [
  { id: "eventos", label: "Eventos", hint: "O que você marca aqui", icon: CalendarDays, color: "var(--cal-eventos)" },
  { id: "tarefas", label: "Tarefas", hint: "Prazos e conclusões", icon: CircleCheckBig, color: "var(--cal-tarefas)" },
  { id: "compromissos", label: "Compromissos", hint: "Vencimentos e próximas vezes", icon: CalendarClock, color: "var(--cal-compromissos)" },
  { id: "treinos", label: "Treinos", hint: "Treinos registrados", icon: Dumbbell, color: "var(--cal-treinos)" },
  { id: "corpo", label: "Corpo", hint: "Pesagens e medidas", icon: Ruler, color: "var(--cal-corpo)" },
  { id: "rotina", label: "Rotina e metas", hint: "Hábitos do dia e prazos das metas", icon: Target, color: "var(--cal-rotina)" },
  { id: "pessoas", label: "Pessoas", hint: "Aniversários e hora de procurar", icon: Users, color: "var(--cal-pessoas)" },
  { id: "pets", label: "Pets", hint: "Vacinas, cuidados e consultas", icon: PawPrint, color: "var(--cal-pets)" },
  { id: "bens", label: "Bens e desejos", hint: "Garantias e compras planejadas", icon: Package, color: "var(--cal-bens)" },
  { id: "skills", label: "Skills", hint: "Anotações do diário", icon: GraduationCap, color: "var(--cal-skills)" },
  { id: "culinaria", label: "Culinária", hint: "Cada vez que cozinhou uma receita", icon: ChefHat, color: "var(--cal-culinaria)" },
  { id: "financas", label: "Finanças", hint: "Contas a pagar e o que vai entrar", icon: Wallet, color: "var(--cal-financas)" },
  { id: "iphone", label: "iPhone", hint: "Eventos trazidos do iPhone", icon: Smartphone, color: "var(--cal-iphone)" },
];

export const SOURCE: Record<SourceId, SourceMeta> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
) as Record<SourceId, SourceMeta>;
