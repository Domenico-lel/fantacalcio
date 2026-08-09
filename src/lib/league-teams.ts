// Recupera l'elenco delle squadre dalla pagina classifica della lega
// (stessa fonte/HTML usata da /api/standings).

import { getLeagueSlug, leagueUrlFromSlug } from "@/lib/league-config";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
};

export interface LeagueTeam {
  name: string;
  teamId: string | null;
}

export interface LeagueTeamsResult {
  teams: LeagueTeam[];
  error: string | null;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTeams(html: string): LeagueTeam[] {
  const teams: LeagueTeam[] = [];
  const seen = new Set<string>();
  const rowRegex = /<tr[^>]*class="ranking-row"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(html)) !== null) {
    const row = m[1];
    const cell = row.match(/data-key\s*=\s*["']teamName["'][^>]*>([\s\S]*?)<\/td>/i);
    let name = "";
    if (cell) {
      const a = cell[1].match(/<a[^>]*>([^<]+)<\/a>/i);
      name = decode(a ? a[1] : cell[1]);
    }
    const idMatch = row.match(/rose\?t=(\d+)/i);
    const teamId = idMatch ? idMatch[1] : null;
    if (name && !seen.has(name)) {
      seen.add(name);
      teams.push({ name, teamId });
    }
  }
  return teams;
}

export async function fetchLeagueTeams(): Promise<LeagueTeamsResult> {
  const slug = await getLeagueSlug();
  if (!slug) {
    return { teams: [], error: "Link della lega non configurato: aggiungilo nella sezione Gestione." };
  }

  const url = leagueUrlFromSlug(slug);
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return { teams: [], error: `La pagina della lega risponde ${res.status}. Controlla il link salvato in Gestione.` };
    }
    const teams = parseTeams(await res.text());
    return teams.length > 0
      ? { teams, error: null }
      : { teams: [], error: "La pagina è raggiungibile, ma non contiene una classifica leggibile." };
  } catch {
    return { teams: [], error: "Impossibile raggiungere la pagina della lega. Riprova tra poco." };
  }
}
