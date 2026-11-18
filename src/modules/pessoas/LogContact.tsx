import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { toISO, today } from "@/lib/dates";
import { usePeople } from "./store";
import { INTERACTION_TYPES, type InteractionType, type Person } from "./types";

/** "Registrar contato": anota quando e como vocês se falaram. */
export function LogContact({
  person,
  variant = "outline",
  size = "sm",
  className,
}: {
  person: Person;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { logInteraction, removeInteraction } = usePeople();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const max = toISO(today());
  const [date, setDate] = useState(max);
  const [type, setType] = useState<InteractionType>("Mensagem");
  const [note, setNote] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return;
    const created = logInteraction(person.id, { date, type, note: note.trim() });
    setOpen(false);
    toast({
      message: `Contato com ${person.name.split(" ")[0]} registrado`,
      action: { label: "Desfazer", onClick: () => removeInteraction(person.id, created.id) },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDate(max);
          setNote("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <MessageCircle />
          Registrar contato
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quando">
              {(id) => (
                <Input placeholder="Escolher a data" id={id} type="date" max={max} value={date} required onChange={(e) => setDate(e.target.value)} />
              )}
            </Field>
            <Field label="Como">
              {(id) => (
                <Select id={id} value={type} onChange={(e) => setType(e.target.value as InteractionType)}>
                  {INTERACTION_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Sobre o que falaram">
            {(id) => (
              <Input id={id} value={note} placeholder="Ex.: Combinamos um café no sábado" onChange={(e) => setNote(e.target.value)} />
            )}
          </Field>
          <Button type="submit" size="sm" className="h-8">
            Registrar contato
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
