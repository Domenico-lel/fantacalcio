import { NextResponse } from "next/server";

/* Feed da canale Telegram pubblico @vocidicalciomercato (t.me/s/...).
   Classifica ogni post in "mercato" o "match", scarta le pubblicità, e per le
   partite estrae squadre/risultato/marcatore. Nessun bot, token o DB. */

export interface MatchInfo {
  home: string;
  away: string;
  homeFlag?: string;
  awayFlag?: string;
  score?: string;
  event?: string;
  scorer?: string;
  assist?: string;
  minute?: string;
}

export interface MarketItem {
  id: string;
  kind: "mercato" | "match";
  text: string;
  postedAt: string;
  match?: MatchInfo;
}

const CHANNEL = "vocidicalciomercato";
const SRC = `https://t.me/s/${CHANNEL}`;

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, "");
}

function cleanText(html: string): string {
  return decodeEntities(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function stripDecor(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/\s+/g, " ").replace(/^[\s·\-–]+|[\s·\-–]+$/g, "").trim();
}

// Spezza un hashtag CamelCase in parole: "VanDerBrempt" -> "Van Der Brempt"
function deCamel(w: string): string {
  return w.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2");
}

// Pulizia testo mercato: via la @mention del canale, gli hashtag di coda,
// l'eventuale emoji/spazio iniziale, e i # inline trasformati in parole
function cleanMercato(text: string): string {
  return text
    .replace(/@specialecalciomercato/gi, "")
    .replace(/^@\S+\s*/i, "")
    .replace(/(?:\s*#[\p{L}\p{N}]+)+\s*$/u, "")
    .replace(/#([\p{L}\p{N}]+)/gu, (_, w) => deCamel(w))
    .replace(/^[^\p{L}\p{N}"“«]+/u, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function isAd(text: string, links: string[]): boolean {
  if (links.length > 0) return true; // link esterni = promo/pubblicità
  return /#(adv|advertising|pubblicit|sponsor)/i.test(text)
    || /amzn\.to|amazon\.|aliexpress|prime day|invece di|a soli\s|codice sconto|bonus benvenuto/i.test(text);
}

function isMatch(text: string): boolean {
  if (text.includes("🆚")) return true;
  if (/#fifaworldcup/i.test(text)) return true;
  return /\b(goal|gol)\b|intervallo|fine partita|calcio d'inizio|fischio|inizio (partita|primo|secondo) tempo|rigore|espuls|ammoniz/i.test(text);
}

function parseMatch(raw: string): MatchInfo | undefined {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const vsIdx = lines.findIndex((l) => l.includes("🆚"));
  if (vsIdx < 0) return undefined;

  const vs = lines[vsIdx];
  const [lPart, rPart = ""] = vs.split("🆚");
  const scoreM = rPart.match(/(\d+)\s*[-–]\s*(\d+)/);
  const score = scoreM ? `${scoreM[1]}-${scoreM[2]}` : undefined;

  const home = stripDecor(lPart);
  const away = stripDecor(rPart.replace(/\d+\s*[-–]\s*\d+.*$/, ""));
  const homeFlag = (lPart.match(FLAG_RE) || [])[0];
  const awayFlag = (rPart.match(FLAG_RE) || [])[0];

  const event = (lines[0].replace(EMOJI_RE, "").replace(/\s+/g, " ").trim()) || undefined;

  const stripLead = (l: string) => l.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  let scorer: string | undefined, assist: string | undefined, minute: string | undefined;
  for (let i = vsIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("⚽") && !scorer) scorer = stripLead(l);
    else if (l.startsWith("👟") && !assist) assist = stripLead(l);
    else if (l.startsWith("⏱") && !minute) minute = stripLead(l);
  }

  if (!home || !away) return undefined;
  return { home, away, homeFlag, awayFlag, score, event, scorer, assist, minute };
}

function parseChannel(html: string): MarketItem[] {
  const items: MarketItem[] = [];
  const starts: number[] = [];
  const wrapRe = /<div class="tgme_widget_message_wrap/g;
  let m: RegExpExecArray | null;
  while ((m = wrapRe.exec(html)) !== null) starts.push(m.index);
  starts.push(html.length);

  for (let i = 0; i < starts.length - 1; i++) {
    const block = html.slice(starts[i], starts[i + 1]);

    const idMatch = block.match(/data-post="([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];

    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const raw = textMatch ? cleanText(textMatch[1]) : "";
    if (!raw) continue;

    const links = [...block.matchAll(/<a href="(https?:\/\/[^"]+)"/g)]
      .map((x) => x[1])
      .filter((u) => !u.includes("t.me/") && !u.includes("//t.me"));

    if (isAd(raw, links)) continue;

    const timeMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    const postedAt = timeMatch ? timeMatch[1] : "";

    if (isMatch(raw)) {
      items.push({ id, kind: "match", text: cleanMercato(raw), postedAt, match: parseMatch(raw) });
    } else {
      items.push({ id, kind: "mercato", text: cleanMercato(raw), postedAt });
    }
  }

  items.sort((a, b) => {
    const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return db - da;
  });

  return items.slice(0, 40);
}

export async function GET() {
  try {
    const res = await fetch(SRC, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      next: { revalidate: 120 },
    });
    if (!res.ok) return NextResponse.json({ items: [], error: true }, { status: 200 });
    const items = parseChannel(await res.text());
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ items: [], error: true }, { status: 200 });
  }
}
