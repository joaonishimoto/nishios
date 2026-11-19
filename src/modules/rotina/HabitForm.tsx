import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { IconPicker } from "@/components/ui/IconPicker";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { PERIODS, WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "./logic";
import { useTreinos } from "@/modules/treinos/store";
import { useRoutine } from "./store";
import { ROUTINE_ICONS, type Habit, type HabitDraft, type HabitPeriod } from "./types";

/** Pontos de partida para não começar do zero. */
const TEMPLATES: ({ name: string; icon: string } & Partial<HabitDraft>)[] = [
  { name: "Beber água", icon: "💧", amount: { target: 8, unit: "copos" }, period: "manha" },
  { name: "Ler", icon: "📖", amount: { target: 20, unit: "páginas" }, period: "noite" },
  { name: "Meditar 10 minutos", icon: "🧘", period: "manha" },
  { name: "Academia", icon: "🏋️", perWeek: 3 },
  { name: "Caminhar", icon: "🏃", amount: { target: 8000, unit: "passos" } },
  { name: "Celular na cama", icon: "📵", type: "evitar", period: "noite" },
  { name: "Doce depois do almoço", icon: "🍫", type: "evitar", period: "tarde" },
  { name: "Redes sociais antes das 10h", icon: "📱", type: "evitar", period: "manha" },
  { name: "Fumar", icon: "🚭", type: "evitar" },
];

export function HabitForm({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={habit ? "Editar hábito" : "Novo hábito"}
      description={habit ? undefined : "Algo para fazer com frequência, ou para largar."}
    >
      <Content key={habit?.id ?? "novo"} habit={habit} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Content({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const { createHabit, updateHabit, removeHabit, restoreHabit } = useRoutine();
  const toast = useToast();
  const [draft, setDraft] = useState<HabitDraft>({
    name: habit?.name ?? "",
    icon: habit?.icon ?? "🎯",
    type: habit?.type,
    weekdays: habit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
    perWeek: habit?.perWeek,
    amount: habit?.amount,
    period: habit?.period,
    why: habit?.why ?? "",
    paused: habit?.paused,
    link: habit?.link,
  });
  const avoid = draft.type === "evitar";
  const { modalities } = useTreinos();
  const [tried, setTried] = useState(false);

  const nameError = draft.name.trim() ? undefined : "Dê um nome ao hábito.";
  const daysError = avoid || draft.perWeek || draft.weekdays.length > 0 ? undefined : "Escolha pelo menos um dia.";
  const amountError =
    !draft.amount || draft.amount.target > 0 ? undefined : "Diga quanto por dia, maior que zero.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || daysError || amountError) return;
    const clean: HabitDraft = {
      ...draft,
      name: draft.name.trim(),
      why: draft.why?.trim() || undefined,
      // Mau hábito vale todo dia, sem quantidade nem ligação.
      ...(avoid ? { perWeek: undefined, amount: undefined, link: undefined, weekdays: [0, 1, 2, 3, 4, 5, 6] } : {}),
      amount: !avoid && draft.amount ? { target: draft.amount.target, unit: draft.amount.unit.trim() || "vezes" } : undefined,
      link: !avoid && !draft.amount ? draft.link : undefined,
    };
    if (habit) {
      updateHabit(habit.id, clean);
      toast({ message: "Alterações salvas" });
    } else {
      createHabit(clean);
      toast({ message: `${clean.name} foi criado` });
    }
    onClose();
  }

  const toggleDay = (d: number) =>
    setDraft((s) => ({
      ...s,
      weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d],
    }));

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div>
          <Segmented
            label="Tipo de hábito"
            value={avoid ? "evitar" : "fazer"}
            onChange={(v) => setDraft((s) => ({ ...s, type: v === "evitar" ? "evitar" : undefined }))}
            options={[
              { value: "fazer", label: "Quero fazer" },
              { value: "evitar", label: "Quero largar" },
            ]}
          />
          </div>
          <p className="text-sm text-muted-foreground">
            {avoid
              ? "Mau hábito: cada dia sem ele conta como vitória. Você só marca quando escapar."
              : "Um check nos dias em que você faz."}
          </p>
        </div>

        {!habit && !draft.name && (
          <div className="flex flex-wrap gap-1.5" aria-label="Sugestões">
            {TEMPLATES.filter((t) => (t.type === "evitar") === avoid).map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setDraft((s) => ({ ...s, ...t }))}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <span aria-hidden>{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-start gap-3">
          <IconPicker
            icons={ROUTINE_ICONS}
            value={draft.icon}
            onChange={(icon) => setDraft((s) => ({ ...s, icon }))}
          />
          <Field label="Nome" className="flex-1" error={tried ? nameError : undefined}>
            {(id) => (
              <Input
                id={id}
                value={draft.name}
                autoFocus={!habit}
                placeholder={avoid ? "Ex.: Celular na cama" : "Ex.: Ler 20 minutos"}
                onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
              />
            )}
          </Field>
        </div>

        {!avoid && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Frequência</legend>
            <div>
            <Segmented
              label="Frequência"
              value={draft.perWeek ? "semana" : "dias"}
              onChange={(v) => setDraft((s) => ({ ...s, perWeek: v === "semana" ? (s.perWeek ?? 3) : undefined }))}
              options={[
                { value: "dias", label: "Dias fixos" },
                { value: "semana", label: "Vezes por semana" },
              ]}
            />
            </div>
            {draft.perWeek ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={draft.perWeek === n}
                    onClick={() => setDraft((s) => ({ ...s, perWeek: n }))}
                    className={cn(
                      "h-9 min-w-11 rounded-md border px-2 text-sm font-medium transition-colors duration-(--motion-fast)",
                      draft.perWeek === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-input-background text-muted-foreground hover:border-input-hover",
                    )}
                  >
                    {n}x
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">em qualquer dia da semana</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {WEEK_ORDER.map((d) => {
                  const on = draft.weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      aria-label={WEEKDAY_LONG[d]}
                      onClick={() => toggleDay(d)}
                      className={cn(
                        "h-9 min-w-11 rounded-md border px-2 text-sm font-medium transition-colors duration-(--motion-fast)",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-input-background text-muted-foreground hover:border-input-hover",
                      )}
                    >
                      {WEEKDAY_SHORT[d]}
                    </button>
                  );
                })}
              </div>
            )}
            {tried && daysError && <p className="text-sm text-danger-strong">{daysError}</p>}
          </fieldset>
        )}

        {!avoid && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-(--color-primary)"
                checked={!!draft.amount}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, amount: e.target.checked ? { target: 8, unit: "copos" } : undefined }))
                }
              />
              Tem uma quantidade por dia
            </label>
            {draft.amount && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quanto por dia" error={tried ? amountError : undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder="8"
                      value={draft.amount?.target || ""}
                      onChange={(e) =>
                        setDraft((s) => ({ ...s, amount: { unit: s.amount?.unit ?? "", target: Number(e.target.value) } }))
                      }
                    />
                  )}
                </Field>
                <Field label="Unidade">
                  {(id) => (
                    <Input
                      id={id}
                      placeholder="copos, páginas, minutos"
                      value={draft.amount?.unit ?? ""}
                      onChange={(e) =>
                        setDraft((s) => ({ ...s, amount: { target: s.amount?.target ?? 0, unit: e.target.value } }))
                      }
                    />
                  )}
                </Field>
              </div>
            )}
          </div>
        )}

        <Field label="Parte do dia" hint="Organiza a lista de hoje.">
          {(id) => (
            <Select
              id={id}
              value={draft.period ?? "qualquer"}
              onChange={(e) =>
                setDraft((s) => ({ ...s, period: e.target.value === "qualquer" ? undefined : (e.target.value as HabitPeriod) }))
              }
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {!avoid && !draft.amount && (
        <Field
          label="Marcar sozinho"
          hint={
            draft.link
              ? "O hábito fica feito nos dias em que você registrar esse treino."
              : "Ligue aos treinos para não precisar marcar duas vezes."
          }
        >
          {(id) => (
            <Select
              id={id}
              value={draft.link ? draft.link.modalityId || "qualquer" : "nao"}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  link:
                    e.target.value === "nao"
                      ? undefined
                      : { kind: "treinos", modalityId: e.target.value === "qualquer" ? "" : e.target.value },
                }))
              }
            >
              <option value="nao">Não, eu marco</option>
              <option value="qualquer">Quando eu registrar qualquer treino</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  Quando eu registrar {m.name.toLowerCase()}
                </option>
              ))}
            </Select>
          )}
        </Field>
        )}

        <Field label="Por que importa" hint="Opcional. Aparece no detalhe do hábito, para lembrar nos dias difíceis.">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={draft.why ?? ""}
              placeholder={avoid ? "Ex.: dormir melhor e acordar sem cansaço" : "Ex.: mais disposição à tarde"}
              onChange={(e) => setDraft((s) => ({ ...s, why: e.target.value }))}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        {habit && (
          <Button
            variant="ghost"
            className="mr-auto hover:bg-danger-soft hover:text-danger-strong"
            onClick={() => {
              removeHabit(habit.id);
              onClose();
              toast({
                message: `${habit.name} foi excluído`,
                action: { label: "Desfazer", onClick: () => restoreHabit(habit) },
              });
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{habit ? "Salvar alterações" : "Criar hábito"}</Button>
      </DialogFooter>
    </form>
  );
}
