"use client";

/**
 * Switch a linguette con pillola dell'accent che scivola da una scena all'altra.
 * Usato in Bacheca, Pronostici, ecc. — un solo componente per coerenza.
 */
export default function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const activeIndex = Math.max(0, items.findIndex((i) => i.key === value));
  const n = items.length;

  return (
    <div
      className="relative flex gap-1 p-1 rounded-full"
      style={{ background: "rgba(255,255,255,0.055)", border: "1px solid var(--border)" }}
    >
      {/* Pillola che scorre sotto le linguette */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${n})`,
          background: "var(--accent-grad)",
          boxShadow: "0 4px 14px -4px var(--accent-glow)",
          transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
          transition: "transform 300ms cubic-bezier(0.3, 1.2, 0.4, 1)",
        }}
      />
      {items.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative z-10 flex-1 py-2 rounded-full text-[13px] font-bold transition-colors active:scale-95"
          style={{ color: value === key ? "var(--accent-ink)" : "var(--text-dim)" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
