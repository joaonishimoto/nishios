import { cn } from "@/lib/cn";
import { paintFor } from "./paint";
import type { VehicleKind } from "./types";

/**
 * O veículo em miniatura, de lado e com a frente para a direita, na cor do cadastro.
 * Dentro de um elemento com a classe `group`, as rodas giram e o carro sobe no hover.
 */
export function VehicleMini({ kind, color, className }: { kind: VehicleKind; color?: string; className?: string }) {
  const paint = paintFor(color);
  return (
    <svg
      viewBox="0 0 200 100"
      aria-hidden
      className={cn("overflow-visible", className)}
      style={{ ["--paint" as string]: paint }}
    >
      <ellipse cx="100" cy="93" rx={kind === "carro" || kind === "outro" ? 76 : 88} ry="5" className="fill-black/15" />
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
        {kind === "moto" ? <Moto /> : kind === "caminhonete" ? <Pickup /> : <Hatch />}
      </g>
    </svg>
  );
}

const shade = "color-mix(in oklab, var(--paint) 72%, black)";
const light = "color-mix(in oklab, var(--paint) 70%, white)";
const glass = "#1c2630";

function Wheel({ x, y = 80, r = 13 }: { x: number; y?: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#17181a" />
      <circle cx={x} cy={y} r={r - 1.6} fill="none" stroke="#2a2c30" strokeWidth="1" />
      <g className="origin-center [transform-box:fill-box] group-hover:animate-[spin_0.9s_linear_infinite] motion-reduce:animate-none">
        <circle cx={x} cy={y} r={r * 0.62} fill="#c9cdd2" />
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            key={a}
            d={`M${x} ${y} l${(Math.cos(((a - 90) * Math.PI) / 180) * r * 0.6).toFixed(2)} ${(Math.sin(((a - 90) * Math.PI) / 180) * r * 0.6).toFixed(2)}`}
            stroke="#7d838b"
            strokeWidth={r * 0.14}
            strokeLinecap="round"
          />
        ))}
        <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke="#e8ebee" strokeWidth="0.8" />
        <circle cx={x} cy={y} r={r * 0.17} fill="#b3121d" />
      </g>
    </g>
  );
}

/** Hatch compacto, alto e curto, no jeito do Mobi. */
function Hatch() {
  return (
    <g>
      {/* mais curto que o desenho original: o Mobi tem 3,6 m e é alto */}
      <g transform="translate(16 0) scale(0.84 1)">
      {/* carroceria */}
      <path
        d="M14 68 C13 58 15 50 19 44 L23 30 C25 22 30 18 40 17 L112 16 C122 16 128 19 134 25 L150 41 C164 43 176 46 183 50 C188 53 189 60 189 66 L189 72 C189 76 186 79 182 79 L168 79 A18 18 0 0 0 132 79 L67 79 A18 18 0 0 0 31 79 L19 79 C15 79 14 76 14 72 Z"
        fill="var(--paint)"
      />
      {/* teto com o friso preto */}
      <path d="M26 21 C28 18 33 16.5 40 16.5 L112 16 C118 16 122 17 126 19" fill="none" stroke="#111" strokeWidth="1.6" opacity="0.65" />
      {/* vidros */}
      <path d="M27 42 L30 28 C31 24 34 22 39 22 L76 22 L76 42 Z" fill={glass} />
      <path d="M80 22 L109 22 C116 22 120 24 125 29 L139 42 L80 42 Z" fill={glass} />
      <path d="M90 23 L84 41" stroke="white" strokeOpacity="0.12" strokeWidth="5" />
      <rect x="76" y="21" width="4" height="22" fill="#121416" />
      {/* tampa traseira preta e lanterna */}
      <path d="M14.6 48 C15 45 16.6 43 19 42 L23 30 C23.6 27 25 25 27 24 L26 44 C24 50 21 56 19 62 L14.4 62 Z" fill="#0e1012" />
      <path d="M15 47 L21 45 L20.5 58 L14.6 58 Z" fill="#b3121d" />
      <path d="M15.2 53 L20.7 52.6 L20.6 55 L15 55.3 Z" fill="#e9e9e9" opacity="0.8" />
      {/* farol e grade */}
      <path d="M170 49 C177 50 183 52 187 55 L186 58 C180 57 174 55 169 53 Z" fill="#0f1114" />
      <path d="M176 51.5 C180 52.5 183 53.6 185.6 55.2" stroke="#dfe7ee" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M182 66 L189 66" stroke="#0f1114" strokeWidth="3" />
      {/* portas, maçanetas e retrovisor */}
      <path d="M78 43 L78 78 M138 44 C137 56 136 68 134 76 M30 45 C29 55 28 64 30 70" stroke={shade} strokeWidth="0.8" fill="none" />
      <rect x="62" y="47" width="8" height="2" rx="1" fill={shade} />
      <rect x="117" y="47" width="8" height="2" rx="1" fill={shade} />
      <path d="M140 40 C141 36 146 35 148 38 L149 43 L141 43 Z" fill="var(--paint)" stroke={shade} strokeWidth="0.6" />
      {/* vinco, brilho e para-choques */}
      <path d="M22 56 C60 54 120 53 178 56" stroke={light} strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M40 19 L110 18.5" stroke="white" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M67 79 L132 79" stroke="#121416" strokeWidth="2.2" />
      </g>
      <Wheel x={57} />
      <Wheel x={142} />
    </g>
  );
}

function Pickup() {
  return (
    <g>
      <path
        d="M6 66 L6 48 L86 48 L90 24 C91 20 94 18 100 18 L128 18 C134 18 138 21 142 26 L154 42 C170 44 182 47 188 51 C192 54 193 60 193 66 L193 72 C193 76 190 79 186 79 L172 79 A18 18 0 0 0 136 79 L66 79 A18 18 0 0 0 30 79 L10 79 C7 79 6 76 6 72 Z"
        fill="var(--paint)"
      />
      <path d="M94 42 L97 26 C98 24 99 23 102 23 L126 23 C131 23 134 25 137 29 L146 42 Z" fill={glass} />
      <rect x="117" y="22" width="3" height="21" fill="#121416" />
      <path d="M8 48 L86 48" stroke={shade} strokeWidth="1.2" />
      <path d="M7 52 L12 52 L12 60 L7 60 Z" fill="#b3121d" />
      <path d="M176 52 C182 53 187 55 190 57 L189 60 C184 59 179 57 175 55 Z" fill="#dfe7ee" stroke="#0f1114" strokeWidth="0.8" />
      <path d="M118 44 L118 78" stroke={shade} strokeWidth="0.8" />
      <rect x="104" y="48" width="8" height="2" rx="1" fill={shade} />
      <path d="M12 58 C60 56 130 56 186 59" stroke={light} strokeWidth="1.2" fill="none" opacity="0.7" />
      <Wheel x={48} r={14} />
      <Wheel x={154} r={14} />
    </g>
  );
}

function Moto() {
  return (
    <g>
      <Wheel x={48} r={16} />
      <Wheel x={152} r={16} />
      <path d="M48 80 L82 56 L120 58 L152 80" stroke="#2a2c30" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M140 34 L152 80" stroke="#9aa0a6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M134 30 L146 30" stroke="#17181a" strokeWidth="3" strokeLinecap="round" />
      <path d="M84 50 C88 40 100 36 116 38 C126 39 132 44 132 50 L118 56 L90 56 Z" fill="var(--paint)" />
      <path d="M60 46 L92 46 C96 46 96 52 92 52 L58 52 Z" fill="#17181a" />
      <path d="M40 48 L60 46 L62 52 L42 54 Z" fill="var(--paint)" />
      <path d="M90 60 L118 60 L114 72 L94 72 Z" fill="#3a3d42" />
      <path d="M140 38 C146 37 150 40 150 44 L142 46 Z" fill="#dfe7ee" stroke="#0f1114" strokeWidth="0.8" />
      <path d="M38 50 L44 50" stroke="#b3121d" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 40 C108 38 118 39 124 42" stroke="white" strokeOpacity="0.4" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}
