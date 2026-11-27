import { useState, type FormEvent } from "react";
import { HandCoins, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDate, shortDate, toISO, today } from "@/lib/dates";
import { money } from "@/lib/format";
import { LOAN_STATUS_META, loanBalance, loansOf, loanStatus, paidOf, remainingOf } from "./extras";
import { usePeople } from "./store";
import type { Loan, LoanDirection, Person } from "./types";

/** "Te deve R$ 300" / "Você deve R$ 150" / "Tudo acertado". */
export function balanceLabel(p: Person): { text: string; tone: "success" | "danger" | "neutral" } | null {
  if (!p.loans?.length) return null;
  const { balance } = loanBalance(p);
  const first = p.name.split(" ")[0];
  if (balance > 0) return { text: `${first} te deve ${money(balance)}`, tone: "success" };
  if (balance < 0) return { text: `Você deve ${money(-balance)} para ${first}`, tone: "danger" };
  return { text: "Tudo acertado", tone: "neutral" };
}

export function LoansTab({ person: p }: { person: Person }) {
  const [editing, setEditing] = useState<Loan | LoanDirection | null>(null);
  const loans = loansOf(p);
  const { owedToMe, iOwe, balance } = loanBalance(p);
  const first = p.name.split(" ")[0];
  const open = loans.filter((l) => remainingOf(l) > 0);
  const closed = loans.filter((l) => remainingOf(l) <= 0);

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Saldo" className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground">Saldo com {first}</p>
        <p
          className={cn(
            "mt-0.5 text-2xl font-semibold tabular-nums",
            balance > 0 && "text-success-strong",
            balance < 0 && "text-danger-strong",
          )}
        >
          {balance === 0 ? "Tudo acertado" : money(Math.abs(balance))}
        </p>
        {balance !== 0 && (
          <p className="text-sm text-muted-foreground">
            {balance > 0 ? `${first} te deve` : `Você deve para ${first}`}
          </p>
        )}
        {owedToMe > 0 && iOwe > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {first} te deve {money(owedToMe)} e você deve {money(iOwe)}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="h-8" onClick={() => setEditing("emprestei")}>
            <Plus />
            Emprestei
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing("peguei")}>
            <Plus />
            Peguei emprestado
          </Button>
        </div>
      </section>

      {loans.length === 0 ? (
        <EmptyState
          size="sm"
          icon={HandCoins}
          frame="dashed"
          title="Nenhum empréstimo"
          description={`Quando emprestar ou pegar dinheiro com ${first}, anote aqui e acompanhe as devoluções.`}
        />
      ) : (
        <>
          {open.length > 0 && <LoanList title="Em aberto" person={p} loans={open} onEdit={setEditing} />}
          {closed.length > 0 && <LoanList title="Encerrados" person={p} loans={closed} onEdit={setEditing} />}
        </>
      )}

      <LoanForm person={p} editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function LoanList({
  title,
  person,
  loans,
  onEdit,
}: {
  title: string;
  person: Person;
  loans: Loan[];
  onEdit: (l: Loan) => void;
}) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {loans.map((l) => (
          <LoanCard key={l.id} person={person} loan={l} onEdit={() => onEdit(l)} />
        ))}
      </ul>
    </section>
  );
}

function LoanCard({ person: p, loan: l, onEdit }: { person: Person; loan: Loan; onEdit: () => void }) {
  const { saveLoan, removeLoan } = usePeople();
  const toast = useToast();
  const status = loanStatus(l);
  const meta = LOAN_STATUS_META[status];
  const paid = paidOf(l);
  const remaining = remainingOf(l);
  const first = p.name.split(" ")[0];
  const isOpen = remaining > 0;

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">
              {l.direction === "emprestei" ? `Emprestei para ${first}` : `Peguei com ${first}`}
            </span>
            <Badge tone={meta.tone}>
              <Dot tone={meta.tone} />
              {meta.label}
            </Badge>
          </p>
          <p className="text-sm text-muted-foreground">
            {[formatDate(l.date), l.description].filter(Boolean).join(" · ")}
          </p>
          {l.dueDate && isOpen && (
            <p className={cn("text-sm", status === "atrasado" ? "text-danger-strong" : "text-muted-foreground")}>
              Devolver até {shortDate(l.dueDate)}
            </p>
          )}
        </div>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">{money(l.amount)}</span>
          {isOpen && paid > 0 && (
            <span className="block text-xs text-muted-foreground tabular-nums">faltam {money(remaining)}</span>
          )}
        </span>
      </div>

      {l.amount > 0 && !l.forgiven && paid > 0 && (
        <Progress value={paid / l.amount} className="mt-3" label="Quanto já foi devolvido" />
      )}

      {l.payments.length > 0 && (
        <ul className="mt-2 flex flex-col text-sm">
          {[...l.payments]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((pay) => (
              <li key={pay.id} className="group flex items-center gap-2 py-0.5 text-muted-foreground">
                <Undo2 className="size-3.5 shrink-0" aria-hidden />
                <span className="flex-1">
                  Devolvido {money(pay.amount)} em {shortDate(pay.date)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  aria-label={`Remover a devolução de ${shortDate(pay.date)}`}
                  onClick={() => saveLoan(p.id, { ...l, payments: l.payments.filter((x) => x.id !== pay.id) })}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isOpen && <RegisterPayment person={p} loan={l} />}
        {isOpen && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              const full = { ...l, payments: [...l.payments, { id: crypto.randomUUID(), date: toISO(today()), amount: remaining }] };
              saveLoan(p.id, full);
              toast({ message: "Empréstimo quitado", action: { label: "Desfazer", onClick: () => saveLoan(p.id, l) } });
            }}
          >
            Quitar tudo
          </Button>
        )}
        <div className="ml-auto flex">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar empréstimo" onClick={onEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Excluir empréstimo"
            onClick={() => {
              removeLoan(p.id, l.id);
              toast({ message: "Empréstimo excluído", action: { label: "Desfazer", onClick: () => saveLoan(p.id, l) } });
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

function RegisterPayment({ person: p, loan: l }: { person: Person; loan: Loan }) {
  const { saveLoan } = usePeople();
  const toast = useToast();
  const remaining = remainingOf(l);
  const max = toISO(today());
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | undefined>(remaining);
  const [date, setDate] = useState(max);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!amount || !date) return;
    saveLoan(p.id, { ...l, payments: [...l.payments, { id: crypto.randomUUID(), date, amount: Math.min(amount, remaining) }] });
    setOpen(false);
    toast({
      message: amount >= remaining ? "Empréstimo quitado" : `Devolução de ${money(amount)} registrada`,
      action: { label: "Desfazer", onClick: () => saveLoan(p.id, l) },
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setAmount(remaining);
          setDate(max);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Undo2 />
          Registrar devolução
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">{(id) => <MoneyInput id={id} value={amount} onValueChange={setAmount} />}</Field>
            <Field label="Quando">
              {(id) => <Input id={id} type="date" max={max} value={date} required placeholder="Escolher a data" onChange={(e) => setDate(e.target.value)} />}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Falta devolver {money(remaining)}.</p>
          <Button type="submit" size="sm" className="h-8" disabled={!amount}>
            Registrar devolução
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function LoanForm({
  person,
  editing,
  onClose,
}: {
  person: Person;
  editing: Loan | LoanDirection | null;
  onClose: () => void;
}) {
  const first = person.name.split(" ")[0];
  const isNew = typeof editing === "string";
  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? (editing === "emprestei" ? `Emprestei para ${first}` : `Peguei com ${first}`) : "Editar empréstimo"}
    >
      {editing !== null && (
        <LoanFormContent
          key={typeof editing === "string" ? editing : editing.id}
          person={person}
          loan={typeof editing === "string" ? { direction: editing } : editing}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function LoanFormContent({ person, loan, onClose }: { person: Person; loan: Partial<Loan>; onClose: () => void }) {
  const { saveLoan } = usePeople();
  const toast = useToast();
  const first = person.name.split(" ")[0];
  const [direction, setDirection] = useState<LoanDirection>(loan.direction ?? "emprestei");
  const [amount, setAmount] = useState<number | undefined>(loan.amount);
  const [date, setDate] = useState(loan.date ?? toISO(today()));
  const [dueDate, setDueDate] = useState(loan.dueDate ?? "");
  const [description, setDescription] = useState(loan.description ?? "");
  const [forgiven, setForgiven] = useState(!!loan.forgiven);
  const [tried, setTried] = useState(false);
  const amountError = amount ? undefined : "Diga o valor.";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (amountError || !amount || !date) return;
    saveLoan(person.id, {
      id: loan.id ?? crypto.randomUUID(),
      direction,
      amount,
      date,
      dueDate,
      description: description.trim(),
      payments: loan.payments ?? [],
      ...(forgiven ? { forgiven: true } : {}),
    });
    toast({ message: loan.id ? "Empréstimo atualizado" : "Empréstimo registrado" });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogBody className="flex flex-col gap-4">
        <Segmented<LoanDirection>
          label="Quem emprestou"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "emprestei", label: `Emprestei para ${first}` },
            { value: "peguei", label: `Peguei com ${first}` },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor" error={tried ? amountError : undefined}>
            {(id) => <MoneyInput id={id} value={amount} autoFocus onValueChange={setAmount} />}
          </Field>
          <Field label="Quando">
            {(id) => <Input id={id} type="date" value={date} required placeholder="Escolher a data" onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <Field label="Para quê">
          {(id) => (
            <Input id={id} value={description} placeholder="Ex.: Conserto do carro" onChange={(e) => setDescription(e.target.value)} />
          )}
        </Field>
        <Field label="Devolver até">
          {(id) => <Input id={id} type="date" value={dueDate} min={date} placeholder="Sem prazo" onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
        {loan.id && (
          <div className="flex items-center gap-2 text-sm">
            <Checkbox checked={forgiven} onChange={setForgiven} label="Perdoar o que falta" />
            <span>Perdoar o que falta (sai do saldo)</span>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{loan.id ? "Salvar" : "Registrar empréstimo"}</Button>
      </DialogFooter>
    </form>
  );
}
