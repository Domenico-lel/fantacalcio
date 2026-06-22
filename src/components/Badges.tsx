"use client";

import { BADGE_MAP } from "@/lib/badges";

const BADGE_PATHS: Record<string, string> = {
  admin: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  verified: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  streak: "M13 2h-2v8H3v2h8v8h2v-8h8v-2h-8V2z",
  champion: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
  bomber: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z",
  mvp: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  veteran: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z",
  founder: "M12 2l1.414 4.243h4.457l-3.607 2.619 1.414 4.243-3.678-2.671-3.678 2.671 1.414-4.243-3.607-2.619h4.457L12 2z",
};

function BadgeIcon({ id, size }: { id: string; size: number }) {
  const path = BADGE_PATHS[id];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}

/* Riga di badge. compact = solo icone (per header post / profile bar), altrimenti chip con etichetta.
   size sovrascrive la dimensione dell'icona in px. */
export default function BadgeRow({ ids, compact = false, size }: { ids: string[]; compact?: boolean; size?: number }) {
  const valid = (ids ?? []).map((id) => BADGE_MAP[id]).filter(Boolean);
  if (valid.length === 0) return null;

  if (compact) {
    const px = size ?? 20;
    return (
      <span className="inline-flex items-center gap-2 align-middle">
        {valid.map((b) => (
          <span key={b.id} title={`${b.label} — ${b.description}`}
            className="inline-flex items-center justify-center"
            style={{ color: b.color }}>
            <BadgeIcon id={b.id} size={px} />
          </span>
        ))}
      </span>
    );
  }

  const px = size ?? 18;
  return (
    <span className="inline-flex flex-wrap items-center gap-2.5">
      {valid.map((b) => (
        <span key={b.id} title={b.description}
          className="inline-flex items-center gap-1.5 rounded-full font-semibold text-sm"
          style={{ color: b.color }}>
          <span className="inline-flex" style={{ width: px, height: px }}>
            <BadgeIcon id={b.id} size={px} />
          </span>
          {b.label}
        </span>
      ))}
    </span>
  );
}
