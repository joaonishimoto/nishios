import { cn } from "@/lib/cn";
import type { PropertyKind, Situation } from "./types";

/**
 * O imóvel em miniatura, de frente, no tipo do cadastro (prédio, casa, terreno, loja).
 * A situação aparece no desenho: janelas acesas quando tem gente morando, guindaste na obra,
 * placa quando está vazio ou vendido. Dentro de um elemento com a classe `group`,
 * o imóvel sobe um pouco e as janelas acendem no hover.
 */
export function PropertyMini({ kind, situation, className }: { kind: PropertyKind; situation: Situation; className?: string }) {
  const lived = situation === "mora" || situation === "renda" || situation === "aluguel";
  return (
    <svg viewBox="0 0 200 120" aria-hidden className={cn("overflow-visible", className)}>
      {/* chão: calçada e grama */}
      <ellipse cx="100" cy="112" rx="86" ry="5" className="fill-black/10" />
      <rect x="14" y="106" width="172" height="6" rx="3" fill="#cfd6c4" />
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
        {kind === "apartamento" ? (
          <Building lived={lived} building={situation === "obra"} />
        ) : kind === "terreno" ? (
          <Lot />
        ) : kind === "comercial" ? (
          <Shop lived={lived} />
        ) : (
          <House lived={lived} building={situation === "obra"} />
        )}
      </g>
      {situation === "obra" && kind !== "terreno" && <Crane />}
      {(situation === "vazio" || situation === "vendido") && <Sign text={situation === "vendido" ? "VENDIDO" : "VAZIO"} sold={situation === "vendido"} />}
      {situation === "aluguel" && <Key />}
    </svg>
  );
}

const wall = "#ece6dc";
const wallShade = "#d9d0c2";
const roof = "#b4553a";
const frame = "#6b5a4a";

/** Janela: acesa (amarela) quando tem gente, e acende no hover. */
function Win({ x, y, w = 10, h = 12, lit }: { x: number; y: number; w?: number; h?: number; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1" fill="#2c3a48" />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="1"
        fill="#ffd77a"
        className={cn("transition-opacity duration-500", lit ? "opacity-90" : "opacity-0 group-hover:opacity-70")}
      />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke={frame} strokeWidth="0.8" opacity="0.6" />
    </g>
  );
}

function House({ lived, building }: { lived: boolean; building: boolean }) {
  return (
    <g>
      {/* chaminé com fumaça quando tem gente */}
      <rect x="122" y="28" width="9" height="18" fill="#8d4a36" />
      {lived && (
        <g className="opacity-60 motion-safe:animate-pulse">
          <circle cx="127" cy="22" r="3.5" fill="#d8dde2" />
          <circle cx="131" cy="15" r="4.5" fill="#e3e7ea" />
        </g>
      )}
      <rect x="52" y="58" width="96" height="48" fill={wall} />
      <rect x="52" y="58" width="96" height="4" fill={wallShade} />
      <path d="M44 60 L100 26 L156 60 Z" fill={roof} />
      <path d="M44 60 L100 26 L156 60" fill="none" stroke="#8d3f2a" strokeWidth="2" strokeLinejoin="round" />
      {/* porta, janelas e degrau */}
      <rect x="91" y="78" width="18" height="28" rx="1.5" fill="#7a5236" />
      <circle cx="105" cy="93" r="1.2" fill="#e8c77a" />
      <rect x="88" y="104" width="24" height="3" fill="#bdb3a5" />
      <Win x={62} y={70} w={18} h={16} lit={lived} />
      <Win x={120} y={70} w={18} h={16} lit={lived} />
      <circle cx="100" cy="45" r="5" fill="#2c3a48" />
      {/* jardim */}
      <ellipse cx="56" cy="104" rx="9" ry="5" fill="#7fa35b" />
      <ellipse cx="146" cy="104" rx="9" ry="5" fill="#7fa35b" />
      {building && <Scaffold x={48} w={104} y={30} />}
    </g>
  );
}

function Building({ lived, building }: { lived: boolean; building: boolean }) {
  const floors = 5;
  return (
    <g>
      <rect x="64" y="14" width="72" height="92" fill={wall} />
      <rect x="64" y="14" width="10" height="92" fill={wallShade} />
      <rect x="60" y="10" width="80" height="6" rx="1" fill="#9aa3ab" />
      {Array.from({ length: floors }, (_, f) =>
        [78, 98, 118].map((x, i) => (
          // só algumas janelas acesas, como num prédio de verdade
          <Win key={`${f}-${x}`} x={x} y={22 + f * 15} w={11} h={10} lit={lived && (f + i) % 3 !== 1} />
        )),
      )}
      {/* sacadas */}
      {Array.from({ length: floors }, (_, f) => (
        <rect key={f} x="76" y={32.5 + f * 15} width="55" height="1.6" fill="#8b949c" />
      ))}
      {/* entrada com marquise */}
      <rect x="90" y="96" width="20" height="10" fill="#2c3a48" />
      <rect x="86" y="93" width="28" height="3" rx="1" fill="#6c757d" />
      <ellipse cx="68" cy="104" rx="8" ry="5" fill="#7fa35b" />
      <ellipse cx="134" cy="104" rx="8" ry="5" fill="#7fa35b" />
      {building && <Scaffold x={60} w={80} y={8} />}
    </g>
  );
}

function Shop({ lived }: { lived: boolean }) {
  return (
    <g>
      <rect x="48" y="40" width="104" height="66" fill={wall} />
      <rect x="44" y="34" width="112" height="8" rx="1" fill="#6c757d" />
      {/* toldo listrado */}
      <path d="M50 52 L150 52 L156 64 L44 64 Z" fill="#3f7fbf" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${56 + i * 18} 52 L${65 + i * 18} 52 L${66.5 + i * 18} 64 L${55.5 + i * 18} 64 Z`} fill="#f4f1ea" />
      ))}
      <path d="M44 64 Q50 69 56 64 Q62 69 68 64 Q74 69 80 64 Q86 69 92 64 Q98 69 104 64 Q110 69 116 64 Q122 69 128 64 Q134 69 140 64 Q146 69 152 64 Q154 66 156 64" fill="#3f7fbf" />
      {/* vitrine e porta de vidro */}
      <Win x={56} y={72} w={44} h={30} lit={lived} />
      <rect x="110" y="72" width="30" height="34" fill="#2c3a48" />
      <rect x="110" y="72" width="30" height="34" fill="#ffd77a" className={cn("transition-opacity duration-500", lived ? "opacity-60" : "opacity-0 group-hover:opacity-50")} />
      <path d="M125 72 V106" stroke={frame} strokeWidth="1" />
    </g>
  );
}

function Lot() {
  return (
    <g>
      <path d="M24 106 L40 82 L160 82 L176 106 Z" fill="#a8c47f" />
      <path d="M24 106 L40 82 L160 82 L176 106" fill="none" stroke="#8aa762" strokeWidth="1" />
      {/* cerca */}
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={40 + i * 10} y="72" width="2.4" height="12" rx="0.8" fill="#9c7a55" />
      ))}
      <path d="M40 76 H162 M40 80 H162" stroke="#9c7a55" strokeWidth="1.4" />
      {/* árvore que balança no hover */}
      <g className="origin-[60px_100px] transition-transform duration-500 group-hover:rotate-3">
        <rect x="57" y="72" width="6" height="28" fill="#7a5236" />
        <circle cx="60" cy="62" r="17" fill="#6f9a4b" />
        <circle cx="50" cy="70" r="10" fill="#7fa35b" />
        <circle cx="71" cy="68" r="11" fill="#7fa35b" />
      </g>
      <ellipse cx="128" cy="98" rx="14" ry="4" fill="#93b56b" />
      <ellipse cx="148" cy="92" rx="8" ry="3" fill="#93b56b" />
    </g>
  );
}

/** Andaime por cima do imóvel em obra. */
function Scaffold({ x, w, y }: { x: number; w: number; y: number }) {
  const cols = Math.round(w / 20);
  return (
    <g stroke="#d08a1f" strokeWidth="1.6" opacity="0.85">
      {Array.from({ length: cols + 1 }, (_, i) => (
        <path key={i} d={`M${x + (i * w) / cols} ${y + 10} V106`} />
      ))}
      {[y + 30, y + 55, y + 80].map((yy) => (
        <path key={yy} d={`M${x} ${yy} H${x + w}`} />
      ))}
    </g>
  );
}

function Crane() {
  return (
    <g className="origin-[170px_106px]">
      <path d="M170 106 V8" stroke="#e0a526" strokeWidth="3" />
      <g className="origin-[170px_10px] transition-transform duration-700 group-hover:-rotate-6">
        <path d="M150 10 H198" stroke="#e0a526" strokeWidth="3" />
        <path d="M186 10 V30" stroke="#555" strokeWidth="0.8" />
        <rect x="182" y="30" width="8" height="5" fill="#8d949b" />
      </g>
    </g>
  );
}

function Sign({ text, sold }: { text: string; sold: boolean }) {
  return (
    <g className="origin-[172px_106px] transition-transform duration-300 group-hover:-rotate-3">
      <path d="M172 106 V78" stroke="#7a5236" strokeWidth="2.4" />
      <rect x="148" y="64" width="48" height="16" rx="2" fill={sold ? "#b3121d" : "#f4f1ea"} stroke={sold ? "#7d0c14" : "#c2b8a8"} />
      <text x="172" y="75.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={sold ? "#fff" : "#6b5a4a"} fontFamily="system-ui, sans-serif">
        {text}
      </text>
    </g>
  );
}

/** Chave: a casa é alugada por mim. */
function Key() {
  return (
    <g transform="translate(166 82) rotate(-30)" className="transition-transform">
      <circle cx="0" cy="0" r="6" fill="none" stroke="#c59a2b" strokeWidth="2.6" />
      <path d="M6 0 H22 M16 0 V5 M20 0 V4" stroke="#c59a2b" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}
