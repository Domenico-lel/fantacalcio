"use client";

import type { KeyboardEvent } from "react";

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

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % n;
    else if (event.key === "ArrowLeft") next = (index - 1 + n) % n;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else return;

    event.preventDefault();
    const key = items[next].key;
    onChange(key);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-segmented-tab="${key}"]`)?.focus();
    });
  }

  return (
    <div
      role="tablist"
      className="relative grid rounded-full p-1"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, background: "rgba(255,255,255,0.055)", border: "1px solid var(--border)" }}
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
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 300ms cubic-bezier(0.3, 1.2, 0.4, 1)",
        }}
      />
      {items.map(({ key, label }, index) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`tab-${key}`}
          aria-selected={value === key}
          aria-controls={`tab-panel-${key}`}
          tabIndex={value === key ? 0 : -1}
          data-segmented-tab={key}
          onClick={() => onChange(key)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className="relative z-10 min-h-[44px] rounded-full px-2 text-[13px] font-bold transition-colors active:scale-95"
          style={{ color: value === key ? "var(--accent-ink)" : "var(--text-dim)" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
