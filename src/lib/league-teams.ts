// Recupera l'elenco delle squadre dalla pagina classifica della lega
// (stessa fonte/HTML usata da /api/standings).

const LEAGUE_SLUG = process.env.FANTACALCIO_LEAGUE_SLUG ?? "";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
};

export interface LeagueTeam {
  name: string;
  teamId: string | null;
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

export async function fetchLeagueTeams(): Promise<LeagueTeam[]> {
  if (!LEAGUE_SLUG) return [];
  try {
    const res = await fetch(`https://leghe.fantacalcio.it/${LEAGUE_SLUG}`, {
      headers: HEADERS,
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return parseTeams(await res.text());
  } catch {
    return [];
  }
}
