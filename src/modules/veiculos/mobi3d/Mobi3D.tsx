import { useEffect, useRef, useState } from "react";
import { Lightbulb, RotateCw } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { createMobiViewer, paintFor, type MobiView, type MobiViewer } from "./viewer";

const VIEWS: { value: MobiView | "livre"; label: string }[] = [
  { value: "tq", label: "¾" },
  { value: "fr", label: "Frente" },
  { value: "sd", label: "Lado" },
  { value: "bk", label: "Trás" },
  { value: "tp", label: "Cima" },
];

/** O Mobi em 3D: arrastar gira, pinça ou roda do mouse dá zoom. Cor e placa vêm do cadastro. */
export function Mobi3D({ color, plate, className }: { color?: string; plate?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<MobiViewer | null>(null);
  const [view, setView] = useState<MobiView | "livre">("tq");
  const [spin, setSpin] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [lights, setLights] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const v = createMobiViewer(canvas.current, { paint: paintFor(color), plate }, () => {
      setView("livre");
      setSpin(false);
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
    // a placa vai numa textura: trocar a placa recria a cena
  }, [plate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => viewer.current?.setPaint(paintFor(color)), [color]);
  useEffect(() => viewer.current?.setSpin(spin), [spin, plate]);
  useEffect(() => viewer.current?.setLights(lights), [lights, plate]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative min-h-72 flex-1 overflow-hidden rounded-lg bg-[radial-gradient(120%_80%_at_50%_62%,var(--color-surface),var(--color-surface-muted))]">
        <canvas ref={canvas} aria-label="Modelo 3D do carro" className="absolute inset-0 size-full touch-none outline-none" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Vista"
          options={VIEWS.map((o) => ({ value: o.value, label: o.label }))}
          value={view}
          onChange={(v) => {
            if (v === "livre") return;
            setView(v);
            setSpin(false);
            viewer.current?.setView(v);
          }}
        />
        <div className="flex gap-1">
          <Toggle on={spin} onClick={() => setSpin((s) => !s)} icon={<RotateCw />} label="Girar" />
          <Toggle on={lights} onClick={() => setLights((s) => !s)} icon={<Lightbulb />} label="Faróis" />
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-(--motion-fast) [&_svg]:size-4",
        on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default Mobi3D;
