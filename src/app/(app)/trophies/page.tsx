"use client";

import { useState, useEffect } from "react";
import { useAppUser } from "@/lib/app-user-context";
import { fetchAllTrophies, claimTrophies, type Trophy } from "@/app/actions";

const POS = {
  1: { emoji: "🥇", color: "#f59e0b", label: "1°" },
  2: { emoji: "🥈", color: "#94a3b8", label: "2°" },
  3: { emoji: "🥉", color: "#b45309", label: "3°" },
} as const;

interface PersonRow {
  key: string;
  displayName: string;
  userId: string | null;
  gold: number;
  silver: number;
  bronze: number;
  trophies: Trophy[];
}

function buildHallOfFame(trophies: Trophy[]): PersonRow[] {
  const map = new Map<string, PersonRow>();
  for (const t of trophies) {
    const key = t.user_id ?? t.display_name;
    const row = map.get(key) ?? {
      key,
      displayName: t.display_name,
      userId: t.user_id,
      gold: 0, silver: 0, bronze: 0,
      trophies: [],
    };
    if (t.position === 1) row.gold++;
    else if (t.position === 2) row.silver++;
    else if (t.position === 3) row.bronze++;
    row.trophies.push(t);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
}

export default function TrophiesPage() {
  const user = useAppUser();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user.id && user.firstName) {
        await claimTrophies(user.id, user.firstName);
      }
      const { data } = await fetchAllTrophies();
      setTrophies(data);
      setLoading(false);
    }
    load();
  }, [user.id, user.firstName]);

  const hof = buildHallOfFame(trophies);
  const myKey = user.id ?? user.firstName;
  const myRow = hof.find(r => r.key === myKey || r.key === user.firstName);
  const myTrophies = trophies
    .filter(t => t.user_id === user.id || (!t.user_id && t.display_name.toLowerCase() === user.firstName.toLowerCase()))
    .sort((a, b) => b.year - a.year);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-5"
        style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Fantacalcio</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Albo d&apos;oro</h1>
          </div>
          {myRow && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <span className="text-lg">🏆</span>
              <span className="text-amber-400 font-black text-base">{myRow.gold + myRow.silver + myRow.bronze}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-6 pb-24">

        {/* Loading */}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.05)" }} />
        ))}

        {/* La tua bacheca */}
        {!loading && myTrophies.length > 0 && (
          <section>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
              La tua bacheca
            </p>
            <div className="flex flex-col gap-2">
              {myTrophies.map(t => {
                const p = POS[t.position as 1 | 2 | 3];
                return (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                    style={{ background: `rgba(${t.position === 1 ? "245,158,11" : t.position === 2 ? "148,163,184" : "180,83,9"},0.08)`, border: `1px solid rgba(${t.position === 1 ? "245,158,11" : t.position === 2 ? "148,163,184" : "180,83,9"},0.2)` }}>
                    <span className="text-3xl flex-none">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{t.team_name}</p>
                      <p className="text-white/40 text-xs">{t.season} · {p.label} posto</p>
                    </div>
                    {t.points && (
                      <div className="text-right flex-none">
                        <p className="font-black text-base" style={{ color: p.color }}>{t.points}</p>
                        <p className="text-white/30 text-[10px]">pts</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Hall of Fame */}
        {!loading && (
          <section>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">
              Hall of fame
            </p>

            {hof.length === 0 && (
              <div className="flex flex-col items-center py-16 gap-3">
                <span className="text-5xl">🏆</span>
                <p className="text-white/40 text-sm text-center">
                  Nessun trofeo ancora.<br />
                  Aggiungi i dati storici in Supabase.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {hof.map((row, idx) => {
                const isMe = row.key === myKey || row.key === user.firstName;
                const rank = idx + 1;
                return (
                  <div key={row.key}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{
                      background: isMe ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
                      border: isMe ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,255,255,0.07)",
                    }}>

                    {/* Rank */}
                    <div className="w-7 flex-none text-center">
                      {rank <= 3
                        ? <span className="text-xl">{["🥇","🥈","🥉"][rank-1]}</span>
                        : <span className="text-white/30 text-sm font-mono font-bold">{rank}</span>
                      }
                    </div>

                    {/* Nome */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isMe ? "text-emerald-400" : "text-white"}`}>
                        {row.displayName}
                      </p>
                      {/* Trofei come badge */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {Array.from({ length: row.gold }).map((_, i) => (
                          <span key={`g${i}`} className="text-sm">🥇</span>
                        ))}
                        {Array.from({ length: row.silver }).map((_, i) => (
                          <span key={`s${i}`} className="text-sm">🥈</span>
                        ))}
                        {Array.from({ length: row.bronze }).map((_, i) => (
                          <span key={`b${i}`} className="text-sm">🥉</span>
                        ))}
                      </div>
                    </div>

                    {/* Conteggio */}
                    <div className="flex-none flex flex-col items-end gap-0.5">
                      {row.gold > 0 && (
                        <span className="text-[11px] font-bold text-amber-400">{row.gold} oro</span>
                      )}
                      {row.silver > 0 && (
                        <span className="text-[11px] font-semibold text-slate-400">{row.silver} arg.</span>
                      )}
                      {row.bronze > 0 && (
                        <span className="text-[11px] font-semibold" style={{ color: "#b45309" }}>{row.bronze} bro.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
