// Provider "partite reali": football-data.org (API v4).
// La chiave gratuita va messa nell'env FOOTBALL_DATA_API_KEY (mai NEXT_PUBLIC).
// Modulo server-side (usa process.env + fetch), importato solo dalle server action.

import type { ExtMatch } from "@/lib/bet-constants";

const BASE = "https://api.football-data.org/v4";

export function isFootballDataConfigured(): boolean {
  return !!(process.env.FOOTBALL_DATA_API_KEY || "").trim();
}

function authHeaders(): Record<string, string> {
  return { "X-Auth-Token": (process.env.FOOTBALL_DATA_API_KEY || "").trim() };
}

// Timeout richieste: senza limite un fetch bloccato appenderebbe la server action.
const REQUEST_TIMEOUT_MS = 10_000;

// Estrae il motivo reale da un fetch fallito. In Node (undici) `fetch failed`
// nasconde la causa vera (DNS, TLS, connessione rifiutata, egress bloccato) in
// `err.cause`; la superficie così l'admin sa perché non si riesce a contattare.
function contactError(err: unknown): string {
  const base = "Impossibile contattare football-data.org";
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return `${base}: timeout dopo ${REQUEST_TIMEOUT_MS / 1000}s.`;
  }
  const cause = (err as { cause?: unknown })?.cause;
  const reason =
    (cause && typeof cause === "object" && "code" in cause && String((cause as { code: unknown }).code)) ||
    (cause instanceof Error && cause.message) ||
    (err instanceof Error && err.message) ||
    "";
  return reason ? `${base} (${reason}).` : `${base}.`;
}

type FDTeam = { name?: string; shortName?: string; crest?: string };
type FDMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  competition?: { name?: string };
  homeTeam?: FDTeam;
  awayTeam?: FDTeam;
  score?: { winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null };
};

function normalize(m: FDMatch): ExtMatch {
  return {
    eventId: String(m.id),
    competition: m.competition?.name ?? "",
    homeName: m.homeTeam?.shortName || m.homeTeam?.name || "Casa",
    awayName: m.awayTeam?.shortName || m.awayTeam?.name || "Ospite",
    homeLogo: m.homeTeam?.crest || "",
    awayLogo: m.awayTeam?.crest || "",
    kickoff: m.utcDate,
    status: m.status,
    matchday: m.matchday ?? null,
  };
}

// Partite di una competizione: per giornata (matchday) oppure le prossime in programma.
export async function fetchCompetitionMatches(
  code: string,
  matchday?: number
): Promise<{ matches: ExtMatch[]; error: string | null }> {
  if (!isFootballDataConfigured()) {
    return { matches: [], error: "Chiave football-data.org mancante: imposta FOOTBALL_DATA_API_KEY." };
  }
  const params = new URLSearchParams();
  if (matchday && matchday > 0) params.set("matchday", String(matchday));
  else params.set("status", "SCHEDULED");

  try {
    const res = await fetch(`${BASE}/competitions/${encodeURIComponent(code)}/matches?${params}`, {
      headers: authHeaders(),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { matches: [], error: (json?.message as string) || `Errore football-data.org (${res.status})` };
    }
    let list: FDMatch[] = Array.isArray(json?.matches) ? json.matches : [];
    list = list.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    // senza giornata mostro solo le prossime, limitate
    if (!matchday) {
      list = list.filter((m) => m.status === "SCHEDULED" || m.status === "TIMED").slice(0, 20);
    }
    return { matches: list.map(normalize), error: null };
  } catch (err) {
    return { matches: [], error: contactError(err) };
  }
}

// Risultato di una singola partita: 1/X/2 solo se è terminata.
export async function fetchMatchResult(
  eventId: string
): Promise<{ finished: boolean; result: "1" | "X" | "2" | null; error: string | null }> {
  if (!isFootballDataConfigured()) return { finished: false, result: null, error: "Chiave mancante" };
  try {
    const res = await fetch(`${BASE}/matches/${encodeURIComponent(eventId)}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { finished: false, result: null, error: (json?.message as string) || `Errore football-data.org (${res.status})` };
    }
    // v4 restituisce la partita al root; alcune risposte la annidano sotto "match"
    const m: FDMatch | undefined = json?.match ?? json;
    if (!m || !m.status) return { finished: false, result: null, error: "Partita non trovata" };
    if (m.status !== "FINISHED") return { finished: false, result: null, error: null };
    const w = m.score?.winner;
    const result = w === "HOME_TEAM" ? "1" : w === "AWAY_TEAM" ? "2" : w === "DRAW" ? "X" : null;
    return { finished: true, result, error: null };
  } catch (err) {
    return { finished: false, result: null, error: contactError(err) };
  }
}
