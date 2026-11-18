import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/lib/theme";
import { MAIN_NAV } from "./nav";
import { CommandPalette, SHORTCUT } from "./CommandPalette";
import { Notifications } from "./Notifications";
import { Sidebar } from "./Sidebar";

const TITLES: Record<string, string> = {
  ...Object.fromEntries(MAIN_NAV.map((n) => [n.to, n.label])),
  "/design-system": "Design system",
  "/dados": "Dados e backup",
};

export function AppShell() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const title = TITLES[pathname] ?? "NishiOS";

  useEffect(() => {
    document.title = title === "NishiOS" ? title : `${title} · NishiOS`;
  }, [title]);

  return (
    <div className="flex h-dvh">
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
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
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="mr-1 hidden h-8 w-56 items-center gap-2 rounded-md border border-input bg-surface px-2.5 text-sm text-muted-foreground transition-colors duration-(--motion-fast) hover:border-input-hover sm:flex"
            >
              <Search className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 text-left">Buscar</span>
              <kbd className="font-sans text-xs">{SHORTCUT}</kbd>
            </button>
            <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
              <Search />
            </Button>
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
          {/* Mesma largura para todas as páginas, inclusive as que vierem depois. */}
          <div className="mx-auto w-full max-w-(--page-max-width) px-(--page-padding-x) py-(--page-padding-y)">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
