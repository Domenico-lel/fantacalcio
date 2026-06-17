import { NextResponse } from "next/server";

export interface TransferItem {
  id: string;
  player: {
    name: string;
    photoUrl: string;
    age?: string;
    nationality?: string;
    position?: string;
    value?: string;
  };
  fromClub: { name: string; logoUrl: string };
  toClub:   { name: string; logoUrl: string };
  probability: number;
  trend: "up" | "down" | "stable";
  discussionUrl: string;
}

const TM_BASE = "https://www.transfermarkt.it";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
  "X-Requested-With": "XMLHttpRequest",
};

function attr(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseCard(html: string, threadId: string): TransferItem | null {
  // Foto e nome giocatore
  const photoUrl  = attr(html, /class="bilderrahmen[^"]*"[^>]*\/>|src="(https:\/\/img\.a\.transfermarkt[^"]+)"/);
  const photoUrl2 = html.match(/src="(https:\/\/img\.a\.transfermarkt[^"]+)"/)?.[1] ?? "";
  const playerName = attr(html, /title="([^"]+)"[^>]*href="\/[^"]+\/profil\/spieler\/\d+"/);

  // Dati aggiuntivi
  const ageMatch   = html.match(/<b>Età:<\/b>\s*([^<&]+)/);
  const posMatch   = html.match(/<b>Posizione:<\/b>\s*([^<\n]+)/);
  const valueMatch = html.match(/<b>Valore di mercato:<\/b>\s*([^<\n]+)/);

  // Club: immagini wappen (scudo) con titolo club
  const clubMatches = [...html.matchAll(/title="([^"]+)"[^>]*href="[^"]+\/transfers\/verein\/\d+"[^>]*>[\s\S]*?<img[^>]+src="(https:\/\/tmssl[^"]+)"/g)];
  const fromClub = clubMatches[0] ? { name: clubMatches[0][1], logoUrl: clubMatches[0][2] } : { name: "?", logoUrl: "" };
  const toClub   = clubMatches[1] ? { name: clubMatches[1][1], logoUrl: clubMatches[1][2] } : { name: "?", logoUrl: "" };

  // Probabilità
  const probMatch = html.match(/wahrscheinlichkeits-text[^>]*>\s*(\d+)/);
  const probability = probMatch ? parseInt(probMatch[1], 10) : 0;

  // Trend
  const trend: TransferItem["trend"] =
    html.includes("wertung-steigend") ? "up" :
    html.includes("wertung-sinkend")  ? "down" : "stable";

  // Link discussione
  const discussionUrl = attr(html, /href="(https:\/\/www\.transfermarkt\.it[^"]+thread_id\/[^"]+)"/) || TM_BASE;

  if (!playerName || probability === 0) return null;

  return {
    id: threadId,
    player: {
      name: playerName,
      photoUrl: photoUrl2,
      age:      ageMatch  ? stripTags(ageMatch[1])   : undefined,
      position: posMatch  ? stripTags(posMatch[1])   : undefined,
      value:    valueMatch? stripTags(valueMatch[1]) : undefined,
    },
    fromClub,
    toClub,
    probability,
    trend,
    discussionUrl,
  };
}

async function fetchThreadIds(): Promise<string[]> {
  try {
    const res = await fetch(`${TM_BASE}/serie-a/transfers/wettbewerb/IT1`, {
      headers: HEADERS,
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/geruechte\/wettbewerbAjax\/IT1\/board_id\/154\/thread_id\/(\d+)/g)];
    return [...new Set(matches.map((m) => m[1]))];
  } catch {
    return [];
  }
}

async function fetchCard(threadId: string): Promise<TransferItem | null> {
  try {
    const res = await fetch(
      `${TM_BASE}/serie-a/geruechte/wettbewerbAjax/IT1/board_id/154/thread_id/${threadId}`,
      { headers: HEADERS, next: { revalidate: 600 } }
    );
    if (!res.ok) return null;
    const html = await res.text();
    return parseCard(html, threadId);
  } catch {
    return null;
  }
}

export async function GET() {
  const threadIds = await fetchThreadIds();
  if (threadIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const results = await Promise.allSettled(threadIds.map(fetchCard));
  const items: TransferItem[] = results
    .filter((r): r is PromiseFulfilledResult<TransferItem> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value)
    .sort((a, b) => b.probability - a.probability);

  return NextResponse.json({ items }, {
    headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=120" },
  });
}
