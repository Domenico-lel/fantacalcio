// Recupera le squadre dalla stessa API autenticata della classifica.
// Il vecchio HTML è ormai soltanto il guscio di un'app JavaScript protetta.

import { fetchFantacalcioStandings } from "@/lib/fantacalcio-api";

export interface LeagueTeam {
  name: string;
  teamId: string | null;
}

export interface LeagueTeamsResult {
  teams: LeagueTeam[];
  error: string | null;
}

export async function fetchLeagueTeams(): Promise<LeagueTeamsResult> {
  const { items, error } = await fetchFantacalcioStandings();
  const seen = new Set<string>();
  const teams = items.reduce<LeagueTeam[]>((all, standing) => {
    if (!seen.has(standing.teamName)) {
      seen.add(standing.teamName);
      all.push({ name: standing.teamName, teamId: standing.teamId });
    }
    return all;
  }, []);
  return { teams, error };
}
