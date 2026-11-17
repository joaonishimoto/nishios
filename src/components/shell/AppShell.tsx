import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/lib/theme";
import { MAIN_NAV } from "./nav";
import { Notifications } from "./Notifications";
import { Sidebar } from "./Sidebar";

const TITLES: Record<string, string> = {
  ...Object.fromEntries(MAIN_NAV.map((n) => [n.to, n.label])),
  "/design-system": "Design system",
};

/** Páginas que usam a largura toda da janela. */
const WIDE = ["/calendario"];

export function AppShell() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = TITLES[pathname] ?? "NishiOS";

  useEffect(() => {
    document.title = title === "NishiOS" ? title : `${title} · NishiOS`;
  }, [title]);

  return (
    <div className="flex h-dvh">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* No celular a mesma barra lateral vira uma gaveta. */}
      <RadixDialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-overlay animate-fade-in bg-overlay md:hidden" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-dialog shadow-md focus:outline-none md:hidden"
          >
            <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-(--topbar-height) shrink-0 items-center gap-2 border-b border-border px-3 md:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <p className="truncate text-muted-foreground">{title}</p>
          <div className="ml-auto flex items-center gap-0.5">
            <Notifications />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full px-(--page-padding-x) py-(--page-padding-y)",
              WIDE.includes(pathname) ? "max-w-(--page-max-width-wide)" : "max-w-(--page-max-width)",
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
