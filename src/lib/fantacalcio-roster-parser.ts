export type FantacalcioRole = "P" | "D" | "C" | "A";

export interface FantacalcioRosterSourceTeam {
  teamId: string;
  teamName: string;
  playerIds: string[];
}

export interface FantacalcioCatalogPlayer {
  sourceId: string;
  name: string;
  role: FantacalcioRole;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function firstValue(record: JsonRecord, aliases: string[]): unknown {
  for (const alias of aliases) {
    const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === alias.toLowerCase());
    if (key !== undefined) return record[key];
  }
  return undefined;
}

function teamId(record: JsonRecord): string {
  return text(firstValue(record, ["teamId", "team_id", "idTeam", "id_team", "id"]));
}

function teamName(record: JsonRecord): string {
  return text(firstValue(record, ["teamName", "team_name", "name", "nome", "n"]));
}

function playerIds(value: unknown): string[] {
  const ids = Array.isArray(value)
    ? value.flatMap((item) => {
        if (isRecord(item)) return [text(firstValue(item, ["playerId", "player_id", "id", "pid"]))];
        return [text(item)];
      })
    : text(value).split(/[;,|]/);

  return [...new Set(ids.map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))];
}

function rosterValue(record: JsonRecord): unknown {
  return firstValue(record, ["cal", "calciatori", "players", "playerIds", "player_ids", "roster", "rosa"]);
}

function findTeamRows(value: unknown, depth = 0): JsonRecord[] {
  if (!value || depth > 6) return [];
  if (Array.isArray(value)) {
    const records = value.filter(isRecord);
    if (records.some((record) => teamId(record) && teamName(record) && rosterValue(record) !== undefined)) {
      return records;
    }
    for (const item of value) {
      const rows = findTeamRows(item, depth + 1);
      if (rows.length) return rows;
    }
    return [];
  }
  if (!isRecord(value)) return [];
  for (const candidate of Object.values(value)) {
    const rows = findTeamRows(candidate, depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

/** Estrae squadre e ID rosa dal payload compatto usato da Leghe Fantacalcio. */
export function parseFantacalcioRosterTeams(payload: unknown): FantacalcioRosterSourceTeam[] {
  return findTeamRows(payload)
    .filter((record) => rosterValue(record) !== undefined)
    .map((record) => ({
      teamId: teamId(record),
      teamName: teamName(record),
      playerIds: playerIds(rosterValue(record)),
    }))
    .filter((team) => team.teamId && team.teamName);
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Legge ID, nome e ruolo Classic dal listone ufficiale Fantacalcio. */
export function parseFantacalcioPlayerCatalog(html: string): Map<string, FantacalcioCatalogPlayer> {
  const players = new Map<string, FantacalcioCatalogPlayer>();
  const rows = html.match(/<tr\b[^>]*class=["'][^"']*player-row[^"']*["'][\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const sourceId = row.match(/href=["'][^"']*\/(\d+)(?:[/?#][^"']*)?["']/i)?.[1] ?? "";
    const role = row.match(/data-filter-role-classic=["']([pdca])["']/i)?.[1]?.toUpperCase() as FantacalcioRole | undefined;
    const nameCell = row.match(/<a\b[^>]*class=["'][^"']*player-name[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "";
    const name = decodeHtml(nameCell);
    if (!sourceId || !role || !name) continue;
    players.set(sourceId, { sourceId, name, role });
  }

  return players;
}
