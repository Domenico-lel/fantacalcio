import { NextResponse } from "next/server";

export interface TransferItem {
  id: string;
  player: {
    name: string;
    photoUrl: string;
    age?: string;
    position?: string;
    value?: string;
  };
  fromClub: { name: string; logoUrl: string };
  toClub:   { name: string; logoUrl: string };
  probability: number;
  trend: "up" | "down" | "stable";
  league: string;
  discussionUrl: string;
}

const TM_BASE = "https://www.transfermarkt.it";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
  "X-Requested-With": "XMLHttpRequest",
};

const LEAGUES = [
  { slug: "serie-a",        code: "IT1", label: "Serie A" },
  { slug: "premier-league", code: "GB1", label: "Premier League" },
  { slug: "laliga",         code: "ES1", label: "La Liga" },
  { slug: "bundesliga",     code: "L1",  label: "Bundesliga" },
  { slug: "ligue-1",        code: "FR1", label: "Ligue 1" },
];

function attr(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseCard(html: string, threadId: string, leagueLabel: string): TransferItem | null {
  const photoUrl2 = (html.match(/src="(https:\/\/img\.a\.transfermarkt[^"]+)"/)?.[1] ?? "")
    .replace("/portrait/medium/", "/portrait/big/");
  const playerName = attr(html, /title="([^"]+)"[^>]*href="\/[^"]+\/profil\/spieler\/\d+"/);

  const ageMatch   = html.match(/<b>Età:<\/b>\s*([^<&]+)/);
  const posMatch   = html.match(/<b>Posizione:<\/b>\s*([^<\n]+)/);
  const valueMatch = html.match(/<b>Valore di mercato:<\/b>\s*([^<\n]+)/);

  const clubMatches = [...html.matchAll(/title="([^"]+)"[^>]*href="[^"]+\/transfers\/verein\/\d+"[^>]*>[\s\S]*?<img[^>]+src="(https:\/\/tmssl[^"]+)"/g)];
  const fromClub = clubMatches[0] ? { name: clubMatches[0][1], logoUrl: clubMatches[0][2] } : { name: "?", logoUrl: "" };
  const toClub   = clubMatches[1] ? { name: clubMatches[1][1], logoUrl: clubMatches[1][2] } : { name: "?", logoUrl: "" };

  const probMatch = html.match(/wahrscheinlichkeits-text[^>]*>\s*(\d+)/);
  const probability = probMatch ? parseInt(probMatch[1], 10) : 0;

  const trend: TransferItem["trend"] =
    html.includes("wertung-steigend") ? "up" :
    html.includes("wertung-sinkend")  ? "down" : "stable";

  const discussionUrl = attr(html, /href="(https:\/\/www\.transfermarkt\.it[^"]+thread_id\/[^"]+)"/) || TM_BASE;

  if (!playerName || probability === 0) return null;

  return {
    id: threadId,
    player: {
      name: playerName,
      photoUrl: photoUrl2,
      age:      ageMatch   ? stripTags(ageMatch[1])   : undefined,
      position: posMatch   ? stripTags(posMatch[1])   : undefined,
      value:    valueMatch ? stripTags(valueMatch[1]) : undefined,
    },
    fromClub,
    toClub,
    probability,
    trend,
    league: leagueLabel,
    discussionUrl,
  };
}

async function fetchLeagueThreads(slug: string, code: string): Promise<{ threadId: string; code: string; slug: string }[]> {
  try {
    const res = await fetch(`${TM_BASE}/${slug}/transfers/wettbewerb/${code}`, {
      headers: HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Estrai thread IDs con il loro code lega dal pattern AJAX
    const matches = [...html.matchAll(/geruechte\/wettbewerbAjax\/([A-Z0-9]+)\/board_id\/154\/thread_id\/(\d+)/g)];
    const seen = new Set<string>();
    return matches
      .filter((m) => { const key = m[2]; if (seen.has(key)) return false; seen.add(key); return true; })
      .map((m) => ({ threadId: m[2], code: m[1], slug }));
  } catch {
    return [];
  }
}

async function fetchCard(threadId: string, code: string, slug: string, leagueLabel: string): Promise<TransferItem | null> {
  try {
    const res = await fetch(
      `${TM_BASE}/${slug}/geruechte/wettbewerbAjax/${code}/board_id/154/thread_id/${threadId}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const html = await res.text();
    return parseCard(html, threadId, leagueLabel);
  } catch {
    return null;
  }
}

export async function GET() {
  // Fetch thread IDs da tutte e 5 le leghe in parallelo
  const leagueResults = await Promise.allSettled(
    LEAGUES.map(({ slug, code }) => fetchLeagueThreads(slug, code))
  );

  // Mappa threadId → { code, slug, label } — deduplicazione globale
  const threadMap = new Map<string, { code: string; slug: string; label: string }>();
  leagueResults.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const label = LEAGUES[i].label;
    for (const { threadId, code, slug } of r.value) {
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, { code, slug, label });
      }
    }
  });

  if (threadMap.size === 0) return NextResponse.json({ items: [] });

  // Fetch card per ogni thread
  const cardJobs = [...threadMap.entries()].map(([threadId, { code, slug, label }]) =>
    fetchCard(threadId, code, slug, label)
  );

  const results = await Promise.allSettled(cardJobs);
  const items: TransferItem[] = results
    .filter((r): r is PromiseFulfilledResult<TransferItem> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value)
    .sort((a, b) => b.probability - a.probability);

  return NextResponse.json({ items }, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
