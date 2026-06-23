"use client";

/**
 * Switch a linguette con indicatore luminoso che scivola da una scena all'altra.
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
      className="relative flex gap-1 p-1 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
    >
      {/* Pillola luminosa che scorre sotto le linguette */}
      <div
        className="absolute rounded-xl pointer-events-none"
        style={{
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${n})`,
          background: "var(--accent)",
          boxShadow: "0 0 18px var(--accent)",
          transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
          transition: "transform 320ms cubic-bezier(0.34,1.4,0.5,1)",
        }}
      />
      {items.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative z-10 flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors active:scale-95"
          style={{ color: value === key ? "var(--accent-ink)" : "rgba(255,255,255,0.55)" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
