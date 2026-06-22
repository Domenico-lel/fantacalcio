"use client";

import { BADGE_MAP } from "@/lib/badges";

/* Riga di badge. compact = solo emoji (per header post), altrimenti chip con etichetta. */
export default function BadgeRow({ ids, compact = false }: { ids: string[]; compact?: boolean }) {
  const valid = (ids ?? []).map((id) => BADGE_MAP[id]).filter(Boolean);
  if (valid.length === 0) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 align-middle">
        {valid.map((b) => (
          <span key={b.id} title={`${b.label} — ${b.description}`}
            className="inline-flex items-center justify-center rounded-full"
            style={{ background: `${b.color}26`, border: `1px solid ${b.color}66`, width: 16, height: 16, fontSize: 9 }}>
            {b.emoji}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {valid.map((b) => (
        <span key={b.id} title={b.description}
          className="inline-flex items-center gap-1 rounded-full font-bold"
          style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}55`, fontSize: 11, padding: "2px 8px" }}>
          <span style={{ fontSize: 12 }}>{b.emoji}</span>{b.label}
        </span>
      ))}
    </span>
  );
}
