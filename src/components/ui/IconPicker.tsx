import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./Popover";

/** Botão com o emoji atual que abre uma grade para escolher outro. */
export function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Ícone</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Ícone atual: ${value}. Trocar ícone`}
            className="flex size-9 items-center justify-center rounded-md border border-input bg-input-background text-lg hover:border-input-hover hover:bg-surface-hover"
          >
            {value}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="grid w-auto grid-cols-8 gap-0.5 p-2">
          {icons.map((icon) => (
            <PopoverClose asChild key={icon}>
              <button
                type="button"
                aria-label={`Usar ${icon}`}
                aria-pressed={icon === value}
                onClick={() => onChange(icon)}
                className="flex size-8 items-center justify-center rounded-sm text-lg hover:bg-surface-hover aria-pressed:bg-surface-selected"
              >
                {icon}
              </button>
            </PopoverClose>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
