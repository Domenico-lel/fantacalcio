"use client";

import { useEffect, useState } from "react";
import { MOCK_STANDINGS } from "@/lib/mock-data";
import { loadState } from "@/lib/store";

export default function StandingsPage() {
  const [myTeamName, setMyTeamName] = useState("La tua Squadra");
  const [myLogo, setMyLogo] = useState("⭐");

  useEffect(() => {
    const s = loadState();
    if (s.profile) {
      setMyTeamName(s.profile.teamName);
      setMyLogo(s.profile.logo);
    }
  }, []);

  const standings = MOCK_STANDINGS.map((entry) =>
    entry.teamName === "La tua Squadra"
      ? { ...entry, teamName: myTeamName, logoEmoji: myLogo }
      : entry
  );

  const myEntry = standings.find((e) => e.teamName === myTeamName);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h1 className="text-white font-bold text-xl">Classifica</h1>
        <p className="text-white/50 text-xs mt-0.5 font-medium">Giornata 12 di 38</p>
      </div>

      {/* My position card */}
      {myEntry && (
        <div className="mx-4 mt-4 rounded-2xl p-4"
             style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">La tua posizione</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-emerald-400">#{myEntry.position}</span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{myEntry.logoEmoji}</span>
              <div>
                <p className="text-white font-semibold">{myEntry.teamName}</p>
                <p className="text-white/50 text-xs">{myEntry.points} punti • {myEntry.played} giocate</p>
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
          <span className="w-8 text-center">G</span>
          <span className="w-8 text-center">V</span>
          <span className="w-8 text-center">P</span>
          <span className="w-8 text-center">S</span>
          <span className="w-10 text-right font-bold text-white/40">Pts</span>
        </div>

        <div className="flex flex-col gap-1">
          {standings.map((entry) => {
            const isMe = entry.teamName === myTeamName;
            return (
              <div
                key={entry.position}
                className="flex items-center px-3 py-3 rounded-xl transition-colors"
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
                  <span className="text-xl">{entry.logoEmoji}</span>
                  <span className={`text-sm font-semibold truncate ${isMe ? "text-emerald-400" : "text-white"}`}>
                    {entry.teamName}
                  </span>
                </div>

                {/* Stats */}
                <span className="w-8 text-center text-white/60 text-xs">{entry.played}</span>
                <span className="w-8 text-center text-field-300 text-xs font-semibold">{entry.won}</span>
                <span className="w-8 text-center text-white/40 text-xs">{entry.drawn}</span>
                <span className="w-8 text-center text-red-400/70 text-xs">{entry.lost}</span>
                <span className="w-10 text-right text-white font-bold text-sm">{entry.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goals stats */}
      <div className="mx-4 mt-6 mb-4">
        <h2 className="text-field-200 text-xs font-semibold uppercase tracking-wider mb-3">GF / GS</h2>
        <div className="flex flex-col gap-1">
          {standings.slice(0, 5).map((entry) => {
            const isMe = entry.teamName === myTeamName;
            const diff = entry.goalsFor - entry.goalsAgainst;
            return (
              <div key={entry.position} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? "bg-field-300/10" : "bg-white/5"}`}>
                <span className="text-base">{entry.logoEmoji}</span>
                <span className={`flex-1 text-sm truncate ${isMe ? "text-field-300 font-semibold" : "text-white"}`}>{entry.teamName}</span>
                <span className="text-green-400 text-xs font-semibold">{entry.goalsFor}</span>
                <span className="text-white/20 text-xs">|</span>
                <span className="text-red-400 text-xs font-semibold">{entry.goalsAgainst}</span>
                <span className={`text-xs font-bold w-8 text-right ${diff >= 0 ? "text-field-300" : "text-red-400"}`}>
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
