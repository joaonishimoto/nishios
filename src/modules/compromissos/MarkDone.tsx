import { useState } from "react";
import { Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { shortDate, toISO, today } from "./logic";
import { useCommitments } from "./store";
import type { Commitment } from "./types";

/** Botão "Marcar como feito": pede a data (hoje por padrão) e registra no histórico. */
export function MarkDone({
  commitment,
  variant = "outline",
  size = "sm",
  label = "Marcar como feito",
  className,
}: {
  commitment: Commitment;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  className?: string;
}) {
  const { markDone, removeDone } = useCommitments();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const max = toISO(today());
  const [date, setDate] = useState(max);

  function confirm() {
    if (!date) return;
    const alreadyThere = commitment.history.includes(date);
    markDone(commitment.id, date);
    setOpen(false);
    toast({
      message: `${commitment.name}: feito em ${shortDate(date)}`,
      action: alreadyThere
        ? undefined
        : { label: "Desfazer", onClick: () => removeDone(commitment.id, date) },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDate(max);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          <Check />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60" onClick={(e) => e.stopPropagation()}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <Field label="Quando você fez?">
            {(id) => (
              <Input
                placeholder="Escolher a data"
                id={id}
                type="date"
                value={date}
                max={max}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Marcar como feito
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
