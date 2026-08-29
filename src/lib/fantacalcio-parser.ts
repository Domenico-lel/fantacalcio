export type FantacalcioJsonRecord = Record<string, unknown>;

export interface FantacalcioCalendarStandingFixture {
  homeTeamId: string;
  awayTeamId: string;
  calculated: boolean;
  homePoints: number | null;
  awayPoints: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeStandingPoints: number | null;
  awayStandingPoints: number | null;
}

export interface FantacalcioDerivedStanding {
  position: number;
  teamName: string;
  teamId: string;
  points: number;
  totalFp: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Legge gli alias nell'ordine dichiarato. L'ordine e importante per i payload
 * legacy di Fantacalcio: `pt` indica i punti, mentre `p` indica le sconfitte.
 */
export function valueForAliases(record: FantacalcioJsonRecord, keys: string[]): unknown {
  const values = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    values.set(normalizedKey(key), value);
  }
  for (const key of keys) {
    const normalized = normalizedKey(key);
    if (values.has(normalized)) return values.get(normalized);
  }
  return undefined;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

/**
 * Il payload dell'endpoint `competition/teams` usa la chiave compatta `n` per
 * il nome. Nella classifica legacy la stessa chiave significa invece pareggi:
 * questo parser deve quindi essere usato esclusivamente per l'elenco squadre.
 */
export function parseFantacalcioTeamName(record: FantacalcioJsonRecord): string {
  const direct = text(valueForAliases(record, [
    "teamName",
    "team_name",
    "fantateam",
    "fantateam_name",
    "name",
    "nome",
    "squadra",
    "n",
  ]));
  if (direct) return direct;

  for (const key of ["team", "fantateam", "squadra"]) {
    const candidate = valueForAliases(record, [key]);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const name = text(valueForAliases(candidate as FantacalcioJsonRecord, [
      "name",
      "nome",
      "teamName",
      "team_name",
      "n",
    ]));
    if (name) return name;
  }
  return "";
}

function fallbackStandingPoints(
  explicit: number | null,
  ownGoals: number | null,
  opponentGoals: number | null,
): number {
  if (explicit !== null) return explicit;
  if (ownGoals === null || opponentGoals === null) return 0;
  if (ownGoals > opponentGoals) return 3;
  if (ownGoals === opponentGoals) return 1;
  return 0;
}

/**
 * Ricostruisce la classifica dal calendario moderno quando il servizio legacy
 * non concede la sessione. Usa soltanto incontri marcati come calcolati.
 */
export function deriveFantacalcioStandingsFromCalendar(
  teams: ReadonlyMap<string, string>,
  fixtures: readonly FantacalcioCalendarStandingFixture[],
): FantacalcioDerivedStanding[] {
  const rows = new Map<string, FantacalcioDerivedStanding & { seed: number }>();
  let seed = 0;
  for (const [teamId, teamName] of teams) {
    rows.set(teamId, {
      position: 0,
      teamName,
      teamId,
      points: 0,
      totalFp: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalDiff: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      seed: seed++,
    });
  }

  let calculatedMatches = 0;
  for (const fixture of fixtures) {
    if (!fixture.calculated) continue;
    const home = rows.get(fixture.homeTeamId);
    const away = rows.get(fixture.awayTeamId);
    if (!home || !away) continue;
    calculatedMatches += 1;

    home.played += 1;
    away.played += 1;
    home.totalFp += fixture.homePoints ?? 0;
    away.totalFp += fixture.awayPoints ?? 0;
    home.points += fallbackStandingPoints(fixture.homeStandingPoints, fixture.homeGoals, fixture.awayGoals);
    away.points += fallbackStandingPoints(fixture.awayStandingPoints, fixture.awayGoals, fixture.homeGoals);

    if (fixture.homeGoals === null || fixture.awayGoals === null) continue;
    home.goalsFor += fixture.homeGoals;
    home.goalsAgainst += fixture.awayGoals;
    away.goalsFor += fixture.awayGoals;
    away.goalsAgainst += fixture.homeGoals;
    if (fixture.homeGoals > fixture.awayGoals) {
      home.won += 1;
      away.lost += 1;
    } else if (fixture.homeGoals < fixture.awayGoals) {
      away.won += 1;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
    }
  }

  if (!calculatedMatches) return [];
  return [...rows.values()]
    .map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => (
      b.points - a.points
      || b.totalFp - a.totalFp
      || b.goalDiff - a.goalDiff
      || b.goalsFor - a.goalsFor
      || a.seed - b.seed
    ))
    .map(({ seed: _seed, ...row }, index) => ({ ...row, position: index + 1 }));
}

function parsedNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return null;

  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
  } else if (comma >= 0) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Supporta sia i decimali italiani (75,5) sia quelli JSON (75.5). */
export function parseFantacalcioNumber(value: unknown): number {
  return parsedNumber(value) ?? 0;
}

export function parseOptionalFantacalcioNumber(value: unknown): number | null {
  return parsedNumber(value);
}

export interface FantacalcioLineupSummary {
  total: number | null;
  formation: string | null;
  playersWithVote: number;
}

/**
 * Il live di Leghe Fantacalcio lascia `tot` a zero e codifica il voto non
 * disponibile come `100` (nelle varianti precedenti anche `0`). Sommiamo
 * quindi soltanto i punteggi correnti reali dei titolari, prima che venga
 * eseguito il calcolo definitivo della giornata.
 */
export function parseFantacalcioLineupSummary(
  value: unknown,
  officialLiveScores?: ReadonlyMap<string, number>,
): FantacalcioLineupSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { total: null, formation: null, playersWithVote: 0 };
  }

  const record = value as FantacalcioJsonRecord;
  const startersValue = valueForAliases(record, ["starts", "starters"]);
  const starters = Array.isArray(startersValue) ? startersValue : [];
  const officialScores = starters.flatMap((player) => {
    if (!officialLiveScores || !player || typeof player !== "object" || Array.isArray(player)) return [];
    const source = player as FantacalcioJsonRecord;
    const nested = valueForAliases(source, ["player", "calciatore"]);
    const nestedRecord = nested && typeof nested === "object" && !Array.isArray(nested)
      ? nested as FantacalcioJsonRecord
      : null;
    const id = text(valueForAliases(source, [
      "playerId", "player_id", "idPlayer", "id_player", "idCalciatore", "id_calciatore",
      "calciatoreId", "calciatore_id", "pid", "idp", "cal", "id",
    ]) ?? (nestedRecord ? valueForAliases(nestedRecord, ["id", "playerId", "idCalciatore"]) : undefined));
    const score = id ? officialLiveScores.get(id) : undefined;
    return score === undefined ? [] : [score];
  });
  const providerScores = starters.flatMap((player) => {
    if (!player || typeof player !== "object" || Array.isArray(player)) return [];
    const score = parseOptionalFantacalcioNumber(valueForAliases(
      player as FantacalcioJsonRecord,
      ["cscr", "currentScore", "fantagrade", "scr", "score", "grade"],
    ));
    return score === null || score === 0 || score === 100 ? [] : [score];
  });
  const liveScores = officialScores.length > 0 ? officialScores : providerScores;
  const explicitTotal = parseOptionalFantacalcioNumber(valueForAliases(
    record,
    ["tot", "total", "fantapoints", "fantapunti"],
  ));

  return {
    total: liveScores.length > 0
      ? liveScores.reduce((sum, score) => sum + score, 0)
      : explicitTotal !== null && explicitTotal !== 0 ? explicitTotal : null,
    formation: String(valueForAliases(record, ["mdl", "formation", "module"]) ?? "").trim() || null,
    playersWithVote: liveScores.length,
  };
}
