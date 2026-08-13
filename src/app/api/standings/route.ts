import { NextResponse } from "next/server";
import { getLeagueUrl } from "@/lib/league-config";

export interface StandingEntry {
  position: number;
  teamName: string;
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

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
};

function parseStandingsFromHtml(html: string): StandingEntry[] {
  const standings: StandingEntry[] = [];
  const rowRegex = /<tr[^>]*class="ranking-row"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const getCell = (key: string): string => {
      const pattern = `data-key\\s*=\\s*["\']${key}["\']`;
      const cellRegex = new RegExp(`<td[^>]*${pattern}[^>]*>([\\s\\S]*?)<\\/td>`, "i");
      const match = cellRegex.exec(rowHtml);
      if (!match) return "";
      let content = match[1];
      if (key === "teamName") {
        const aMatch = content.match(/<a[^>]*>([^<]+)<\/a>/i);
        if (aMatch) content = aMatch[1];
      }
      return content
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .trim();
    };

    const posStr = getCell("index");
    if (!posStr) continue;

    const position = parseInt(posStr, 10);
    const teamName = getCell("teamName");
    const played = parseInt(getCell("rank-g"), 10) || 0;
    const won = parseInt(getCell("rank-v"), 10) || 0;
    const drawn = parseInt(getCell("rank-n"), 10) || 0;
    const lost = parseInt(getCell("rank-p"), 10) || 0;
    const goalsFor = parseInt(getCell("rank-gf"), 10) || 0;
    const goalsAgainst = parseInt(getCell("rank-gs"), 10) || 0;
    const goalDiff = parseInt(getCell("rank-dr"), 10) || 0;
    const points = parseInt(getCell("rank-pt"), 10) || 0;
    const totalFpStr = getCell("rank-fp").replace(",", ".");
    const totalFp = parseFloat(totalFpStr) || 0;

    if (!teamName) continue;

    standings.push({ position, teamName, points, totalFp, played, won, drawn, lost, goalDiff, goalsFor, goalsAgainst });
  }

  return standings;
}

async function fetchStandings(): Promise<{ items: StandingEntry[]; error: string | null }> {
  const url = await getLeagueUrl();
  if (!url) return { items: [], error: "Link della lega non configurato" };
  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 600 } });
    if (!res.ok) return { items: [], error: `La pagina della lega risponde ${res.status}` };
    const html = await res.text();
    const items = parseStandingsFromHtml(html);
    return items.length > 0
      ? { items, error: null }
      : { items: [], error: "La pagina della lega non contiene una classifica leggibile" };
  } catch {
    return { items: [], error: "Impossibile raggiungere la pagina della lega" };
  }
}

export async function GET() {
  const standings = await fetchStandings();
  return NextResponse.json(
    standings,
    { headers: { "Cache-Control": "no-store" } }
  );
}
