import { getLeagueUrl } from "@/lib/league-config";

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
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueFor(record: JsonRecord, keys: string[]): unknown {
  const wanted = new Set(keys.map(normalizedKey));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(normalizedKey(key))) return value;
  }
  return undefined;
}

function nestedName(record: JsonRecord): string {
  const direct = text(valueFor(record, ["teamName", "team_name", "fantateam", "fantateam_name", "name", "nome", "squadra", "n"]));
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

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  try { return JSON.parse(raw); } catch { return null; }
}

async function loginAndGetToken(leagueUrl: string): Promise<{ token: string; error: string | null }> {
  const username = (process.env.FANTACALCIO_USERNAME ?? "").trim();
  const password = process.env.FANTACALCIO_PASSWORD ?? "";
  if (!username || !password) {
    return { token: "", error: "Collegamento Fantacalcio non configurato: aggiungi username e password dell'account nelle variabili di ambiente del deploy." };
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${API_BASE}/onboarding/v1/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return { token: "", error: "Non riesco a raggiungere il login di Fantacalcio. Riprova tra poco." };
  }
  if (!loginResponse.ok) {
    return { token: "", error: "Login Fantacalcio rifiutato: controlla username e password nelle variabili di ambiente." };
  }
  const login = await readJson(loginResponse);
  if (!isRecord(login)) return { token: "", error: "Fantacalcio ha restituito una risposta di login non valida." };

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
        headers: { ...headers(token || accountToken), "X-Retry": "true" },
        body: JSON.stringify({ LeagueId: leagueId, JWT: "", UserId: userId, TokenAuth: accountToken }),
        cache: "no-store",
      });
      if (refreshResponse.ok) token = tokenFrom(await readJson(refreshResponse)) || token;
    } catch {
      // Il token del login rimane il fallback previsto dal client web.
    }
  }
  return token
    ? { token, error: null }
    : { token: "", error: "Login Fantacalcio completato, ma non è stato ricevuto il token della lega. Controlla che l'account possa aprire questa competizione." };
}

function findLegacyStandingRows(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 5 || !value) return [];
  if (Array.isArray(value)) {
    if (value.some((row) => isRecord(row) && valueFor(row, ["id"]) !== undefined && valueFor(row, ["p", "s_p", "g"]) !== undefined)) {
      return value.filter(isRecord);
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

async function fetchLegacyStandings(leagueUrl: string, competitionId: string, token: string): Promise<{ rows: JsonRecord[]; status: number }> {
  const alias = new URL(leagueUrl).pathname.split("/").filter(Boolean)[0] ?? "";
  const params = new URLSearchParams({
    alias_lega: alias,
    id_competizione: competitionId,
    giornata_inizio: "1",
    giornata_fine: "60",
  });
  const response = await fetch(`${LEGACY_API_BASE}/v1_legheCompetizione/classificagiornate?${params}`, {
    headers: headers(token),
    cache: "no-store",
  });
  return { rows: response.ok ? findLegacyStandingRows(await readJson(response)) : [], status: response.status };
}

/**
 * Legge le stesse due risorse usate oggi da Leghe Fantacalcio: squadre della
 * competizione e classifica per giornate. L'HTML pubblico è ormai soltanto
 * il guscio dell'app Angular e non contiene più dati utilizzabili dal server.
 */
export async function fetchFantacalcioStandings(): Promise<FantacalcioStandingsResult> {
  const leagueUrl = await getLeagueUrl();
  if (!leagueUrl) return { items: [], error: "Link della lega non configurato: aggiungilo nella sezione Gestione." };
  const competitionId = competitionIdFromUrl(leagueUrl);
  if (!competitionId) {
    return { items: [], error: "Incolla il link completo della competizione Fantacalcio (quello che contiene /competition/...)." };
  }

  const auth = await loginAndGetToken(leagueUrl);
  if (auth.error) return { items: [], error: auth.error };

  try {
    const [teams, standings] = await Promise.all([
      fetchCompetitionTeams(competitionId, auth.token),
      fetchLegacyStandings(leagueUrl, competitionId, auth.token),
    ]);
    const items = standings.rows
      .map((row, index) => {
        const id = nestedTeamId(row);
        const name = id ? teams.get(id) : null;
        return name ? toStanding({ ...row, teamName: name }, index + 1) : null;
      })
      .filter((row): row is FantacalcioStanding => !!row);
    if (items.length) return { items: items.sort((a, b) => a.position - b.position), error: null };

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
      };
    }
    if (standings.status === 401 || standings.status === 403) {
      return { items: [], error: "Fantacalcio ha rifiutato l'accesso: controlla l'account e le credenziali salvate nel deploy." };
    }
    if (standings.status === 404) {
      return { items: [], error: "La competizione non è stata trovata. Apri la competizione su Leghe Fantacalcio e copia il link completo che contiene /competition/<id>." };
    }
  } catch {
    return { items: [], error: "Non riesco a leggere squadre e classifica da Fantacalcio. Controlla il link della competizione e riprova." };
  }
  return { items: [], error: "Fantacalcio non ha restituito una classifica leggibile. Verifica che la competizione abbia almeno una giornata calcolata." };
}
