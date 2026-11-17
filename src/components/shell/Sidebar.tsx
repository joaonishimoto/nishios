import { NavLink } from "react-router-dom";
import { Palette } from "lucide-react";
import { cn } from "@/lib/cn";
import { today } from "@/lib/dates";
import { useAttention } from "@/modules/compromissos/useAttention";
import { needsContact } from "@/modules/pessoas/logic";
import { usePeople } from "@/modules/pessoas/store";
import { overdueCares } from "@/modules/pets/logic";
import { usePets } from "@/modules/pets/store";
import { needsAttention } from "@/modules/tarefas/logic";
import { useTasks } from "@/modules/tarefas/store";
import { MAIN_NAV, UPCOMING_NAV } from "./nav";

const item =
  "flex h-8 items-center gap-2.5 rounded-md px-2 text-base transition-colors duration-(--motion-fast)";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const attention = useAttention();
  const { tasks } = useTasks();
  const { people } = usePeople();
  const { pets } = usePets();
  const now = today();
  /** Contador ao lado de cada item: o que pede atenção naquele módulo. */
  const counts: Record<string, number> = {
    "/compromissos": attention.length,
    "/tarefas": tasks.filter((t) => needsAttention(t, now)).length,
    "/pessoas": people.filter((p) => needsContact(p, now)).length,
    "/pets": pets.reduce((n, p) => n + overdueCares(p, now).length, 0),
  };

  return (
    <nav
      aria-label="Principal"
      className="flex h-full w-(--sidebar-width) flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-(--topbar-height) shrink-0 items-center gap-2.5 px-4">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-cream"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12V4l8 8V4" />
          </svg>
        </span>
        <span className="font-brand text-lg font-medium tracking-tight text-brand">nishiOS</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="flex flex-col gap-0.5">
          {MAIN_NAV.map(({ label, icon: Icon, to }) => (
            <li key={label}>
              <NavLink
                to={to!}
                end={to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    item,
                    isActive
                      ? "bg-sidebar-active font-medium text-sidebar-active-foreground"
                      : "hover:bg-sidebar-hover",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
                {counts[to!] > 0 && (
                  <span
                    className="ml-auto text-sm text-sidebar-muted tabular-nums"
                    aria-label={`${counts[to!]} pedem atenção`}
                  >
                    {counts[to!]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="mt-6 px-2 pb-1.5 text-sm text-sidebar-muted">Próximas fases</p>
        <ul className="flex flex-col gap-0.5">
          {UPCOMING_NAV.map(({ label, icon: Icon }) => (
            <li key={label} className={cn(item, "text-sidebar-muted opacity-60")}>
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <NavLink
          to="/design-system"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              item,
              isActive
                ? "bg-sidebar-active font-medium text-sidebar-active-foreground"
                : "hover:bg-sidebar-hover",
            )
          }
        >
          <Palette className="size-4 shrink-0" />
          Design system
        </NavLink>
      </div>
    </nav>
  );
}
