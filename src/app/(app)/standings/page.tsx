"use client";


import { useEffect, useState } from "react";
import { MOCK_STANDINGS } from "@/lib/mock-data";
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

  // Loghi reali delle squadre (caricati dall'admin)
  useEffect(() => {
    fetchTeams().then((teams) => {
      const map: Record<string, string> = {};
      for (const t of teams) if (t.logoUrl) map[t.name] = t.logoUrl;
      setTeamLogos(map);
    }).catch(() => {});
  }, []);

  const renderLogo = (teamName: string, fallback: string, size: number) => {
    const url = teamLogos[teamName];
    return url
      ? <img src={url} alt="" className="rounded-full object-cover inline-block align-middle" style={{ width: size, height: size }} />
      : <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{fallback}</span>;
  };

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
      } catch (error) {
        console.error("Error loading standings:", error);
        setStandings(
          MOCK_STANDINGS.map((entry) => ({
            ...entry,
            totalFp: 0,
            goalDiff: entry.goalsFor - entry.goalsAgainst,
            teamName: entry.teamName === "La tua Squadra" ? myTeamName : entry.teamName,
            logoEmoji: entry.teamName === "La tua Squadra" ? myLogo : assignLogoToTeam(entry.teamName),
          }))
        );
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, [myTeamName, myLogo]);

  const myEntry = standings.find((e) => e.teamName === myTeamName);

  if (loading && standings.length === 0) {
    return (
      <div className="min-h-dvh" style={{ background: "#0d1f14" }}>
        <div className="px-4 pt-12 pb-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h1 className="text-white font-bold text-xl">Classifica</h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <p className="text-white/50">Caricamento classifica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h1 className="text-white font-bold text-xl">Classifica</h1>
        <p className="text-white/50 text-xs mt-0.5 font-medium">{standings.length} squadre • aggiornamento automatico</p>
      </div>

      {/* My position card */}
      {myEntry && (
        <div className="mx-4 mt-4 rounded-2xl p-4"
             style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">La tua posizione</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-emerald-400">#{myEntry.position}</span>
            <div className="flex items-center gap-2 flex-1">
              {renderLogo(myEntry.teamName, myEntry.logoEmoji, 26)}
              <div>
                <p className="text-white font-semibold">{myEntry.teamName}</p>
                <p className="text-white/50 text-xs">{myEntry.points} pt classifica • {myEntry.totalFp.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pt totali</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 font-bold text-xl">{myEntry.points}</p>
              <p className="text-white/40 text-xs">punti</p>
            </div>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="px-4 mt-4">
        <div className="flex items-center px-3 mb-1 text-white/40 text-[10px] font-semibold uppercase tracking-widest">
          <span className="w-6">#</span>
          <span className="flex-1 pl-2">Squadra</span>
          <span className="w-8 text-center">V</span>
          <span className="w-8 text-center">N</span>
          <span className="w-8 text-center">P</span>
          <span className="w-8 text-center">DR</span>
          <span className="w-10 text-right font-bold text-white/40">PT</span>
        </div>

        <div className="flex flex-col gap-1">
          {standings.map((entry) => {
            const isMe = entry.teamName === myTeamName;
            return (
              <div
                key={entry.position}
                className="flex items-center px-3 py-3 rounded-xl"
                style={{
                  background: isMe ? "rgba(52,211,153,0.1)" : entry.position <= 3 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                  border: isMe ? "1px solid rgba(52,211,153,0.25)" : "1px solid transparent",
                }}
              >
                {/* Position */}
                <div className="w-6">
                  {entry.position <= 3 ? (
                    <span className="text-base">
                      {entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <span className="text-white/35 text-sm font-mono">{entry.position}</span>
                  )}
                </div>

                {/* Team */}
                <div className="flex items-center gap-2 flex-1 pl-2 min-w-0">
                  {renderLogo(entry.teamName, entry.logoEmoji, 22)}
                  <span className={`text-sm font-semibold truncate ${isMe ? "text-emerald-400" : "text-white"}`}>
                    {entry.teamName}
                  </span>
                </div>

                {/* Stats: V N P DR PT */}
                <span className="w-8 text-center text-emerald-400/80 text-xs font-semibold">{entry.won}</span>
                <span className="w-8 text-center text-white/40 text-xs">{entry.drawn}</span>
                <span className="w-8 text-center text-red-400/70 text-xs">{entry.lost}</span>
                <span className={`w-8 text-center text-xs font-semibold ${entry.goalDiff > 0 ? "text-emerald-400/70" : entry.goalDiff < 0 ? "text-red-400/70" : "text-white/40"}`}>
                  {entry.goalDiff > 0 ? `+${entry.goalDiff}` : entry.goalDiff}
                </span>
                <span className="w-10 text-right text-white font-bold text-sm">{entry.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PT Totali top 5 */}
      {standings.length > 0 && (
        <div className="mx-4 mt-6 mb-4">
          <h2 className="text-emerald-400/70 text-xs font-semibold uppercase tracking-wider mb-3">Punti Totali Fantacalcio</h2>
          <div className="flex flex-col gap-1">
            {standings
              .slice()
              .sort((a, b) => b.totalFp - a.totalFp)
              .slice(0, 5)
              .map((entry) => {
                const isMe = entry.teamName === myTeamName;
                return (
                  <div key={entry.position} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? "bg-emerald-400/10" : "bg-white/5"}`}>
                    {renderLogo(entry.teamName, entry.logoEmoji, 18)}
                    <span className={`flex-1 text-sm truncate ${isMe ? "text-emerald-400 font-semibold" : "text-white"}`}>{entry.teamName}</span>
                    <span className={`text-sm font-bold ${isMe ? "text-emerald-400" : "text-white/80"}`}>
                      {entry.totalFp.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
