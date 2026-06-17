"use client";

import { MOCK_PLAYERS, Player, FORMATIONS } from "./mock-data";

export interface TeamProfile {
  firstName: string;
  lastName: string;
  teamName: string;
  logo: string;
  budget: number;
}

export interface SquadState {
  roster: Player[];
  formation: string;
  starters: number[];
  captainId: number | null;
  viceCaptainId: number | null;
}

export interface AppState {
  profile: TeamProfile | null;
  squad: SquadState;
}

const DEFAULT_ROSTER_IDS = [1, 11, 12, 16, 18, 31, 32, 38, 51, 52, 53];
const DEFAULT_BENCH_IDS = [2, 13, 34, 39, 57, 63, 67, 25, 40, 44, 68, 61, 56, 14, 4];

const STORAGE_KEY = "fantacalcio-state";

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as AppState;
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function defaultState(): AppState {
  const allIds = [...DEFAULT_ROSTER_IDS, ...DEFAULT_BENCH_IDS];
  const roster = MOCK_PLAYERS.filter((p) => allIds.includes(p.id));
  return {
    profile: null,
    squad: {
      roster,
      formation: FORMATIONS[0],
      starters: DEFAULT_ROSTER_IDS,
      captainId: 51,
      viceCaptainId: 31,
    },
  };
}

export function getStarters(squad: SquadState): Player[] {
  return squad.starters
    .map((id) => squad.roster.find((p) => p.id === id))
    .filter(Boolean) as Player[];
}

export function getBench(squad: SquadState): Player[] {
  return squad.roster.filter((p) => !squad.starters.includes(p.id));
}

export function toggleStarter(squad: SquadState, playerId: number): SquadState {
  const isStarter = squad.starters.includes(playerId);
  if (isStarter) {
    return { ...squad, starters: squad.starters.filter((id) => id !== playerId) };
  }
  return { ...squad, starters: [...squad.starters, playerId] };
}

export function swapPlayers(squad: SquadState, id1: number, id2: number): SquadState {
  const starters = [...squad.starters];
  const idx1 = starters.indexOf(id1);
  const idx2 = starters.indexOf(id2);
  const isId1Starter = idx1 !== -1;
  const isId2Starter = idx2 !== -1;

  if (isId1Starter && !isId2Starter) {
    const newStarters = starters.filter((id) => id !== id1);
    newStarters.splice(idx1, 0, id2);
    return { ...squad, starters: newStarters };
  }
  if (!isId1Starter && isId2Starter) {
    const newStarters = starters.filter((id) => id !== id2);
    newStarters.splice(idx2, 0, id1);
    return { ...squad, starters: newStarters };
  }
  if (isId1Starter && isId2Starter) {
    const tmp = starters[idx1];
    starters[idx1] = starters[idx2];
    starters[idx2] = tmp;
    return { ...squad, starters };
  }
  return squad;
}
