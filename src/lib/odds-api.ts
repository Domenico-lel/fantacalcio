// Provider quote 1/X/2: The Odds API (v4).
// Chiave gratuita in env ODDS_API_KEY (500 richieste/mese). Server-side.
// Le quote derivano dal CONSENSO dei bookmaker europei per il mercato "h2h"
// (1X2): de-marginazione per fonte, rimozione outlier e margine uniforme app.

import type { ExtMatch } from "@/lib/bet-constants";
import { calculateBookmakerConsensus, type ThreeWayPrice } from "@/lib/odds-consensus";

const BASE = "https://api.the-odds-api.com/v4";
const REQUEST_TIMEOUT_MS = 10_000;

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
  sources: number;
}

type OddsOutcome = { name: string; price: number };
type OddsEvent = {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: { markets?: { key: string; outcomes?: OddsOutcome[] }[] }[];
};

// Consenso delle lavagne complete: una fonte priva anche di un solo esito non
// viene inclusa, perché non sarebbe possibile rimuoverne correttamente il margine.
function consensusQuote(ev: OddsEvent): OddsQuote | null {
  const prices: ThreeWayPrice[] = [];
  for (const bk of ev.bookmakers ?? []) {
    const mkt = (bk.markets ?? []).find((m) => m.key === "h2h");
    if (!mkt) continue;
    let odd1 = 0;
    let oddX = 0;
    let odd2 = 0;
    for (const o of mkt.outcomes ?? []) {
      if (o.name === ev.home_team) odd1 = o.price;
      else if (o.name === ev.away_team) odd2 = o.price;
      else if (o.name === "Draw") oddX = o.price;
    }
    if (odd1 > 1 && oddX > 1 && odd2 > 1) prices.push({ odd1, oddX, odd2 });
  }
  const consensus = calculateBookmakerConsensus(prices);
  if (!consensus) return null;
  return {
    home: ev.home_team,
    away: ev.away_team,
    commence: ev.commence_time,
    ...consensus,
    sources: prices.length,
  };
}

async function fetchQuotes(sportKey: string): Promise<OddsQuote[]> {
  const key = (process.env.ODDS_API_KEY || "").trim();
  const url = `${BASE}/sports/${encodeURIComponent(sportKey)}/odds?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`The Odds API ha risposto ${res.status}`);
  const json = (await res.json().catch(() => null)) as OddsEvent[] | null;
  if (!Array.isArray(json)) throw new Error("Risposta non valida da The Odds API");
  return json.map(consensusQuote).filter((q): q is OddsQuote => q !== null);
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

// Arricchisce le partite con le quote consenso, quando disponibili. Non fallisce mai:
// in caso di errore/chiave mancante restituisce le partite invariate.
export async function annotateWithOdds(matches: ExtMatch[], sportKey?: string): Promise<ExtMatch[]> {
  return (await annotateWithOddsDetailed(matches, sportKey)).matches;
}

export interface OddsAnnotationResult {
  matches: ExtMatch[];
  matched: number;
  error: string | null;
}

/** Variante dettagliata usata dall'automazione, che deve poter avvisare l'admin. */
export async function annotateWithOddsDetailed(
  matches: ExtMatch[],
  sportKey?: string,
): Promise<OddsAnnotationResult> {
  if (matches.length === 0) return { matches, matched: 0, error: null };
  if (!sportKey) return { matches, matched: 0, error: "Competizione non supportata dal provider quote." };
  if (!isOddsApiConfigured()) {
    return { matches, matched: 0, error: "Chiave quote mancante: imposta ODDS_API_KEY." };
  }
  try {
    const quotes = await fetchQuotes(sportKey);
    if (quotes.length === 0) {
      return { matches, matched: 0, error: "The Odds API non ha ancora pubblicato quote per queste partite." };
    }
    let matched = 0;
    const annotated = matches.map((match) => {
      const quote = findQuote(match, quotes);
      if (!quote) return match;
      matched += 1;
      return {
        ...match,
        odd1: quote.odd1,
        oddX: quote.oddX,
        odd2: quote.odd2,
        oddsSources: quote.sources,
      };
    });
    return { matches: annotated, matched, error: null };
  } catch (error) {
    return {
      matches,
      matched: 0,
      error: error instanceof Error ? error.message : "Errore durante il recupero delle quote.",
    };
  }
}
