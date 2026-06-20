import { NextResponse } from "next/server";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  source: string;
  sourceLabel: string;
  pubDate: string;
  category: string;
}

const FEEDS = [
  {
    url: "https://www.corrieredellosport.it/rss/calcio/serie-a",
    source: "corriere",
    label: "Corriere dello Sport",
    category: "Serie A",
  },
  {
    url: "https://www.corrieredellosport.it/rss/calcio",
    source: "corriere-calcio",
    label: "Corriere dello Sport",
    category: "Mercato",
  },
  {
    url: "https://www.tuttosport.com/rss/calcio",
    source: "tuttosport",
    label: "Tuttosport",
    category: "Serie A",
  },
];

const MAX_AGE_DAYS = 14;

function extractText(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (match) return match[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function decodeEntities(str: string): string {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ").trim();
}

function isRecent(pubDate: string): boolean {
  if (!pubDate) return true;
  const age = Date.now() - new Date(pubDate).getTime();
  return age < MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function extractImageUrl(block: string): string | undefined {
  // media:content url="..."
  const mediaMatch = block.match(/<media:content[^>]+url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];
  // enclosure url="..." type="image/..."
  const enclosureMatch = block.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image[^"]*"/i);
  if (enclosureMatch) return enclosureMatch[1];
  // enclosure con url prima del type
  const enclosureMatch2 = block.match(/<enclosure[^>]+type="image[^"]*"[^>]+url="([^"]+)"/i);
  if (enclosureMatch2) return enclosureMatch2[1];
  return undefined;
}

function parseRSS(xml: string, source: string, label: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let idx = 0;

  while ((match = itemRegex.exec(xml)) !== null && idx < 12) {
    const block = match[1];
    const title = decodeEntities(extractText(block, "title"));
    const link = extractText(block, "link") || extractText(block, "guid");
    const desc = extractText(block, "description");
    const pubDate = extractText(block, "pubDate");

    if (!title || !link) continue;
    if (!isRecent(pubDate)) continue;

    const cleanDesc = decodeEntities(
      desc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 160)
    );

    items.push({
      id: `${source}-${idx}`,
      title,
      summary: cleanDesc || "Leggi l'articolo completo.",
      url: link,
      imageUrl: extractImageUrl(block),
      source,
      sourceLabel: label,
      pubDate,
      category,
    });
    idx++;
  }
  return items;
}

async function fetchFeed(feed: typeof FEEDS[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FantaCalcioApp/1.0)" },
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, feed.source, feed.label, feed.category);
  } catch {
    return [];
  }
}

// ─── Fantacalcio.it (no RSS → scraping HTML della pagina /news) ──────────────

function parseFantacalcio(html: string): NewsItem[] {
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="(\/news\/([a-z-]+)\/(\d{2})_(\d{2})_(\d{4})\/[^"]+-(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null && items.length < 15) {
    const [, path, cat, dd, mm, yyyy, id, inner] = m;
    if (seen.has(id)) continue;

    const titleMatch = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!titleMatch) continue;
    const title = decodeEntities(titleMatch[1]);
    if (!title) continue;
    seen.add(id);

    const sumMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const summary = sumMatch ? decodeEntities(sumMatch[1]).slice(0, 160) : "";
    const imgMatch = inner.match(/src="(https:\/\/content\.fantacalcio\.it\/web\/img\/(?:medium|large|small)\/[^"]+)"/i);

    const category = /mercato/i.test(cat) ? "Mercato" : "Serie A";

    items.push({
      id: `fantacalcio-${id}`,
      title,
      summary: summary || "Leggi l'articolo completo.",
      url: `https://www.fantacalcio.it${path}`,
      imageUrl: imgMatch ? imgMatch[1] : undefined,
      source: "fantacalcio",
      sourceLabel: "Fantacalcio.it",
      pubDate: `${yyyy}-${mm}-${dd}T12:00:00Z`,
      category,
    });
  }
  return items;
}

async function fetchFantacalcioNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("https://www.fantacalcio.it/news", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return parseFantacalcio(await res.text());
  } catch {
    return [];
  }
}

export async function GET() {
  const [rssResults, fcItems] = await Promise.all([
    Promise.allSettled(FEEDS.map(fetchFeed)),
    fetchFantacalcioNews(),
  ]);

  const allItems: NewsItem[] = [...fcItems];
  rssResults.forEach((r) => {
    if (r.status === "fulfilled") allItems.push(...r.value);
  });

  // Deduplica per URL
  const seen = new Set<string>();
  const unique = allItems.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  // Sort by pubDate descending
  unique.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return NextResponse.json({ items: unique }, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
