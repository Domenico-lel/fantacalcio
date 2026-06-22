"use client";

import { BADGE_MAP } from "@/lib/badges";

/* Ogni badge è un'illustrazione SVG full-color in /public/badges/{id}.svg */
function BadgeImg({ id, size }: { id: string; size: number }) {
  const b = BADGE_MAP[id];
  if (!b) return null;
  return (
    <img
      src={`/badges/${id}.svg`}
      alt={b.label}
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block", flex: "none" }}
    />
  );
}

/* Riga di badge. compact = solo emblemi (header post / profile bar),
   altrimenti emblema + etichetta. size sovrascrive la dimensione in px. */
export default function BadgeRow({ ids, compact = false, size }: { ids: string[]; compact?: boolean; size?: number }) {
  const valid = (ids ?? []).map((id) => BADGE_MAP[id]).filter(Boolean);
  if (valid.length === 0) return null;

  if (compact) {
    const px = size ?? 22;
    return (
      <span className="inline-flex items-center gap-1 align-middle">
        {valid.map((b) => (
          <span key={b.id} title={`${b.label} — ${b.description}`} className="inline-flex">
            <BadgeImg id={b.id} size={px} />
          </span>
        ))}
      </span>
    );
  }

  const px = size ?? 26;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {valid.map((b) => (
        <span key={b.id} title={b.description}
          className="inline-flex items-center gap-1.5 font-semibold text-sm"
          style={{ color: b.color }}>
          <BadgeImg id={b.id} size={px} />
          {b.label}
        </span>
      ))}
    </span>
  );
}
