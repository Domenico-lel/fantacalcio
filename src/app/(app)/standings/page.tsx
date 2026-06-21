"use client";

import { useEffect, useState } from "react";
import { loadState } from "@/lib/store";
import { fetchTeams } from "@/app/teams-actions";

interface StandingEntryWithLogo {
  position: number;
  teamName: string;
  logoEmoji: string;
  points: number;
  totalFp: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
}

const EMOJI_POOL = ["⚽", "🏆", "⭐", "🦅", "🦁", "🐉", "🔥", "⚡", "🌟", "🎯", "🦊", "🐺", "🦈", "💎"];

function assignLogoToTeam(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = ((hash << 5) - hash) + teamName.charCodeAt(i);
    hash = hash & hash;
  }
  return EMOJI_POOL[Math.abs(hash) % EMOJI_POOL.length];
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function StandingsPage() {
  const [myTeamName, setMyTeamName] = useState("La tua Squadra");
  const [myLogo, setMyLogo] = useState("⭐");
  const [standings, setStandings] = useState<StandingEntryWithLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLogos, setTeamLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = loadState();
    if (s.profile) {
      setMyTeamName(s.profile.teamName);
      setMyLogo(s.profile.logo);
    }
  }, []);

  useEffect(() => {
    fetchTeams().then((teams) => {
      const map: Record<string, string> = {};
      for (const t of teams) if (t.logoUrl) map[t.name] = t.logoUrl;
      setTeamLogos(map);
    }).catch(() => {});
  }, []);

  function Logo({ name, fallback, size, radius = 50 }: { name: string; fallback: string; size: number; radius?: number }) {
    const url = teamLogos[name];
    if (url) return <img src={url} alt="" className="object-cover flex-none" style={{ width: size, height: size, borderRadius: radius }} />;
    return (
      <span className="flex-none flex items-center justify-center"
        style={{ width: size, height: size, borderRadius: radius, background: "rgba(255,255,255,0.07)", fontSize: size * 0.5 }}>
        {fallback}
      </span>
    );
  }

  useEffect(() => {
    async function loadStandings() {
      try {
        const res = await fetch("/api/standings");
        if (!res.ok) throw new Error("Failed to fetch standings");
        const data = await res.json();
        const withLogos: StandingEntryWithLogo[] = (data.items || []).map((entry: any) => ({
          ...entry,
          logoEmoji: entry.teamName === myTeamName ? myLogo : assignLogoToTeam(entry.teamName),
        }));
        setStandings(withLogos);
      } catch {
        setStandings([]);
      } finally {
        setLoading(false);
      }
    }
    loadStandings();
  }, [myTeamName, myLogo]);

  const myEntry = standings.find((e) => e.teamName === myTeamName);
  const leader = standings[0];
  const maxPoints = leader?.points || 1;

  return (
    <div className="screen sec-rank">
      {/* Header */}
      <div className="sec-header px-4 pt-12 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-widest" style={{ color: "var(--accent-soft)" }}>STAGIONE 2025/26</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Classifica</h1>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "rgba(133,124,240,0.18)", color: "var(--accent)" }}>🏆</div>
        </div>
      </div>

      <div className="px-4 pb-24 pt-4 flex flex-col gap-3">

        {loading && standings.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ height: i === 0 ? 88 : 56, background: "rgba(255,255,255,0.05)" }} />
        ))}

        {!loading && standings.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <span className="text-4xl">🏆</span>
            <p className="text-white/50 text-sm">Classifica non ancora disponibile.</p>
          </div>
        )}

        {/* HERO capolista */}
        {leader && (
          <div className="pop-in relative overflow-hidden rounded-3xl p-4"
            style={{ background: "linear-gradient(135deg, #241c52, #181340)", border: "1px solid #463c97" }}>
            <span className="absolute -top-3 right-1 text-7xl opacity-25 select-none">👑</span>
            <div className="flex items-center gap-3 relative">
              <Logo name={leader.teamName} fallback={leader.logoEmoji} size={52} radius={16} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest" style={{ color: "#cecbf6" }}>CAPOLISTA</p>
                <p className="text-white font-bold text-lg leading-tight truncate">{leader.teamName}</p>
                <p className="text-white/45 text-xs mt-0.5">{leader.won}V · {leader.drawn}N · {leader.lost}P</p>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-3xl leading-none">{leader.points}</p>
                <p className="text-xs" style={{ color: "var(--accent-soft)" }}>punti</p>
              </div>
            </div>
          </div>
        )}

        {/* La tua posizione */}
        {myEntry && myEntry.position !== 1 && (
          <div className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{ background: "rgba(133,124,240,0.1)", border: "1px solid rgba(133,124,240,0.32)" }}>
            <span className="font-black text-2xl w-9 text-center" style={{ color: "var(--accent)" }}>{myEntry.position}°</span>
            <Logo name={myEntry.teamName} fallback={myEntry.logoEmoji} size={36} radius={12} />
            <div className="flex-1 min-w-0">
              <p className="text-white/45 text-[10px] font-semibold tracking-wide">LA TUA SQUADRA</p>
              <p className="text-white font-semibold text-sm truncate">{myEntry.teamName}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg leading-none">{myEntry.points}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{myEntry.totalFp.toLocaleString("it-IT", { maximumFractionDigits: 0 })} fp</p>
            </div>
          </div>
        )}

        {/* Lista completa */}
        {standings.length > 0 && (
          <div className="app-card overflow-hidden mt-1">
            {standings.map((entry, i) => {
              const isMe = entry.teamName === myTeamName;
              const pct = Math.max(6, Math.round((entry.points / maxPoints) * 100));
              return (
                <div key={entry.position}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{
                    background: isMe ? "rgba(133,124,240,0.12)" : "transparent",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  }}>
                  <span className="w-6 text-center flex-none">
                    {entry.position <= 3
                      ? <span className="text-lg">{MEDAL[entry.position - 1]}</span>
                      : <span className="text-white/35 text-sm font-medium">{entry.position}</span>}
                  </span>
                  <Logo name={entry.teamName} fallback={entry.logoEmoji} size={32} radius={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold truncate ${isMe ? "" : "text-white"}`} style={isMe ? { color: "var(--accent-soft)" } : undefined}>
                        {entry.teamName}
                      </span>
                      <span className="text-white font-bold text-sm flex-none">{entry.points}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isMe ? "var(--accent)" : "rgba(255,255,255,0.3)" }} />
                      </div>
                      <span className="text-white/35 text-[10px] flex-none">
                        {entry.won}-{entry.drawn}-{entry.lost} · {entry.goalDiff > 0 ? `+${entry.goalDiff}` : entry.goalDiff}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Punti totali fantacalcio */}
        {standings.length > 0 && standings.some((e) => e.totalFp > 0) && (
          <div className="mt-3">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2 px-1">Punti totali fantacalcio</p>
            <div className="app-card overflow-hidden">
              {standings.slice().sort((a, b) => b.totalFp - a.totalFp).slice(0, 5).map((entry, i) => {
                const isMe = entry.teamName === myTeamName;
                return (
                  <div key={entry.teamName} className="flex items-center gap-3 px-3.5 py-2.5"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", background: isMe ? "rgba(133,124,240,0.1)" : "transparent" }}>
                    <span className="text-white/30 text-xs w-4 flex-none">{i + 1}</span>
                    <Logo name={entry.teamName} fallback={entry.logoEmoji} size={22} radius={7} />
                    <span className={`flex-1 text-sm truncate ${isMe ? "font-semibold" : "text-white"}`} style={isMe ? { color: "var(--accent-soft)" } : undefined}>{entry.teamName}</span>
                    <span className="text-white font-bold text-sm">{entry.totalFp.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
