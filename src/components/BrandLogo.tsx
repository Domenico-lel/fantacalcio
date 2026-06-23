import type { CSSProperties } from "react";

/* Foglie d'alloro di un lato; il lato opposto è speculare (vedi render). */
const LAUREL_LEAVES = [
  { x: 74, y: 158, r: -12 },
  { x: 69, y: 142, r: -26 },
  { x: 66, y: 124, r: -42 },
  { x: 67, y: 106, r: -58 },
  { x: 73, y: 91, r: -74 },
  { x: 83, y: 80, r: -90 },
];

function Laurel() {
  return (
    <g fill="#f0b429">
      <path d="M90 168 C70 158 60 128 84 84" fill="none" stroke="#d99a1c" strokeWidth={2.4} strokeLinecap="round" />
      {LAUREL_LEAVES.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx={8.5} ry={4} transform={`rotate(${l.r} ${l.x} ${l.y})`} />
      ))}
    </g>
  );
}

/* ─── Stemma FNB Fantacalcio ────────────────────────────────────────────────
   Scudo rosso + interno navy, pallone classico, alloro dorato, monogramma
   "FNB", cartiglio "FANTACALCIO" e campo verde sul fondo. */
export function BrandCrest({
  size = 120,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const height = (size * 280) / 240;
  const navyShield = "M120 70 L198 88 L198 165 C198 212 165 244 120 260 C75 244 42 212 42 165 L42 88 Z";
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 240 280"
      fill="none"
      role="img"
      aria-label="Stemma FNB Fantacalcio"
      className={className}
      style={style}
    >
      <defs>
        <clipPath id="fnbShieldClip">
          <path d={navyShield} />
        </clipPath>
      </defs>

      {/* Scudo rosso (bordo) */}
      <path
        d="M120 60 L208 80 L208 166 C208 218 171 252 120 270 C69 252 32 218 32 166 L32 80 Z"
        fill="#c8342a"
        stroke="#7e1d16"
        strokeWidth={2}
      />
      {/* Interno navy */}
      <path d={navyShield} fill="#163a5c" />
      <path d={navyShield} fill="none" stroke="#f0b429" strokeWidth={1.4} opacity={0.7} />

      {/* Campo verde sul fondo, ritagliato nello scudo */}
      <g clipPath="url(#fnbShieldClip)">
        <rect x={34} y={208} width={172} height={70} fill="#3f8a32" />
        <line x1={44} y1={210} x2={196} y2={210} stroke="#ffffff" strokeWidth={1.6} opacity={0.85} />
        <path d="M104 210 A16 16 0 0 0 136 210" fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.85} />
        <line x1={120} y1={210} x2={120} y2={236} stroke="#ffffff" strokeWidth={1.4} opacity={0.7} />
      </g>

      {/* Alloro (sinistra + specchiato a destra) */}
      <Laurel />
      <g transform="translate(240 0) scale(-1 1)">
        <Laurel />
      </g>

      {/* Pallone in alto */}
      <circle cx={120} cy={50} r={34} fill="#ffffff" />
      <circle cx={120} cy={50} r={34} fill="none" stroke="#14233a" strokeWidth={1.5} />
      <polygon points="120,37 132.4,46 127.6,60.5 112.4,60.5 107.6,46" fill="#14233a" />
      <g stroke="#14233a" strokeWidth={2}>
        <line x1={120} y1={37} x2={120} y2={16} />
        <line x1={132.4} y1={46} x2={152.3} y2={39.5} />
        <line x1={127.6} y1={60.5} x2={140} y2={77.5} />
        <line x1={112.4} y1={60.5} x2={100} y2={77.5} />
        <line x1={107.6} y1={46} x2={87.7} y2={39.5} />
      </g>

      {/* Monogramma FNB */}
      <text
        x={120}
        y={158}
        textAnchor="middle"
        fontSize={62}
        fontWeight={900}
        letterSpacing={1}
        fill="#f5b820"
        stroke="#7e1d16"
        strokeWidth={1.5}
        fontFamily="'Arial Black', Arial, sans-serif"
      >
        FNB
      </text>

      {/* Cartiglio FANTACALCIO */}
      <path d="M48 176 L32 182 L40 200 L52 195 Z" fill="#9e2b20" />
      <path d="M192 176 L208 182 L200 200 L188 195 Z" fill="#9e2b20" />
      <path d="M46 174 H194 L188 200 H52 Z" fill="#c8342a" stroke="#7e1d16" strokeWidth={1.4} />
      <text x={120} y={193} textAnchor="middle" fontSize={15} fontWeight={800} letterSpacing={2} fill="#f3e2bf">
        FANTACALCIO
      </text>
    </svg>
  );
}

/* ─── Wordmark "Soccer Dick / CLUB" ──────────────────────────────────────── */
export function BrandWordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <div className={className} style={{ textAlign: "center", lineHeight: 1.05 }}>
      <span style={{ display: "block", fontWeight: 800, fontSize: size, letterSpacing: "-0.5px", color: "#ffffff" }}>
        Soccer Dick
      </span>
      <span style={{ display: "block", fontWeight: 800, fontSize: size, letterSpacing: size * 0.21, color: "#34d399", paddingLeft: size * 0.21 }}>
        CLUB
      </span>
    </div>
  );
}
