import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { sourceColor } from "@/modules/calendario/CalendarBits";
import { SOURCE } from "@/modules/calendario/sources";
import type { CalItem } from "@/modules/calendario/types";
import { useOverdue } from "@/modules/calendario/useCalendarItems";
import { derive, dueLabel } from "@/modules/compromissos/logic";
import { useAttention } from "@/modules/compromissos/useAttention";

interface Notice {
  key: string;
  title: string;
  detail: string;
  to: string;
  icon?: string;
  source: CalItem["source"];
  overdue: boolean;
}

/**
 * O sino junta o que pede atenção no sistema inteiro: tudo o que atrasou em
 * qualquer módulo (a mesma lista do calendário) e os compromissos chegando a hora.
 */
export function Notifications() {
  const overdue = useOverdue();
  const attention = useAttention();

  const notices: Notice[] = [
    ...overdue.map((i) => ({
      key: i.key,
      title: i.title,
      detail: `${SOURCE[i.source].label}, era para ${shortDate(i.date)}`,
      to: i.to ?? "/calendario",
      icon: i.icon,
      source: i.source,
      overdue: true,
    })),
    ...attention
      .filter((c) => derive(c).status === "soon")
      .map((c) => ({
        key: `soon-${c.id}`,
        title: c.name,
        detail: `Compromissos, ${dueLabel(derive(c)).toLowerCase()}`,
        to: `/compromissos?c=${c.id}`,
        icon: c.icon,
        source: "compromissos" as const,
        overdue: false,
      })),
  ];
  const count = notices.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Avisos: ${count} pedem atenção` : "Avisos"}
        >
          <Bell />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[0.625rem] leading-none font-semibold text-danger-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <p className="font-semibold">Avisos</p>
          <PopoverClose asChild>
            <Link to="/calendario" className="text-sm font-medium text-primary hover:underline">
              Abrir calendário
            </Link>
          </PopoverClose>
        </div>
        {count === 0 ? (
          <p className="px-4 py-6 text-center text-muted-foreground">Tudo em dia. Nada atrasado nem chegando a hora.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto p-1.5">
            {notices.map((n) => {
              const Icon = SOURCE[n.source].icon;
              return (
                <li key={n.key} style={sourceColor(n.source)}>
                  <PopoverClose asChild>
                    <Link to={n.to} className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-surface-hover">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md text-base leading-none",
                          n.overdue
                            ? "bg-danger-soft text-danger-strong"
                            : "bg-warning-soft text-warning-strong",
                        )}
                      >
                        {n.icon ?? <Icon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{n.title}</span>
                        <span className={cn("block truncate text-sm", n.overdue ? "text-danger-strong" : "text-muted-foreground")}>
                          {n.detail}
                        </span>
                      </span>
                    </Link>
                  </PopoverClose>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
