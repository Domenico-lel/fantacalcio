import { NextResponse } from "next/server";

/* Feed "Voci di mercato": legge in diretta la pagina web pubblica del canale
   Telegram @vocidicalciomercato (t.me/s/...). Nessun bot, token o DB: ogni post
   pubblicato sul canale compare qui da solo, con cache breve. */

export interface MarketNewsItem {
  id: string;
  text: string;
  url: string;
  imageUrl?: string;
  postedAt: string;
}

const CHANNEL = "vocidicalciomercato";
const SRC = `https://t.me/s/${CHANNEL}`;

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, "");
}

/* Trasforma il blocco HTML del testo del messaggio in testo pulito.
   Mantiene il testo identico a Telegram: hashtag, @menzioni, emoji e a capo. */
function cleanText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

/* Domini di shopping / scommesse / affiliazione: link a questi = pubblicità.
   NON includono i siti ufficiali dei club o delle testate, che compaiono
   legittimamente negli annunci "UFFICIALE" dei trasferimenti. */
const AD_LINK_HOSTS = /amzn\.to|amazon\.|aliexpress|ebay\.|temu\.|shein\.|bit\.ly|tidd\.ly|awin1|goaffpro|planetwin|sisal|snai\b|goldbet|betflag|lottomatica|bet365|betfair|eurobet|williamhill|888(?:sport|casino)|starcasino|codicerosso/i;

/* Riconosce i post pubblicitari/sponsorizzati da scartare.
   Attenzione: un semplice link esterno NON basta — gli annunci ufficiali
   linkano il sito del club. Filtriamo solo su segnali promozionali certi. */
function isAd(text: string, links: string[]): boolean {
  // Hashtag di sponsorizzazione dichiarata
  if (/#(adv|advertising|pubblicit|sponsor)/i.test(text)) return true;
  // Testo da e-commerce / scommesse
  if (/amzn\.to|amazon\.|aliexpress|prime day|invece di|a soli\s|codice sconto|bonus benvenuto|scommett|quota maggiorata|deposita ora|gioca ora/i.test(text)) return true;
  // Link verso domini di shopping/scommesse/affiliazione
  if (links.some((u) => AD_LINK_HOSTS.test(u))) return true;
  return false;
}

function parseChannel(html: string): MarketNewsItem[] {
  const items: MarketNewsItem[] = [];

  // Indici di inizio di ogni messaggio, poi slice tra uno e il successivo
  const starts: number[] = [];
  const wrapRe = /<div class="tgme_widget_message_wrap/g;
  let m: RegExpExecArray | null;
  while ((m = wrapRe.exec(html)) !== null) starts.push(m.index);
  starts.push(html.length);

  for (let i = 0; i < starts.length - 1; i++) {
    const block = html.slice(starts[i], starts[i + 1]);

    const idMatch = block.match(/data-post="([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1]; // es. "vocidicalciomercato/88345"

    const textMatch = block.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    const text = textMatch ? cleanText(textMatch[1]) : "";

    const photoMatch = block.match(
      /tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/
    );
    const imageUrl = photoMatch ? photoMatch[1].replace(/\\\//g, "/") : undefined;

    // Salta i messaggi senza contenuto utile (es. servizi/video puri senza testo)
    if (!text && !imageUrl) continue;

    // Scarta le pubblicità (link esterni / hashtag promo / shopping)
    const links = [...block.matchAll(/<a href="(https?:\/\/[^"]+)"/g)]
      .map((x) => x[1])
      .filter((u) => !u.includes("t.me/") && !u.includes("//t.me"));
    if (isAd(text, links)) continue;

    const timeMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    const postedAt = timeMatch ? timeMatch[1] : "";

    items.push({
      id,
      text,
      url: `https://t.me/${id}`,
      imageUrl,
      postedAt,
    });
  }

  // Più recenti in cima
  items.sort((a, b) => {
    const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return db - da;
  });

  return items.slice(0, 30);
}

export async function GET() {
  try {
    const res = await fetch(SRC, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      next: { revalidate: 120 }, // cache 2 min
    });
    if (!res.ok) {
      return NextResponse.json({ items: [], error: true }, { status: 200 });
    }
    const items = parseChannel(await res.text());
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ items: [], error: true }, { status: 200 });
  }
}
