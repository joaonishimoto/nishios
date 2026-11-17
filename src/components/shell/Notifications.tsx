import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { derive, dueLabel, STATUS_META } from "@/modules/compromissos/logic";
import { useAttention } from "@/modules/compromissos/useAttention";

export function Notifications() {
  const attention = useAttention();
  const count = attention.length;

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
        <p className="border-b border-border px-4 py-3 font-semibold">Avisos</p>
        {count === 0 ? (
          <p className="px-4 py-6 text-center text-muted-foreground">
            Tudo em dia. Nenhum compromisso atrasado ou chegando a hora.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {attention.map((c) => {
              const d = derive(c);
              return (
                <li key={c.id}>
                  <PopoverClose asChild>
                    <Link
                      to={`/compromissos?c=${c.id}`}
                      className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-surface-hover"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block text-sm text-muted-foreground">{dueLabel(d)}</span>
                      </span>
                      <Dot tone={STATUS_META[d.status].tone} />
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
