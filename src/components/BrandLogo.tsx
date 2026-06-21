import type { CSSProperties } from "react";

/* ─── Stemma Soccer Dick Club ──────────────────────────────────────────────
   Scudo navy + bordo emerald, pallone classico e razzo (il tocco goliardico,
   allusivo ma non esplicito). Il testo eredita il font della pagina. */
export function BrandCrest({
  size = 120,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const height = (size * 132) / 120;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 132"
      fill="none"
      role="img"
      aria-label="Stemma Soccer Dick Club"
      className={className}
      style={style}
    >
      <path
        d="M60 6 L108 21 L108 60 C108 93 86 114 60 122 C34 114 12 93 12 60 L12 21 Z"
        fill="#0e1528"
        stroke="#34d399"
        strokeWidth={3.5}
      />
      <path
        d="M60 14 L101 27 L101 60 C101 88 82 106 60 113 C38 106 19 88 19 60 L19 27 Z"
        fill="none"
        stroke="rgba(110,231,183,0.35)"
        strokeWidth={1.2}
      />
      {/* stella */}
      <path
        d="M60 24 l2.2 4.6 5 0.7 -3.6 3.5 0.9 5 -4.5 -2.4 -4.5 2.4 0.9 -5 -3.6 -3.5 5 -0.7 Z"
        fill="#f5a623"
      />
      {/* razzo */}
      <g transform="rotate(-22 78 44)">
        <path d="M78 30 C84 34 84 46 84 50 L72 50 C72 46 72 34 78 30 Z" fill="#ffffff" />
        <circle cx={78} cy={40} r={2.6} fill="#3b8eea" />
        <path d="M72 49 l-5 6 6 -1 Z" fill="#f5a623" />
        <path d="M84 49 l5 6 -6 -1 Z" fill="#f5a623" />
        <path d="M75 52 l3 8 3 -8 Z" fill="#f0a43a" />
      </g>
      {/* pallone */}
      <circle cx={52} cy={72} r={18} fill="#ffffff" />
      <circle cx={52} cy={72} r={18} fill="none" stroke="#0e1528" strokeWidth={1} />
      <polygon points="52,65 58.7,69.8 56.1,77.7 47.9,77.7 45.3,69.8" fill="#0e1528" />
      <g stroke="#0e1528" strokeWidth={1.4}>
        <line x1={52} y1={65} x2={52} y2={55} />
        <line x1={58.7} y1={69.8} x2={68.5} y2={66.8} />
        <line x1={56.1} y1={77.7} x2={63} y2={85} />
        <line x1={47.9} y1={77.7} x2={41} y2={85} />
        <line x1={45.3} y1={69.8} x2={35.5} y2={66.8} />
      </g>
      {/* cartiglio */}
      <path d="M16 96 H104 L98 108 H22 Z" fill="#34d399" />
      <text x={60} y={105} textAnchor="middle" fontSize={8.5} fontWeight={800} letterSpacing={0.5} fill="#04241a">
        SOCCER DICK CLUB
      </text>
      <text x={60} y={119} textAnchor="middle" fontSize={7} fontWeight={700} letterSpacing={1.5} fill="rgba(255,255,255,0.5)">
        EST. 2026
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
