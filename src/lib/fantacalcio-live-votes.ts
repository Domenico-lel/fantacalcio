import { Root } from "protobufjs";

const FANTACALCIO_SITE = "https://www.fantacalcio.it";
const LIVE_API = "https://api.fantacalcio.it";
const DESCRIPTOR_SEED = 98;

type JsonRecord = Record<string, unknown>;

interface LivePlayer {
  id?: number | string;
  position?: string;
  vote?: number;
  events?: number[];
}

interface LiveMatch {
  status?: number;
  playersHome?: LivePlayer[];
  playersAway?: LivePlayer[];
}

interface LiveMessage {
  protoData?: LiveMatch[];
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Decodifica il descrittore protobuf pubblicato dal sito Fantacalcio. */
export function decodeFantacalcioDescriptor(value: string, seed = DESCRIPTOR_SEED): string {
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    if (charCode === 13) continue;
    const x = Math.sin(seed) * 10_000;
    const random = x - Math.floor(x);
    seed += 1;
    decoded += String.fromCharCode(charCode - (Math.floor(random * 2) - 1));
  }
  return decoded;
}

/** L'id stagionale Fantacalcio cresce di uno ogni estate (2026/27 = 21). */
export function fantacalcioSeasonId(now = new Date()): number {
  const override = Number.parseInt(process.env.FANTACALCIO_SEASON_ID ?? "", 10);
  if (Number.isInteger(override) && override > 0) return override;
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return startYear - 2005;
}

/** Normalizza l'anomalia del feed che a volte serializza 5,5 come 55. */
export function normalizeFantacalcioLiveVote(vote: unknown): number | null {
  if (typeof vote !== "number" || !Number.isFinite(vote) || vote <= 0 || vote === 100) return null;
  return vote > 30 && vote < 100 ? vote / 10 : vote;
}

/** Applica i bonus/malus Classic agli eventi del feed live ufficiale. */
export function calculateFantacalcioLiveScore(player: LivePlayer): number | null {
  const vote = normalizeFantacalcioLiveVote(player.vote);
  if (vote === null || player.position === "ALL") return null;

  let score = vote;
  for (const event of player.events ?? []) {
    if (event === 1) score -= 0.5; // ammonizione
    else if (event === 2) score -= 1; // espulsione
    else if (event === 3 || event === 9) score += 3; // gol / rigore segnato
    else if (event === 4) score -= 1; // gol subito
    else if (event === 7) score += 3; // rigore parato
    else if (event === 8) score -= 3; // rigore sbagliato
    else if (event === 10) score -= 2; // autogol
    else if (event === 20 || event === 21 || event === 22 || event === 23) score += 1; // assist
  }
  return score;
}

async function fetchLiveDescriptor(): Promise<JsonRecord> {
  const response = await fetch(`${FANTACALCIO_SITE}/js/proto/live.txt`, {
    headers: { Accept: "text/plain", "User-Agent": "FantaSoccerClub/1.0" },
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error(`live-descriptor:${response.status}`);
  const descriptor = JSON.parse(decodeFantacalcioDescriptor(await response.text()));
  if (!isRecord(descriptor)) throw new Error("live-descriptor:invalid");
  return descriptor;
}

function signedUriFrom(value: unknown): string | null {
  if (!isRecord(value)) return null;
  for (const entry of Object.values(value)) {
    if (!isRecord(entry)) continue;
    const resources = entry.resources;
    if (!Array.isArray(resources) || !isRecord(resources[0])) continue;
    const uri = resources[0].signedUri;
    if (typeof uri === "string" && uri.startsWith("https://")) return uri;
  }
  return null;
}

/**
 * Legge una sola volta i voti della giornata Serie A e li indicizza per id.
 * Vengono esclusi i match non iniziati, che nel feed hanno voti segnaposto 6.
 */
export async function fetchFantacalcioLiveScores(matchweek: number): Promise<ReadonlyMap<string, number>> {
  if (!Number.isInteger(matchweek) || matchweek <= 0) return new Map();
  const resourceUri = `${LIVE_API}/v1/st/${fantacalcioSeasonId()}/matches/live/${matchweek}.dat`;
  const signedResponse = await fetch(`${FANTACALCIO_SITE}/api/v1/SignedUri`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: FANTACALCIO_SITE,
      "User-Agent": "FantaSoccerClub/1.0",
    },
    body: JSON.stringify({ resourcesUri: [resourceUri] }),
    cache: "no-store",
  });
  if (!signedResponse.ok) throw new Error(`live-signed-uri:${signedResponse.status}`);
  const signedUri = signedUriFrom(await signedResponse.json());
  if (!signedUri) throw new Error("live-signed-uri:missing");

  const [dataResponse, descriptor] = await Promise.all([
    fetch(signedUri, {
      headers: { Accept: "application/octet-stream", "Cache-Control": "no-cache", "User-Agent": "FantaSoccerClub/1.0" },
      cache: "no-store",
    }),
    fetchLiveDescriptor(),
  ]);
  if (!dataResponse.ok) throw new Error(`live-data:${dataResponse.status}`);

  const root = Root.fromJSON(descriptor);
  const model = root.lookupType("LiveMessage");
  const decoded = model.decode(new Uint8Array(await dataResponse.arrayBuffer()));
  const message = model.toObject(decoded, { longs: String, defaults: false }) as LiveMessage;
  const scores = new Map<string, number>();

  for (const match of message.protoData ?? []) {
    if ((match.status ?? 0) <= 1) continue;
    for (const player of [...(match.playersHome ?? []), ...(match.playersAway ?? [])]) {
      const id = player.id === undefined ? "" : String(player.id);
      const score = calculateFantacalcioLiveScore(player);
      if (id && score !== null) scores.set(id, score);
    }
  }
  return scores;
}
