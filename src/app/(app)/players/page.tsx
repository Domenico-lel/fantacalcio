"use client";

import { useState, useMemo } from "react";
import { MOCK_PLAYERS, SERIE_A_TEAMS, ROLE_COLORS, ROLE_FULL_LABELS, Role, Player } from "@/lib/mock-data";
import PlayerSheet from "@/components/PlayerSheet";

const ROLES: Role[] = ["P", "D", "C", "A"];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"points" | "value" | "goals">("points");
  const [selected, setSelected] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    return MOCK_PLAYERS
      .filter((p) => {
        if (roleFilter !== "ALL" && p.role !== roleFilter) return false;
        if (teamFilter !== "ALL" && p.team !== teamFilter) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.team.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "points") return b.avgPoints - a.avgPoints;
        if (sortBy === "value") return b.value - a.value;
        return b.goals - a.goals;
      });
  }, [search, roleFilter, teamFilter, sortBy]);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 sticky top-0 z-10"
           style={{ background: "rgba(13,31,20,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h1 className="text-white font-bold text-xl mb-3">Giocatori</h1>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔍</span>
          <input
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            placeholder="Cerca giocatore o squadra…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <RoleChip label="Tutti" active={roleFilter === "ALL"} onClick={() => setRoleFilter("ALL")} />
          {ROLES.map((r) => (
            <RoleChip
              key={r}
              label={r}
              active={roleFilter === r}
              onClick={() => setRoleFilter(r)}
              colorClass={ROLE_COLORS[r]}
            />
          ))}
        </div>
      </div>

      {/* Sort + count */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-white/50 text-xs font-medium">{filtered.length} giocatori</span>
        <div className="flex gap-1">
          {(["points", "value", "goals"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                sortBy === s ? "bg-field-300 text-field-900 font-bold" : "text-white/40"
              }`}
            >
              {s === "points" ? "Media" : s === "value" ? "Valore" : "Gol"}
            </button>
          ))}
        </div>
      </div>

      {/* Players list */}
      <div className="flex flex-col">
        {filtered.map((player, i) => (
          <button
            key={player.id}
            onClick={() => setSelected(player)}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors text-left w-full hover:bg-white/5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Rank */}
            <span className="text-white/35 text-xs w-5 text-center font-mono shrink-0">{i + 1}</span>

            {/* Role badge */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${ROLE_COLORS[player.role]}`}>
              {player.role}
            </span>

            {/* Name + team */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{player.name}</p>
              <p className="text-white/45 text-xs truncate">{player.team}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 shrink-0">
              {sortBy === "goals" && (
                <div className="text-center">
                  <p className="text-white font-bold text-sm">{player.goals}</p>
                  <p className="text-white/35 text-[10px]">gol</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-emerald-400 font-bold text-sm">{player.value}M</p>
                <p className="text-white/35 text-[10px]">valore</p>
              </div>
              <div className="text-center min-w-8">
                <p className="text-white font-bold text-sm">{player.avgPoints.toFixed(1)}</p>
                <p className="text-white/35 text-[10px]">media</p>
              </div>
            </div>

            <span className="text-white/25 text-xs">›</span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <span className="text-5xl mb-3">🔍</span>
            <p className="text-white/60 text-sm">Nessun giocatore trovato</p>
          </div>
        )}
      </div>

      <div className="h-8" />

      {selected && (
        <PlayerSheet
          player={selected}
          isCaptain={false}
          isVice={false}
          isStarter={false}
          readOnly
          onClose={() => setSelected(null)}
          onSwap={() => {}}
          onCaptain={() => {}}
          onViceCaptain={() => {}}
        />
      )}
    </div>
  );
}

function RoleChip({
  label, active, onClick, colorClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
        active
          ? colorClass ?? "bg-white text-field-900"
          : "bg-white/10 text-white/60"
      }`}
    >
      {label}
    </button>
  );
}
