import { getLeagueUrl } from "@/lib/league-config";
import {
  parseFantacalcioNumber as numeric,
  parseOptionalFantacalcioNumber as optionalNumeric,
  valueForAliases as valueFor,
} from "@/lib/fantacalcio-parser";

const API_BASE = (process.env.FANTACALCIO_API_BASE ?? "https://apileague.fantacalcio.it").replace(/\/$/, "");
const LEGACY_API_BASE = (process.env.FANTACALCIO_LEGACY_API_BASE ?? "https://leghe.fantacalcio.it/servizi").replace(/\/$/, "");
// Chiave pubblica usata dal client web di Leghe Fantacalcio. Si può comunque
// sovrascrivere senza un nuovo deploy se il fornitore la cambia.
const APP_KEY = process.env.FANTACALCIO_APP_KEY ?? "ICiELOObd5DF5uJEATi77CRvHiiRuMU0";

export interface FantacalcioStanding {
  position: number;
  teamName: string;
  teamId: string | null;
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

export interface FantacalcioStandingsResult {
  items: FantacalcioStanding[];
  error: string | null;
  currentMatchday: FantacalcioCurrentMatchday | null;
}

export interface FantacalcioMatchdayMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homePoints: number | null;
  awayPoints: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeFormation: string | null;
  awayFormation: string | null;
  homePlayersWithVote: number;
  awayPlayersWithVote: number;
  calculated: boolean;
}

export interface FantacalcioCurrentMatchday {
  matchweek: number;
  realMatchweek: number | null;
  calculated: boolean;
  matches: FantacalcioMatchdayMatch[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function nestedName(record: JsonRecord): string {
  const direct = text(valueFor(record, ["teamName", "team_name", "fantateam", "fantateam_name", "name", "nome", "squadra"]));
  if (direct) return direct;
  for (const key of ["team", "fantateam", "squadra"]) {
    const candidate = valueFor(record, [key]);
    if (isRecord(candidate)) {
      const name = text(valueFor(candidate, ["name", "nome", "teamName", "team_name"]));
      if (name) return name;
    }
  }
  return "";
}

function nestedTeamId(record: JsonRecord): string | null {
  const direct = text(valueFor(record, ["teamId", "team_id", "fantateamId", "fantateam_id", "idTeam", "id_team", "id"]));
  if (direct) return direct;
  for (const key of ["team", "fantateam", "squadra"]) {
    const candidate = valueFor(record, [key]);
    if (isRecord(candidate)) {
      const id = text(valueFor(candidate, ["id", "teamId", "team_id"]));
      if (id) return id;
    }
  }
  return null;
}

function toStanding(row: JsonRecord, fallbackPosition: number): FantacalcioStanding | null {
  const teamName = nestedName(row);
  if (!teamName) return null;
  const goalsFor = numeric(valueFor(row, ["goalsFor", "goals_for", "gf", "rank-gf"]));
  const goalsAgainst = numeric(valueFor(row, ["goalsAgainst", "goals_against", "gs", "rank-gs"]));
  return {
    position: numeric(valueFor(row, ["position", "pos", "rank", "index"])) || fallbackPosition,
    teamName,
    teamId: nestedTeamId(row),
    points: numeric(valueFor(row, ["points", "punti", "pt", "rank-pt", "p"])),
    totalFp: numeric(valueFor(row, ["totalFp", "total_fp", "fantapoints", "fantapunti", "fp", "rank-fp", "s_p"])),
    played: numeric(valueFor(row, ["played", "games", "matches", "g", "rank-g"])),
    won: numeric(valueFor(row, ["won", "wins", "v", "rank-v"])),
    drawn: numeric(valueFor(row, ["drawn", "draws", "n", "rank-n"])),
    lost: numeric(valueFor(row, ["lost", "losses", "pr", "rank-p"])),
    goalDiff: numeric(valueFor(row, ["goalDiff", "goal_diff", "difference", "dr", "rank-dr", "d_r"])) || goalsFor - goalsAgainst,
    goalsFor,
    goalsAgainst,
  };
}

function competitionIdFromUrl(url: string): string | null {
  const match = url.match(/\/competition\/(\d+)(?:\/|$)/i);
  return match?.[1] ?? null;
}

function tokenFrom(value: unknown): string {
  if (!isRecord(value)) return "";
  for (const key of ["jwt", "token", "tokenAuth", "token_auth", "accessToken", "access_token"]) {
    const token = text(valueFor(value, [key]));
    if (token) return token;
  }
  return "";
}

function findLeague(value: unknown, slug: string, depth = 0): JsonRecord | null {
  if (depth > 5 || !value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLeague(item, slug, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  const labels = ["alias", "slug", "url", "name", "nome", "leagueName", "league_name"];
  if (labels.some((key) => text(valueFor(value, [key])).toLowerCase().includes(slug.toLowerCase()))) return value;
  for (const key of ["leghe", "leagues", "items", "data", "results"]) {
    const found = findLeague(valueFor(value, [key]), slug, depth + 1);
    if (found) return found;
  }
  return null;
}

function findUserId(value: unknown, depth = 0): string {
  if (depth > 4 || !value) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = findUserId(item, depth + 1);
      if (id) return id;
    }
    return "";
  }
  if (!isRecord(value)) return "";
  const id = text(valueFor(value, ["userId", "user_id", "idUser", "id_user"]));
  if (id) return id;
  for (const key of ["utente", "user", "profile", "data"]) {
    const found = findUserId(valueFor(value, [key]), depth + 1);
    if (found) return found;
  }
  return "";
}

function headers(token?: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    app_key: APP_KEY,
    ...(token ? { Authorization: `Bearer ${token}`, token } : {}),
  };
}

function responseCookies(response: Response): string {
  const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = responseHeaders.getSetCookie?.()
    ?? (response.headers.get("set-cookie")?.split(/,(?=\s*[^;,=\s]+=[^;,]+)/) ?? []);

  return setCookies
    .map((cookie) => cookie.split(";", 1)[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(...cookieHeaders: string[]): string {
  const cookies = new Map<string, string>();
  for (const cookieHeader of cookieHeaders) {
    for (const cookie of cookieHeader.split(";")) {
      const normalized = cookie.trim();
      const separator = normalized.indexOf("=");
      if (separator <= 0) continue;
      cookies.set(normalized.slice(0, separator), normalized);
    }
  }
  return [...cookies.values()].join("; ");
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  try { return JSON.parse(raw); } catch { return null; }
}

async function loginAndGetToken(leagueUrl: string): Promise<{ token: string; cookie: string; error: string | null }> {
  const username = (process.env.FANTACALCIO_USERNAME ?? "").trim();
  const password = process.env.FANTACALCIO_PASSWORD ?? "";
  if (!username || !password) {
    return { token: "", cookie: "", error: "Collegamento Fantacalcio non configurato: aggiungi username e password dell'account nelle variabili di ambiente del deploy." };
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${API_BASE}/onboarding/v1/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username, password }),
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    return { token: "", cookie: "", error: "Non riesco a raggiungere il login di Fantacalcio. Riprova tra poco." };
  }
  if (!loginResponse.ok) {
    return { token: "", cookie: "", error: "Login Fantacalcio rifiutato: controlla username e password nelle variabili di ambiente." };
  }
  let cookie = responseCookies(loginResponse);
  if (!cookie) {
    console.warn("[fantacalcio] Login riuscito senza cookie per le API legacy");
  }
  const login = await readJson(loginResponse);
  if (!isRecord(login)) return { token: "", cookie: "", error: "Fantacalcio ha restituito una risposta di login non valida." };

  // L'API corrente avvolge la risposta di login in { data: { utente, leghe } }.
  // Le versioni precedenti restituivano direttamente il payload, quindi
  // supportiamo entrambe le forme senza cambiare la configurazione dell'admin.
  const wrappedPayload = valueFor(login, ["data"]);
  const payload = isRecord(wrappedPayload) ? wrappedPayload : login;

  const slug = new URL(leagueUrl).pathname.split("/").filter(Boolean)[0] ?? "";
  const league = findLeague(payload, slug);
  const leagueId = text(league && valueFor(league, ["leagueId", "league_id", "id", "idLeague", "id_league"]));
  const userId = findUserId(payload);
  const accountToken = tokenFrom(payload)
    || tokenFrom(valueFor(payload, ["utente", "user", "profile"]));
  let token = tokenFrom(league) || accountToken;

  // Il portale rinnova il token specifico della lega dopo il login. Se la
  // risposta contiene i dati necessari, facciamo lo stesso passaggio; in caso
  // contrario manteniamo il token del login, compatibile con le API precedenti.
  if (leagueId && userId && accountToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE}/onboarding/v1/refresh`, {
        method: "POST",
        headers: { ...headers(token || accountToken), ...(cookie ? { Cookie: cookie } : {}), "X-Retry": "true" },
        body: JSON.stringify({ LeagueId: leagueId, JWT: "", UserId: userId, TokenAuth: accountToken }),
        credentials: "include",
        cache: "no-store",
      });
      if (refreshResponse.ok) {
        cookie = mergeCookies(cookie, responseCookies(refreshResponse));
        token = tokenFrom(await readJson(refreshResponse)) || token;
      }
    } catch {
      // Il token del login rimane il fallback previsto dal client web.
    }
  }
  return token
    ? { token, cookie, error: null }
    : { token: "", cookie: "", error: "Login Fantacalcio completato, ma non è stato ricevuto il token della lega. Controlla che l'account possa aprire questa competizione." };
}

function findLegacyStandingRows(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 5 || !value) return [];
  if (Array.isArray(value)) {
    const records = value.filter(isRecord);
    if (records.some((row) => nestedTeamId(row) && valueFor(row, ["points", "punti", "pt", "rank-pt", "played", "games", "matches", "g", "rank-g", "s_p"]) !== undefined)) {
      return records;
    }
    for (const item of value) {
      const rows = findLegacyStandingRows(item, depth + 1);
      if (rows.length) return rows;
    }
    return [];
  }
  if (!isRecord(value)) return [];
  for (const key of ["data", "items", "results", "classifica", "standings"]) {
    const rows = findLegacyStandingRows(valueFor(value, [key]), depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

function findTeamRows(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 5 || !value) return [];
  if (Array.isArray(value)) {
    if (value.some((row) => isRecord(row) && nestedTeamId(row) && nestedName(row))) return value.filter(isRecord);
    for (const item of value) {
      const rows = findTeamRows(item, depth + 1);
      if (rows.length) return rows;
    }
    return [];
  }
  if (!isRecord(value)) return [];
  for (const key of ["data", "items", "teams", "results"]) {
    const rows = findTeamRows(valueFor(value, [key]), depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

async function fetchCompetitionTeams(competitionId: string, token: string): Promise<Map<string, string>> {
  const params = new URLSearchParams({ page: "1", pageSize: "100", competitionId });
  const response = await fetch(`${API_BASE}/onboarding/v1/league/competition/teams?${params}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`teams:${response.status}`);
  const teams = new Map<string, string>();
  for (const row of findTeamRows(await readJson(response))) {
    const id = nestedTeamId(row);
    const name = nestedName(row);
    if (id && name) teams.set(id, name);
  }
  return teams;
}

async function fetchLegacyStandings(leagueUrl: string, competitionId: string, token: string, cookie: string): Promise<{ rows: JsonRecord[]; status: number }> {
  const alias = new URL(leagueUrl).pathname.split("/").filter(Boolean)[0] ?? "";
  const params = new URLSearchParams({
    alias_lega: alias,
    id_competizione: competitionId,
    giornata_inizio: "1",
    giornata_fine: "60",
  });
  const response = await fetch(`${LEGACY_API_BASE}/v1_legheCompetizione/classificagiornate?${params}`, {
    headers: { ...headers(token), ...(cookie ? { Cookie: cookie } : {}) },
    credentials: "include",
    cache: "no-store",
  });
  return { rows: response.ok ? findLegacyStandingRows(await readJson(response)) : [], status: response.status };
}

interface CalendarFixture {
  matchweek: number;
  realMatchweek: number | null;
  homeTeamId: string;
  awayTeamId: string;
  calculated: boolean;
  homePoints: number | null;
  awayPoints: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

function boolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function arrayPayload(value: unknown, depth = 0): unknown[] {
  if (depth > 4 || !value) return [];
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  for (const key of ["data", "items", "results", "calendar", "fixtures"]) {
    const found = arrayPayload(valueFor(value, [key]), depth + 1);
    if (found.length) return found;
  }
  return [];
}

function teamIdFor(record: JsonRecord, side: "home" | "away"): string {
  const direct = side === "home"
    ? ["teamIdHome", "homeTeamId", "tIdH", "team_id_home", "idHome"]
    : ["teamIdAway", "awayTeamId", "tIdA", "team_id_away", "idAway"];
  const id = text(valueFor(record, direct));
  if (id) return id;
  const nested = valueFor(record, side === "home" ? ["home", "homeTeam"] : ["away", "awayTeam"]);
  return isRecord(nested) ? text(valueFor(nested, ["id", "teamId", "team_id"])) : "";
}

function scorePair(value: unknown): [number | null, number | null] {
  if (Array.isArray(value)) return [optionalNumeric(value[0]), optionalNumeric(value[1])];
  if (isRecord(value)) {
    return [
      optionalNumeric(valueFor(value, ["home", "homeGoals", "goalsHome", "h"])),
      optionalNumeric(valueFor(value, ["away", "awayGoals", "goalsAway", "a"])),
    ];
  }
  if (typeof value === "string") {
    const match = value.match(/(-?\d+(?:[.,]\d+)?)\D+(-?\d+(?:[.,]\d+)?)/);
    if (match) return [optionalNumeric(match[1]), optionalNumeric(match[2])];
  }
  return [null, null];
}

function parseCalendar(value: unknown): CalendarFixture[] {
  const fixtures: CalendarFixture[] = [];
  for (const rawDay of arrayPayload(value)) {
    if (!isRecord(rawDay)) continue;
    const matchweek = numeric(valueFor(rawDay, ["matchDay", "matchweek", "match_day", "mday", "g"]));
    if (!matchweek) continue;
    const realMatchweek = optionalNumeric(valueFor(rawDay, ["championshipMatchDay", "realMatchweek", "real_matchweek", "cmday", "ga"]));
    const matchesValue = valueFor(rawDay, ["matches", "partite"]);
    const matches = Array.isArray(matchesValue) ? matchesValue : [rawDay];

    for (const rawMatch of matches) {
      if (!isRecord(rawMatch)) continue;
      const homeTeamId = teamIdFor(rawMatch, "home") || teamIdFor(rawDay, "home");
      const awayTeamId = teamIdFor(rawMatch, "away") || teamIdFor(rawDay, "away");
      if (!homeTeamId || !awayTeamId || homeTeamId === "-1" || awayTeamId === "-1") continue;
      const [homeGoals, awayGoals] = scorePair(valueFor(rawMatch, ["result", "res"]));
      fixtures.push({
        matchweek,
        realMatchweek,
        homeTeamId,
        awayTeamId,
        calculated: boolean(valueFor(rawMatch, ["calculated", "cal"]) ?? valueFor(rawDay, ["calculated", "cal"])),
        homePoints: optionalNumeric(valueFor(rawMatch, ["ptH", "homePoints", "pointsHome", "fantapointsHome"])),
        awayPoints: optionalNumeric(valueFor(rawMatch, ["ptA", "awayPoints", "pointsAway", "fantapointsAway"])),
        homeGoals,
        awayGoals,
      });
    }
  }
  return fixtures;
}

function selectCurrentFixtures(fixtures: CalendarFixture[]): CalendarFixture[] {
  const matchweeks = [...new Set(fixtures.map((fixture) => fixture.matchweek))].sort((a, b) => a - b);
  if (!matchweeks.length) return [];
  const current = matchweeks.find((matchweek) => {
    const round = fixtures.filter((fixture) => fixture.matchweek === matchweek);
    return round.length > 0 && !round.every((fixture) => fixture.calculated);
  }) ?? matchweeks[matchweeks.length - 1];
  return fixtures.filter((fixture) => fixture.matchweek === current);
}

async function fetchCompetitionCalendar(competitionId: string, token: string): Promise<CalendarFixture[]> {
  try {
    const response = await fetch(`${API_BASE}/onboarding/v1/league/competition/calendar/${encodeURIComponent(competitionId)}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!response.ok) return [];
    return parseCalendar(await readJson(response));
  } catch {
    // Il calendario arricchisce la scheda squadra, ma non deve impedire il
    // caricamento della classifica quando il servizio secondario non risponde.
    return [];
  }
}

function recordPayload(value: unknown, depth = 0): JsonRecord | null {
  if (depth > 4 || !value) return null;
  if (!isRecord(value)) return null;
  const data = valueFor(value, ["data"]);
  return isRecord(data) ? recordPayload(data, depth + 1) : value;
}

function lineupSummary(value: unknown): { total: number | null; formation: string | null; playersWithVote: number } {
  if (!isRecord(value)) return { total: null, formation: null, playersWithVote: 0 };
  const startersValue = valueFor(value, ["starts", "starters"]);
  const starters = Array.isArray(startersValue) ? startersValue : [];
  const playersWithVote = starters.filter((player) => {
    if (!isRecord(player)) return false;
    return optionalNumeric(valueFor(player, ["cscr", "fantagrade", "scr", "grade"])) !== null;
  }).length;
  return {
    total: optionalNumeric(valueFor(value, ["tot", "total", "fantapoints", "fantapunti"])),
    formation: text(valueFor(value, ["mdl", "formation", "module"])) || null,
    playersWithVote,
  };
}

async function fetchMatchLineup(competitionId: string, fixture: CalendarFixture, token: string): Promise<{
  home: ReturnType<typeof lineupSummary>;
  away: ReturnType<typeof lineupSummary>;
} | null> {
  if (fixture.realMatchweek === null) return null;
  const parts = [competitionId, fixture.matchweek, fixture.realMatchweek, fixture.homeTeamId, fixture.awayTeamId]
    .map((part) => encodeURIComponent(String(part)))
    .join("/");
  try {
    const response = await fetch(`${API_BASE}/gaming/v1/teamLineup/${parts}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = recordPayload(await readJson(response));
    if (!payload) return null;
    return {
      home: lineupSummary(valueFor(payload, ["home"])),
      away: lineupSummary(valueFor(payload, ["away"])),
    };
  } catch {
    return null;
  }
}

async function buildCurrentMatchday(
  competitionId: string,
  token: string,
  teams: Map<string, string>,
  fixtures: CalendarFixture[],
): Promise<FantacalcioCurrentMatchday | null> {
  const current = selectCurrentFixtures(fixtures);
  if (!current.length) return null;
  const lineups = await Promise.all(current.map((fixture) => fetchMatchLineup(competitionId, fixture, token)));
  return {
    matchweek: current[0].matchweek,
    realMatchweek: current[0].realMatchweek,
    calculated: current.every((fixture) => fixture.calculated),
    matches: current.map((fixture, index) => {
      const lineup = lineups[index];
      return {
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeTeamName: teams.get(fixture.homeTeamId) ?? "Squadra di casa",
        awayTeamName: teams.get(fixture.awayTeamId) ?? "Squadra ospite",
        homePoints: fixture.homePoints ?? lineup?.home.total ?? null,
        awayPoints: fixture.awayPoints ?? lineup?.away.total ?? null,
        homeGoals: fixture.homeGoals,
        awayGoals: fixture.awayGoals,
        homeFormation: lineup?.home.formation ?? null,
        awayFormation: lineup?.away.formation ?? null,
        homePlayersWithVote: lineup?.home.playersWithVote ?? 0,
        awayPlayersWithVote: lineup?.away.playersWithVote ?? 0,
        calculated: fixture.calculated,
      };
    }),
  };
}

/**
 * Legge le stesse due risorse usate oggi da Leghe Fantacalcio: squadre della
 * competizione e classifica per giornate. L'HTML pubblico è ormai soltanto
 * il guscio dell'app Angular e non contiene più dati utilizzabili dal server.
 */
export async function fetchFantacalcioStandings(): Promise<FantacalcioStandingsResult> {
  const leagueUrl = await getLeagueUrl();
  if (!leagueUrl) return { items: [], error: "Link della lega non configurato: aggiungilo nella sezione Gestione.", currentMatchday: null };
  const competitionId = competitionIdFromUrl(leagueUrl);
  if (!competitionId) {
    return { items: [], error: "Incolla il link completo della competizione Fantacalcio (quello che contiene /competition/...).", currentMatchday: null };
  }

  const auth = await loginAndGetToken(leagueUrl);
  if (auth.error) return { items: [], error: auth.error, currentMatchday: null };

  try {
    const [teams, standings, calendar] = await Promise.all([
      fetchCompetitionTeams(competitionId, auth.token),
      fetchLegacyStandings(leagueUrl, competitionId, auth.token, auth.cookie),
      fetchCompetitionCalendar(competitionId, auth.token),
    ]);
    const teamIdByName = new Map([...teams].map(([id, name]) => [name.trim().toLocaleLowerCase("it-IT"), id]));
    const items = standings.rows
      .map((row, index) => {
        const sourceId = nestedTeamId(row);
        const sourceName = nestedName(row);
        const name = (sourceId ? teams.get(sourceId) : null) || sourceName;
        if (!name) return null;
        const teamId = (sourceId && teams.has(sourceId) ? sourceId : null)
          ?? teamIdByName.get(name.trim().toLocaleLowerCase("it-IT"))
          ?? sourceId;
        return toStanding({ ...row, teamName: name, teamId }, index + 1);
      })
      .filter((row): row is FantacalcioStanding => !!row);
    const currentMatchday = await buildCurrentMatchday(competitionId, auth.token, teams, calendar);
    if (items.length) return { items: items.sort((a, b) => a.position - b.position), error: null, currentMatchday };

    // Prima della prima giornata calcolata Leghe Fantacalcio restituisce una
    // classifica vuota, ma l'elenco delle squadre è già disponibile. Mostriamo
    // quindi la classifica provvisoria a zero punti invece di un errore.
    if (teams.size) {
      return {
        items: [...teams].map(([teamId, teamName], index) => ({
          position: index + 1,
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
        })),
        error: null,
        currentMatchday,
      };
    }
    if (standings.status === 401 || standings.status === 403) {
      return { items: [], error: "Fantacalcio ha rifiutato l'accesso: controlla l'account e le credenziali salvate nel deploy.", currentMatchday: null };
    }
    if (standings.status === 404) {
      return { items: [], error: "La competizione non è stata trovata. Apri la competizione su Leghe Fantacalcio e copia il link completo che contiene /competition/<id>.", currentMatchday: null };
    }
  } catch {
    return { items: [], error: "Non riesco a leggere squadre e classifica da Fantacalcio. Controlla il link della competizione e riprova.", currentMatchday: null };
  }
  return { items: [], error: "Fantacalcio non ha restituito una classifica leggibile. Verifica che la competizione abbia almeno una giornata calcolata.", currentMatchday: null };
}
