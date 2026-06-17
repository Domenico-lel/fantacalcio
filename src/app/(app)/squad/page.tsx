"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppUser } from "@/lib/app-user-context";
import {
  loadState, saveState, AppState, getStarters, getBench, swapPlayers,
} from "@/lib/store";
import { parseFormation, ROLE_COLORS, Player } from "@/lib/mock-data";
import PlayerSheet from "@/components/PlayerSheet";
import FormationPicker from "@/components/FormationPicker";
import ProfileDrawer from "@/components/ProfileDrawer";
import { fetchProfile, fetchSquad, upsertSquad } from "@/app/actions";

const DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_DEMO === "true";

export default function SquadPage() {
  const user = useAppUser();
  const [state, setState] = useState<AppState | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const [swapTarget, setSwapTarget] = useState<Player | null>(null);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    async function load() {
      // Start from localStorage immediately for instant paint
      const local = loadState();
      setState(local);

      // Then try to hydrate from Supabase (overrides localStorage if user has remote data)
      const userId = DEMO_MODE ? "demo-user" : user.id;
      const [profileRes, squadRes] = await Promise.all([
        fetchProfile(userId),
        fetchSquad(userId),
      ]);

      const remoteProfile = profileRes.data ?? local.profile;
      const remoteSquad = squadRes.data ?? local.squad;
      const merged: AppState = { profile: remoteProfile, squad: remoteSquad };
      setState(merged);
      saveState(merged); // keep localStorage in sync
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const persist = useCallback((next: AppState) => {
    setState(next);
    saveState(next);
    // Fire-and-forget sync to Supabase
    const userId = DEMO_MODE ? "demo-user" : user.id;
    upsertSquad(userId, next.squad).catch(console.error);
  }, [user.id]);

  if (!state) {
    return (
      <div className="min-h-screen pitch-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-field-300 border-t-transparent animate-spin" />
      </div>
    );
  }

  const profile = state.profile;
  const squad = state.squad;
  const starters = getStarters(squad);
  const bench = getBench(squad);
  const formation = squad.formation;
  const rows = parseFormation(formation);

  // Group starters by row
  const groupedRows: Player[][] = [];
  let idx = 0;
  // Goalkeeper
  const gk = starters.find((p) => p.role === "P") ?? starters[0];
  groupedRows.push([gk]);
  idx = 1;

  // Outfield rows from formation
  for (const count of rows.slice(0, -1)) {
    const outfield = starters.filter((p) => p.role !== "P").slice(idx - 1, idx - 1 + count);
    groupedRows.push(outfield.length ? outfield : []);
    idx += count;
  }
  // Last row = attackers
  const lastCount = rows[rows.length - 1];
  const lastRow = starters.filter((p) => p.role === "A").slice(0, lastCount);
  if (lastRow.length > 0) groupedRows[groupedRows.length] = lastRow;

  // Simpler approach: just split starters into 1 + rows from formation
  const startersByRole = {
    P: starters.filter((p) => p.role === "P"),
    D: starters.filter((p) => p.role === "D"),
    C: starters.filter((p) => p.role === "C"),
    A: starters.filter((p) => p.role === "A"),
  };

  const pitchRows: Player[][] = [
    startersByRole.A,
    startersByRole.C,
    startersByRole.D,
    startersByRole.P,
  ];

  function handlePlayerTap(player: Player) {
    if (swapTarget) {
      if (swapTarget.id === player.id) {
        setSwapTarget(null);
        return;
      }
      const nextSquad = swapPlayers(squad, swapTarget.id, player.id);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      persist({ profile: state!.profile ?? null, squad: nextSquad });
      setSwapTarget(null);
    } else {
      setSelected(player);
    }
  }

  function handleSwap(player: Player) {
    setSelected(null);
    setSwapTarget(player);
  }

  function handleToggleCaptain(player: Player) {
    persist({ profile: state!.profile ?? null, squad: { ...squad, captainId: player.id } });
    setSelected(null);
  }

  function handleToggleViceCaptain(player: Player) {
    persist({ profile: state!.profile ?? null, squad: { ...squad, viceCaptainId: player.id } });
    setSelected(null);
  }

  const totalValue = squad.roster.reduce((s, p) => s + p.value, 0);
  const weekPoints = starters.reduce((s, p) => s + (p.id === squad.captainId ? p.avgPoints * 2 : p.avgPoints), 0);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 active:opacity-70 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border"
                 style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}>
              {profile?.logo ?? "⚽"}
            </div>
            <div className="text-left">
              <p className="text-emerald-300 text-xs font-medium">{user.fullName || profile?.firstName || "Allenatore"}</p>
              <h1 className="text-white font-bold text-lg leading-tight">
                {profile?.teamName ?? "La tua Squadra"}
              </h1>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/30 ml-1">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="text-right">
            <p className="text-white/40 text-xs">Crediti</p>
            <p className="text-emerald-300 font-bold">{profile?.budget ?? 500}M</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-2 mt-4">
          {[
            { label: "Giocatori", value: squad.roster.length },
            { label: "Valore rosa", value: `${totalValue}M` },
            { label: "Media ptg.", value: weekPoints.toFixed(1) },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-xl px-3 py-2.5 text-center"
                 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-white font-bold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formation selector */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setShowFormPicker(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <span>⚙️</span>
          <span>{formation}</span>
          <span className="text-white/40 text-xs ml-1">▾</span>
        </button>
        {swapTarget && (
          <span className="text-emerald-400 text-xs font-medium animate-pulse">
            ↔ Seleziona con chi scambiare
          </span>
        )}
      </div>

      {/* Pitch */}
      <div className="mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="pitch-bg relative" style={{ minHeight: 420 }}>
          {/* Field markings */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20" />
          <div className="absolute inset-x-8 top-2 h-14 border border-white/20 rounded-b-xl" />
          <div className="absolute inset-x-8 bottom-2 h-14 border border-white/20 rounded-t-xl" />

          {/* Players */}
          <div className="relative flex flex-col justify-around h-full py-4 gap-2" style={{ minHeight: 420 }}>
            {pitchRows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-2 flex-wrap">
                {row.map((player) => (
                  <PitchPlayer
                    key={player.id}
                    player={player}
                    isCaptain={squad.captainId === player.id}
                    isVice={squad.viceCaptainId === player.id}
                    isSelected={swapTarget?.id === player.id}
                    onTap={() => handlePlayerTap(player)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bench */}
      <div className="px-4 mt-4">
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
          Panchina ({bench.length})
        </h2>
        <div className="flex flex-col gap-2">
          {bench.map((player) => (
            <BenchPlayer
              key={player.id}
              player={player}
              isSelected={swapTarget?.id === player.id}
              onTap={() => handlePlayerTap(player)}
            />
          ))}
        </div>
      </div>

      <div className="h-8" />

      {/* Player detail sheet */}
      {selected && (
        <PlayerSheet
          player={selected}
          isCaptain={squad.captainId === selected.id}
          isVice={squad.viceCaptainId === selected.id}
          isStarter={squad.starters.includes(selected.id)}
          onClose={() => setSelected(null)}
          onSwap={() => handleSwap(selected)}
          onCaptain={() => handleToggleCaptain(selected)}
          onViceCaptain={() => handleToggleViceCaptain(selected)}
        />
      )}

      {/* Formation picker */}
      {showFormPicker && (
        <FormationPicker
          current={formation}
          onSelect={(f) => {
            persist({ profile: state!.profile ?? null, squad: { ...squad, formation: f } });
            setShowFormPicker(false);
          }}
          onClose={() => setShowFormPicker(false)}
        />
      )}

      {/* Profile drawer */}
      <ProfileDrawer
        open={showProfile}
        onClose={() => setShowProfile(false)}
        teamName={profile?.teamName}
        logo={profile?.logo}
        budget={profile?.budget}
      />
    </div>
  );
}

function PitchPlayer({
  player, isCaptain, isVice, isSelected, onTap,
}: {
  player: Player;
  isCaptain: boolean;
  isVice: boolean;
  isSelected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className={`player-badge flex flex-col items-center gap-0.5 relative ${isSelected ? "scale-110" : ""}`}
    >
      <div className={`w-10 h-10 rounded-full bg-white/10 border-2 flex items-center justify-center text-lg shadow-lg transition-all ${
        isSelected ? "border-yellow-400 bg-yellow-400/20" : "border-white/30"
      }`}>
        {player.role === "P" ? "🧤" : player.role === "D" ? "🛡️" : player.role === "C" ? "⚡" : "🔥"}
      </div>
      {(isCaptain || isVice) && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center text-[8px] font-black text-field-900">
          {isCaptain ? "C" : "V"}
        </div>
      )}
      <div className="bg-field-900/80 backdrop-blur px-1.5 py-0.5 rounded text-white text-[9px] font-semibold max-w-16 truncate leading-tight">
        {player.name.split(" ").pop()}
      </div>
      <span className={`text-[9px] font-bold px-1 rounded ${ROLE_COLORS[player.role]}`}>
        {player.avgPoints.toFixed(1)}
      </span>
    </button>
  );
}

function BenchPlayer({ player, isSelected, onTap }: { player: Player; isSelected: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
      style={{
        background: isSelected ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${isSelected ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.09)"}`,
      }}
    >
      <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${ROLE_COLORS[player.role]}`}>
        {player.role}
      </span>
      <span className="text-white text-sm font-semibold flex-1 truncate">{player.name}</span>
      <span className="text-white/40 text-xs shrink-0">{player.team.substring(0, 3).toUpperCase()}</span>
      <span className="text-emerald-400 text-sm font-bold shrink-0">{player.avgPoints.toFixed(1)}</span>
    </button>
  );
}
