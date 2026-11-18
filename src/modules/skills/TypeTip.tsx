import { InfoTip } from "@/components/ui/InfoTip";

/** Explica a diferença entre hard e soft skill. */
export function TypeTip({ className }: { className?: string }) {
  return (
    <InfoTip label="Diferença entre hard e soft skill" className={className}>
      <p>
        <strong className="font-semibold">Hard skill</strong> é técnica: você aprende e consegue medir. Ex.: programar
        em React, falar inglês, modelagem 3D, usar o Supabase.
      </p>
      <p className="mt-2">
        <strong className="font-semibold">Soft skill</strong> é comportamental e de relacionamento. Ex.: comunicação,
        liderança, organização, negociação, lidar com pressão.
      </p>
      <p className="mt-2 text-muted-foreground">
        Para lembrar: hard é o que você sabe fazer; soft é como você trabalha e se relaciona.
      </p>
    </InfoTip>
  );
}
