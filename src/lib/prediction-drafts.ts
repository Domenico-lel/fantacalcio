import { fetchFantacalcioStandings } from "@/lib/fantacalcio-api";
import { getLeagueUrl } from "@/lib/league-config";
import { calculateStandingsOdds, stablePredictionUuid } from "@/lib/prediction-draft-utils";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";

const LAST_CHECK_KEY = "prediction_draft_last_checked_at";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface PredictionDraftResult {
  day: number | null;
  roundId: string | null;
  matches: number;
  created: boolean;
  skipped: boolean;
  checkedAt: string | null;
  error: string | null;
}

let activePreparation: Promise<PredictionDraftResult> | null = null;
let lastAttemptAt = 0;

function result(patch: Partial<PredictionDraftResult> = {}): PredictionDraftResult {
  return {
    day: null,
    roundId: null,
    matches: 0,
    created: false,
    skipped: false,
    checkedAt: null,
    error: null,
    ...patch,
  };
}

function normalizedName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

async function saveCheckTimestamp(checkedAt: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key: LAST_CHECK_KEY, value: checkedAt, updated_at: checkedAt },
    { onConflict: "key" },
  );
  if (error) console.error("[prediction-draft] Salvataggio timestamp fallito", error.message);
}

async function preparePredictionDraft(): Promise<PredictionDraftResult> {
  if (!isSupabaseConfigured()) return result({ error: "Supabase non configurato." });

  const [source, leagueUrl] = await Promise.all([fetchFantacalcioStandings(), getLeagueUrl()]);
  if (source.error) return result({ error: source.error });
  if (!leagueUrl) return result({ error: "Link della lega non configurato." });
  const matchday = source.currentMatchday;
  if (!matchday?.matches.length) return result({ skipped: true, error: "Calendario della prossima giornata non disponibile." });
  if (matchday.calculated) {
    const checkedAt = new Date().toISOString();
    await saveCheckTimestamp(checkedAt);
    return result({ day: matchday.matchweek, skipped: true, checkedAt });
  }

  const competitionId = leagueUrl.match(/\/competition\/(\d+)(?:\/|$)/i)?.[1] ?? leagueUrl;
  const roundId = stablePredictionUuid(`fantacalcio-round:${competitionId}:${matchday.matchweek}`);
  const db = createAdminClient();
  const { data: teams, error: teamsError } = await db
    .from("fanta_teams")
    .select("id, name, team_id");
  if (teamsError) return result({ day: matchday.matchweek, error: teamsError.message });

  const teamBySourceId = new Map((teams ?? []).flatMap((team) => team.team_id ? [[team.team_id, team] as const] : []));
  const teamByName = new Map((teams ?? []).map((team) => [normalizedName(team.name), team]));
  const positionBySourceId = new Map(source.items.flatMap((team) => team.teamId ? [[team.teamId, team.position] as const] : []));
  const positionByName = new Map(source.items.map((team) => [normalizedName(team.teamName), team.position]));
  const teamCount = Math.max(source.items.length, teams?.length ?? 0, 2);

  const preparedMatches = matchday.matches.map((fixture) => {
    const home = teamBySourceId.get(fixture.homeTeamId) ?? teamByName.get(normalizedName(fixture.homeTeamName));
    const away = teamBySourceId.get(fixture.awayTeamId) ?? teamByName.get(normalizedName(fixture.awayTeamName));
    if (!home || !away) return null;
    const homePosition = positionBySourceId.get(fixture.homeTeamId)
      ?? positionByName.get(normalizedName(fixture.homeTeamName))
      ?? teamCount;
    const awayPosition = positionBySourceId.get(fixture.awayTeamId)
      ?? positionByName.get(normalizedName(fixture.awayTeamName))
      ?? teamCount;
    const odds = calculateStandingsOdds(homePosition, awayPosition, teamCount);
    return {
      id: stablePredictionUuid(`fantacalcio-match:${roundId}:${fixture.homeTeamId}:${fixture.awayTeamId}`),
      round_id: roundId,
      home_team: home.id,
      away_team: away.id,
      home_name: home.name,
      away_name: away.name,
      odd_1: odds.odd1,
      odd_x: odds.oddX,
      odd_2: odds.odd2,
    };
  }).filter((match): match is NonNullable<typeof match> => !!match);

  if (preparedMatches.length !== matchday.matches.length) {
    return result({
      day: matchday.matchweek,
      error: "Alcune squadre del calendario non sono ancora collegate. Sincronizza prima squadre e rose.",
    });
  }

  const { data: exactRound, error: exactRoundError } = await db
    .from("fanta_bet_rounds")
    .select("id, status")
    .eq("id", roundId)
    .maybeSingle();
  if (exactRoundError) return result({ day: matchday.matchweek, error: exactRoundError.message });

  let targetRound = exactRound;
  let created = false;
  if (!targetRound) {
    const { data: insertedRound, error: insertError } = await db
      .from("fanta_bet_rounds")
      .insert({ id: roundId, day: matchday.matchweek, title: "Lega Fantacalcio", status: "draft" })
      .select("id, status")
      .single();
    if (insertError) {
      // Due invocazioni contemporanee usano lo stesso UUID: quella che perde
      // il conflitto recupera semplicemente la bozza appena creata.
      const { data: concurrentRound } = await db
        .from("fanta_bet_rounds")
        .select("id, status")
        .eq("id", roundId)
        .maybeSingle();
      if (!concurrentRound) return result({ day: matchday.matchweek, error: insertError.message });
      targetRound = concurrentRound;
    } else {
      targetRound = insertedRound;
      created = true;
    }
  }

  if (!targetRound) return result({ day: matchday.matchweek, error: "Impossibile creare la bozza." });
  if (targetRound.status !== "draft") {
    const checkedAt = new Date().toISOString();
    await saveCheckTimestamp(checkedAt);
    return result({ day: matchday.matchweek, roundId: targetRound.id, skipped: true, checkedAt });
  }
  // Aggiorna anche eventuali bozze create dalla prima versione dell'automazione,
  // che non avevano un titolo e sarebbero ambigue accanto alla Serie A.
  const { error: titleError } = await db
    .from("fanta_bet_rounds")
    .update({ title: "Lega Fantacalcio" })
    .eq("id", targetRound.id);
  if (titleError) {
    return result({ day: matchday.matchweek, roundId: targetRound.id, created, error: titleError.message });
  }

  // Il round ha un UUID specifico per la lega: può convivere con una giornata
  // Serie A che abbia lo stesso numero senza riutilizzare bozze manuali.
  const matchesForRound = preparedMatches.map((match) => ({
    ...match,
    id: stablePredictionUuid(`fantacalcio-match:${targetRound.id}:${match.home_team}:${match.away_team}`),
    round_id: targetRound.id,
  }));
  const { error: upsertError } = await db
    .from("fanta_bet_matches")
    .upsert(matchesForRound, { onConflict: "id" });
  if (upsertError) return result({ day: matchday.matchweek, roundId: targetRound.id, created, error: upsertError.message });

  const keepIds = matchesForRound.map((match) => match.id);
  const { data: savedMatches, error: savedError } = await db
    .from("fanta_bet_matches")
    .select("id")
    .eq("round_id", targetRound.id);
  if (savedError) return result({ day: matchday.matchweek, roundId: targetRound.id, created, error: savedError.message });
  // Gli UUID v5 sono quelli generati dall'automazione. Gli eventuali scontri
  // aggiunti a mano (UUID v4 del database) restano intatti nella bozza.
  const staleIds = (savedMatches ?? [])
    .map((match) => match.id)
    .filter((id) => id[14] === "5" && !keepIds.includes(id));
  if (staleIds.length) {
    const { error: deleteError } = await db.from("fanta_bet_matches").delete().in("id", staleIds);
    if (deleteError) return result({ day: matchday.matchweek, roundId: targetRound.id, created, error: deleteError.message });
  }

  const checkedAt = new Date().toISOString();
  await saveCheckTimestamp(checkedAt);
  return result({
    day: matchday.matchweek,
    roundId: targetRound.id,
    matches: matchesForRound.length,
    created,
    checkedAt,
  });
}

/** Preparazione esplicita, usata dal cron e dal pulsante admin. */
export async function ensureCurrentPredictionDraft(): Promise<PredictionDraftResult> {
  if (activePreparation) return activePreparation;
  lastAttemptAt = Date.now();
  activePreparation = preparePredictionDraft().finally(() => {
    activePreparation = null;
  });
  return activePreparation;
}

/** Controllo leggero per l'apertura della pagina admin, massimo ogni sei ore. */
export async function ensureCurrentPredictionDraftIfStale(): Promise<PredictionDraftResult> {
  if (!isSupabaseConfigured()) return result({ error: "Supabase non configurato." });
  if (activePreparation) return activePreparation;
  if (Date.now() - lastAttemptAt < 10 * 60 * 1000) return result({ skipped: true });

  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_settings")
    .select("value")
    .eq("key", LAST_CHECK_KEY)
    .maybeSingle();
  if (error) return result({ error: error.message });
  const lastCheck = data?.value ? Date.parse(data.value) : 0;
  if (Number.isFinite(lastCheck) && Date.now() - lastCheck < CHECK_INTERVAL_MS) {
    return result({ skipped: true, checkedAt: data?.value ?? null });
  }
  return ensureCurrentPredictionDraft();
}
