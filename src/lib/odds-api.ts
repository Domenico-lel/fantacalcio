// Provider quote 1/X/2: The Odds API (v4).
// Chiave gratuita in env ODDS_API_KEY (500 richieste/mese). Server-side.
// Le quote sono la MEDIA dei bookmaker europei per il mercato "h2h" (1X2).

import type { ExtMatch } from "@/lib/bet-constants";

const BASE = "https://api.the-odds-api.com/v4";

export function isOddsApiConfigured(): boolean {
  return !!(process.env.ODDS_API_KEY || "").trim();
}

interface OddsQuote {
  home: string;
  away: string;
  commence: string; // ISO
  odd1: number;
  oddX: number;
  odd2: number;
}

type OddsOutcome = { name: string; price: number };
type OddsEvent = {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: { markets?: { key: string; outcomes?: OddsOutcome[] }[] }[];
};

// Media (arrotondata) delle quote h2h di tutti i bookmaker per una partita.
function averageQuote(ev: OddsEvent): OddsQuote | null {
  const home: number[] = [];
  const draw: number[] = [];
  const away: number[] = [];
  for (const bk of ev.bookmakers ?? []) {
    const mkt = (bk.markets ?? []).find((m) => m.key === "h2h");
    if (!mkt) continue;
    for (const o of mkt.outcomes ?? []) {
      if (o.name === ev.home_team) home.push(o.price);
      else if (o.name === ev.away_team) away.push(o.price);
      else if (o.name === "Draw") draw.push(o.price);
    }
  }
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const o1 = avg(home), oX = avg(draw), o2 = avg(away);
  if (o1 < 1 || oX < 1 || o2 < 1) return null;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { home: ev.home_team, away: ev.away_team, commence: ev.commence_time, odd1: r(o1), oddX: r(oX), odd2: r(o2) };
}

async function fetchQuotes(sportKey: string): Promise<OddsQuote[]> {
  const key = (process.env.ODDS_API_KEY || "").trim();
  const url = `${BASE}/sports/${encodeURIComponent(sportKey)}/odds?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as OddsEvent[] | null;
  if (!Array.isArray(json)) return [];
  return json.map(averageQuote).filter((q): q is OddsQuote => q !== null);
}

// ── Abbinamento partita ↔ quote per nome squadra (i provider usano nomi diversi) ──

const STOP = new Set([
  "fc", "ac", "as", "ss", "ssc", "us", "usl", "cf", "cfc", "afc", "bc", "sc",
  "calcio", "club", "de", "of", "1907", "1909", "1913", "1919", "milano",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove accenti/diacritici
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function teamsMatch(a: string, b: string): boolean {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const setB = new Set(tb);
  if (ta.some((t) => t.length >= 3 && setB.has(t))) return true;
  const ja = ta.join(""), jb = tb.join("");
  return ja.length >= 4 && jb.length >= 4 && (ja.includes(jb) || jb.includes(ja));
}

function findQuote(m: ExtMatch, quotes: OddsQuote[]): OddsQuote | null {
  const day = m.kickoff.slice(0, 10);
  const byNames = quotes.filter((q) => teamsMatch(m.homeName, q.home) && teamsMatch(m.awayName, q.away));
  if (byNames.length === 0) return null;
  return byNames.find((q) => q.commence.slice(0, 10) === day) ?? byNames[0];
}

// Arricchisce le partite con le quote medie, quando disponibili. Non fallisce mai:
// in caso di errore/chiave mancante restituisce le partite invariate.
export async function annotateWithOdds(matches: ExtMatch[], sportKey?: string): Promise<ExtMatch[]> {
  if (!isOddsApiConfigured() || !sportKey || matches.length === 0) return matches;
  try {
    const quotes = await fetchQuotes(sportKey);
    if (quotes.length === 0) return matches;
    return matches.map((m) => {
      const q = findQuote(m, quotes);
      return q ? { ...m, odd1: q.odd1, oddX: q.oddX, odd2: q.odd2 } : m;
    });
  } catch {
    return matches;
  }
}
