"use client";


import { useState, useEffect } from "react";
import { useAppUser } from "@/lib/app-user-context";
import { fetchAllTrophies, claimTrophies, type Trophy } from "@/app/actions";

const MEDALS = {
  1: { emoji: "🥇", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "1°", podiumH: 110 },
  2: { emoji: "🥈", color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)", label: "2°", podiumH: 80 },
  3: { emoji: "🥉", color: "#cd7c3a", bg: "rgba(180,100,50,0.10)", border: "rgba(180,100,50,0.25)", label: "3°", podiumH: 60 },
} as const;

interface PersonRow {
  key: string;
  displayName: string;
  userId: string | null;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

function buildHallOfFame(trophies: Trophy[]): PersonRow[] {
  const map = new Map<string, PersonRow>();
  for (const t of trophies) {
    const key = t.user_id ?? t.display_name;
    const row = map.get(key) ?? {
      key,
      displayName: t.display_name,
      userId: t.user_id,
      gold: 0, silver: 0, bronze: 0, total: 0,
    };
    if (t.position === 1) row.gold++;
    else if (t.position === 2) row.silver++;
    else if (t.position === 3) row.bronze++;
    row.total++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
}

/* Podium: 2nd left, 1st center, 3rd right */
function Podium({ hof, myKey }: { hof: PersonRow[]; myKey: string | undefined }) {
  const slots = [hof[1], hof[0], hof[2]]; // left=2nd, center=1st, right=3rd
  const ranks = [2, 1, 3] as const;

  return (
    <div className="flex items-end justify-center gap-2 px-4 pt-2 pb-0">
      {slots.map((row, i) => {
        const rank = ranks[i];
        const m = MEDALS[rank];
        if (!row) {
          return (
            <div key={rank} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t-xl flex items-end justify-center"
                style={{ height: m.podiumH, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-white/20 text-xs pb-2">—</span>
              </div>
            </div>
          );
        }
        const isMe = row.key === myKey;
        return (
          <div key={row.key} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Avatar + nome */}
            <div className="flex flex-col items-center gap-1">
              {rank === 1 && <span className="text-lg">👑</span>}
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                style={{ background: m.bg, border: `2px solid ${m.color}`, color: m.color }}>
                {row.displayName.charAt(0).toUpperCase()}
              </div>
              <p className={`text-xs font-bold truncate max-w-[72px] text-center ${isMe ? "text-emerald-400" : "text-white"}`}>
                {row.displayName}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: m.color }}>
                {row.gold > 0 ? `${row.gold}🥇` : ""}{row.silver > 0 ? ` ${row.silver}🥈` : ""}{row.bronze > 0 ? ` ${row.bronze}🥉` : ""}
              </p>
            </div>
            {/* Colonna podio */}
            <div className="w-full rounded-t-xl flex items-center justify-center"
              style={{
                height: m.podiumH,
                background: m.bg,
                border: `1px solid ${m.border}`,
                borderBottom: "none",
              }}>
              <span className="text-2xl">{m.emoji}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Riga leggenda (stagione per stagione) */
function LegendRow({ trophy, isMe }: { trophy: Trophy; isMe: boolean }) {
  const m = MEDALS[trophy.position as 1 | 2 | 3] ?? MEDALS[3];
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: isMe ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.04)",
        border: isMe ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.07)",
      }}>
      <span className="text-2xl flex-none">{m.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${isMe ? "text-emerald-400" : "text-white"}`}>
          {trophy.display_name}
        </p>
        <p className="text-white/40 text-xs">{m.label} posto · {trophy.season}</p>
      </div>
      {trophy.points && (
        <span className="font-black text-sm flex-none" style={{ color: m.color }}>
          {trophy.points} <span className="text-white/30 font-normal text-[10px]">pts</span>
        </span>
      )}
    </div>
  );
}

export default function TrophiesPage() {
  const user = useAppUser();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user.id && user.firstName) await claimTrophies(user.id, user.firstName);
      const { data } = await fetchAllTrophies();
      setTrophies(data);
      setLoading(false);
    }
    load();
  }, [user.id, user.firstName]);

  const hof = buildHallOfFame(trophies);
  const myKey = user.id ?? user.firstName;

  // Legend: sorted year desc (all trophies, position 1 for now = 1 per season)
  const legend = [...trophies].sort((a, b) => b.year - a.year);

  const myTotal = hof.find(r => r.key === myKey || r.key === user.firstName);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-4"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Fantacalcio</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Trofei</h1>
          </div>
          {myTotal && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <span className="text-lg">🏆</span>
              <span className="text-amber-400 font-black text-base">{myTotal.total}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 pb-24">

        {/* Loading skeleton */}
        {loading && (
          <div className="px-4 pt-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        )}

        {/* Podio */}
        {!loading && hof.length > 0 && (
          <section className="pt-6">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest px-4 mb-4">
              Podio
            </p>
            <Podium hof={hof} myKey={myKey} />
            {/* Base podio */}
            <div className="mx-4 h-3 rounded-b-xl"
              style={{ background: "rgba(255,255,255,0.07)" }} />
          </section>
        )}

        {/* Leggenda stagione per stagione */}
        {!loading && legend.length > 0 && (
          <section className="px-4">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
              Albo d&apos;oro
            </p>
            <div className="flex flex-col gap-2">
              {legend.map(t => {
                const isMe = t.user_id === user.id
                  || (!t.user_id && t.display_name.toLowerCase() === user.firstName.toLowerCase());
                return <LegendRow key={t.id} trophy={t} isMe={isMe} />;
              })}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && trophies.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3 px-4">
            <span className="text-6xl">🏆</span>
            <p className="text-white/40 text-sm text-center">
              Nessun trofeo ancora.<br />Aggiungi i dati storici in Supabase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
