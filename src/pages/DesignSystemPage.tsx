import { useState, type ReactNode } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Badge, Dot, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/shell/PageHeader";
import { CycleTrack } from "@/modules/compromissos/CycleTrack";
import type { Derived } from "@/modules/compromissos/logic";
import { Checkbox } from "@/components/ui/Checkbox";
import { Progress } from "@/components/ui/Progress";
import { useCommitments } from "@/modules/compromissos/store";
import { useRoutine } from "@/modules/rotina/store";
import { useTasks } from "@/modules/tarefas/store";

const COLORS: { group: string; tokens: string[] }[] = [
  { group: "Base", tokens: ["background", "surface", "surface-muted", "surface-hover", "surface-selected", "border", "border-strong"] },
  { group: "Texto", tokens: ["foreground", "muted-foreground", "subtle-foreground"] },
  { group: "Ação", tokens: ["primary", "primary-hover", "secondary", "secondary-hover", "ring"] },
  { group: "Situação", tokens: ["success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info"] },
  { group: "Marca", tokens: ["brand-navy", "brand-cream"] },
];

const TYPE = [
  { token: "text-2xl", cls: "text-2xl font-semibold tracking-tight", use: "Título de página" },
  { token: "text-xl", cls: "text-xl font-semibold tracking-tight", use: "Título de seção" },
  { token: "text-lg", cls: "text-lg font-medium", use: "Destaque" },
  { token: "text-base", cls: "text-base", use: "Corpo da interface" },
  { token: "text-sm", cls: "text-sm", use: "Texto de apoio" },
  { token: "text-xs", cls: "text-xs", use: "Legendas e contadores" },
];

const RADII = ["sm", "md", "lg", "xl"];
const SHADOWS = ["xs", "sm", "md"];
const SPACES = [1, 2, 3, 4, 6, 8, 12];
const TONES: Tone[] = ["neutral", "info", "success", "warning", "danger"];

const track = (status: Derived["status"], progress: number): Derived => ({
  status,
  progress,
  lastDone: null,
  nextDue: null,
  daysUntil: null,
  daysSince: null,
  cycleDays: null,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DesignSystemPage() {
  const toast = useToast();
  const commitments = useCommitments();
  const tasks = useTasks();
  const routine = useRoutine();
  const [checked, setChecked] = useState(true);
  const [seg, setSeg] = useState("a");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Design system"
        description="Os tokens e componentes que o NishiOS inteiro usa. Para mudar o visual do app, edite src/styles/tokens.css: tudo abaixo acompanha."
      />

      <Section title="Cores">
        <div className="flex flex-col gap-5">
          {COLORS.map(({ group, tokens }) => (
            <div key={group}>
              <p className="text-sm text-muted-foreground">{group}</p>
              <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {tokens.map((t) => (
                  <li key={t}>
                    <div
                      className="h-12 rounded-md border border-border-strong"
                      style={{ background: `var(--${t})` }}
                    />
                    <p className="mt-1.5 truncate text-xs">{t}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <p className="font-brand text-2xl font-medium text-brand">nishiOS</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Space Grotesk só no nome da marca. Todo o resto é Inter.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {TYPE.map(({ token, cls, use }) => (
            <li key={token} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{token}</span>
              <span className={cls}>{use}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Espaçamento, raio e sombra">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Espaçamento, em múltiplos de 4px</p>
            <ul className="mt-3 flex flex-col gap-2">
              {SPACES.map((s) => (
                <li key={s} className="flex items-center gap-3 text-xs">
                  <span className="w-10 tabular-nums">{s * 4}px</span>
                  <span className="h-2 rounded-sm bg-primary" style={{ width: `calc(var(--space-unit) * ${s})` }} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Raio</p>
            <ul className="mt-3 flex gap-3">
              {RADII.map((r) => (
                <li key={r} className="text-center text-xs">
                  <div
                    className="size-14 border border-border-strong bg-surface"
                    style={{ borderRadius: `var(--radius-${r}-token)` }}
                  />
                  <p className="mt-1.5">{r}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sombra</p>
            <ul className="mt-3 flex gap-4">
              {SHADOWS.map((s) => (
                <li key={s} className="text-center text-xs">
                  <div
                    className="size-14 rounded-lg bg-surface-raised"
                    style={{ boxShadow: `var(--shadow-${s}-token)` }}
                  />
                  <p className="mt-1.5">{s}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Plus />
            Primário
          </Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="danger">
            <Trash2 />
            Perigo
          </Button>
          <Button disabled>Desativado</Button>
          <Button size="sm" variant="outline">
            <Check />
            Pequeno
          </Button>
          <Button size="icon" variant="outline" aria-label="Adicionar">
            <Plus />
          </Button>
        </div>
      </Section>

      <Section title="Selos e situações">
        <div className="flex flex-wrap items-center gap-2">
          {TONES.map((t) => (
            <Badge key={t} tone={t}>
              <Dot tone={t} />
              {t}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Trilha do ciclo">
        <p className="max-w-[60ch] text-muted-foreground">
          Mostra quanto do período já passou, da última vez até a próxima. É o elemento que
          identifica um compromisso recorrente em qualquer tela.
        </p>
        <ul className="mt-4 grid max-w-xl grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 text-sm">
          <li className="contents"><span>Em dia</span><CycleTrack derived={track("ok", 0.35)} /></li>
          <li className="contents"><span>Chegando a hora</span><CycleTrack derived={track("soon", 0.9)} /></li>
          <li className="contents"><span>Atrasado</span><CycleTrack derived={track("overdue", 1)} /></li>
          <li className="contents"><span>Sem registro</span><CycleTrack derived={track("never", 0)} /></li>
        </ul>
      </Section>

      <Section title="Check e progresso">
        <div className="flex max-w-xl flex-col gap-4">
          <div className="flex items-center gap-4">
            <Checkbox checked={checked} onChange={setChecked} label="Exemplo de check" />
            <Checkbox size="lg" checked={checked} onChange={setChecked} label="Exemplo de check grande" />
            <Checkbox size="lg" checked={false} onChange={() => {}} disabled label="Check desativado" />
            <span className="text-sm text-muted-foreground">Tarefas e hábitos usam o mesmo check.</span>
          </div>
          <Progress value={0.62} label="Exemplo de progresso" />
          <Progress value={1} done label="Exemplo de progresso concluído" />
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Field label="Texto" hint="Uma dica curta fica aqui.">
            {(id) => <Input id={id} placeholder="Ex.: Cortar o cabelo" />}
          </Field>
          <Field label="Seleção">
            {(id) => (
              <Select id={id} defaultValue="Saúde">
                <option>Saúde</option>
                <option>Casa</option>
              </Select>
            )}
          </Field>
          <Field label="Com erro" error="Dê um nome ao compromisso.">
            {(id) => <Input id={id} aria-invalid />}
          </Field>
          <Field label="Data">{(id) => <Input id={id} type="date" />}</Field>
          <Field label="Texto longo" className="sm:col-span-2">
            {(id) => <Textarea id={id} placeholder="Anotações..." />}
          </Field>
        </div>
      </Section>

      <Section title="Filtro, aviso e estado vazio">
        <div className="flex flex-col items-start gap-4">
          <Segmented
            label="Exemplo de filtro"
            value={seg}
            onChange={setSeg}
            options={[
              { value: "a", label: "Todos", count: 9 },
              { value: "b", label: "Atrasados", count: 2 },
              { value: "c", label: "Em dia", count: 4 },
            ]}
          />
          <Button
            variant="outline"
            onClick={() => toast({ message: "Este é um aviso", action: { label: "Desfazer", onClick: () => {} } })}
          >
            Mostrar aviso
          </Button>
          <div className="w-full max-w-xl">
            <EmptyState
              title="Nenhum compromisso ainda"
              description="Um estado vazio diz o que fazer em seguida."
              action={<Button><Plus />Novo compromisso</Button>}
            />
          </div>
        </div>
      </Section>

      <Section title="Dados de exemplo">
        <p className="max-w-[60ch] text-muted-foreground">
          Nesta fase os dados ficam salvos só neste navegador. Você pode voltar aos dados de
          exemplo quando quiser; o que você cadastrou será substituído.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            commitments.resetToExample();
            tasks.resetToExample();
            routine.resetToExample();
            toast({ message: "Dados de exemplo restaurados" });
          }}
        >
          Restaurar dados de exemplo
        </Button>
      </Section>
    </div>
  );
}
