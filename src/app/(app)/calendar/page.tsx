"use client";


import { useState } from "react";
import { MOCK_CALENDAR } from "@/lib/mock-data";

const TEAM_EMOJIS: Record<string, string> = {
  Internazionale: "🔵⚫", Milan: "🔴⚫", Juventus: "⚫⚪", Napoli: "🔵",
  Atalanta: "🔵⚫", Lazio: "🩵", Roma: "🟡🔴", Fiorentina: "🟣",
  Bologna: "🔴🔵", Torino: "🟤", Genoa: "🔴🔵", Udinese: "⚫⚪",
  Cagliari: "🔴🔵", Monza: "🔴⚪", Lecce: "🟡🔴", Empoli: "🔵",
  Verona: "🟡🔵", Venezia: "🟠⚫", Como: "🔵⚪", Parma: "🟡🔵",
};

function teamEmoji(name: string) {
  return TEAM_EMOJIS[name] ?? "⚽";
}

const DAYS = [34, 35, 36, 37, 38];

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(35);
  const [watchedTeams, setWatchedTeams] = useState<string[]>(["Internazionale"]);

  const matches = MOCK_CALENDAR.filter((m) => m.day === selectedDay);

  function toggleWatch(team: string) {
    setWatchedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  }

  return (
    <div className="screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h1 className="text-white font-bold text-xl">Calendario</h1>
        <p className="text-white/50 text-xs mt-0.5 font-medium">Serie A 2024/25</p>

        {/* Day selector */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {DAYS.map((day) => {
            const active = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: active ? "#34d399" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${active ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#052e16" : "rgba(255,255,255,0.6)",
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  Giornata
                </span>
                <span className="text-lg font-black">{day}</span>
                {day === 35 && (
                  <span className="text-[9px] font-bold opacity-80">Prossima</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matches */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest">
            {matches.length} partite
          </h2>
          <span className="text-white/35 text-xs">18 Maggio 2025</span>
        </div>

        <div className="flex flex-col gap-3">
          {matches.map((match) => {
            const isWatched =
              watchedTeams.includes(match.homeTeam) || watchedTeams.includes(match.awayTeam);
            return (
              <div
                key={match.id}
                className="rounded-2xl p-4 transition-all"
                style={{
                  background: isWatched ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isWatched ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {/* Time */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold ${isWatched ? "text-field-300" : "text-white/40"}`}>
                    {match.time}
                  </span>
                  {isWatched && (
                    <span className="text-xs bg-field-300/20 text-field-300 px-2 py-0.5 rounded-full font-semibold">
                      ⚡ I tuoi giocatori
                    </span>
                  )}
                </div>

                {/* Teams */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleWatch(match.homeTeam)}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                      watchedTeams.includes(match.homeTeam) ? "border-field-300 bg-field-300/10" : "border-white/10 bg-white/5"
                    }`}>
                      {teamEmoji(match.homeTeam)}
                    </div>
                    <span className="text-white text-xs font-semibold text-center leading-tight max-w-20">
                      {match.homeTeam}
                    </span>
                  </button>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-white font-black text-sm">VS</span>
                    </div>
                    <span className="text-white/20 text-[10px]">Casa</span>
                  </div>

                  <button
                    onClick={() => toggleWatch(match.awayTeam)}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                      watchedTeams.includes(match.awayTeam) ? "border-field-300 bg-field-300/10" : "border-white/10 bg-white/5"
                    }`}>
                      {teamEmoji(match.awayTeam)}
                    </div>
                    <span className="text-white text-xs font-semibold text-center leading-tight max-w-20">
                      {match.awayTeam}
                    </span>
                  </button>
                </div>

                {/* Tap to follow hint */}
                <p className="text-white/20 text-[10px] text-center mt-2">
                  Tocca una squadra per seguirla
                </p>
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="text-5xl mb-3">📅</span>
              <p className="text-white/50">Nessuna partita per questa giornata</p>
            </div>
          )}
        </div>
      </div>

      {/* Followed teams */}
      {watchedTeams.length > 0 && (
        <div className="mx-4 mt-6 mb-4">
          <h2 className="text-field-200 text-xs font-semibold uppercase tracking-wider mb-3">
            Squadre seguite
          </h2>
          <div className="flex flex-wrap gap-2">
            {watchedTeams.map((team) => (
              <button
                key={team}
                onClick={() => toggleWatch(team)}
                className="flex items-center gap-1.5 bg-field-300/10 border border-field-300/30 px-3 py-1.5 rounded-xl"
              >
                <span className="text-base">{teamEmoji(team)}</span>
                <span className="text-field-300 text-xs font-semibold">{team}</span>
                <span className="text-field-300/60 text-xs ml-0.5">✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
