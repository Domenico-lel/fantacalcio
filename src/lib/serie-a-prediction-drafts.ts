import { fetchCompetitionMatches } from "@/lib/football-data";
import { FIXED_WIN_MULTIPLIER } from "@/lib/bet-constants";
import { stablePredictionUuid } from "@/lib/prediction-draft-utils";
import { selectNextCompleteMatchday } from "@/lib/serie-a-prediction-utils";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";

export interface SerieAPredictionDraftResult {
  day: number | null;
  roundId: string | null;
  matches: number;
  created: boolean;
  skipped: boolean;
  error: string | null;
}

let activePreparation: Promise<SerieAPredictionDraftResult> | null = null;

function result(patch: Partial<SerieAPredictionDraftResult> = {}): SerieAPredictionDraftResult {
  return {
    day: null,
    roundId: null,
    matches: 0,
    created: false,
    skipped: false,
    error: null,
    ...patch,
  };
}

async function prepareSerieADraft(): Promise<SerieAPredictionDraftResult> {
  if (!isSupabaseConfigured()) return result({ error: "Supabase non configurato." });

  const source = await fetchCompetitionMatches("SA");
  if (source.error) return result({ error: source.error });
  const fixtures = selectNextCompleteMatchday(source.matches);
  const day = fixtures[0]?.matchday ?? null;
  if (!day || fixtures.length === 0) {
    return result({ skipped: true, error: "Calendario della prossima giornata di Serie A non disponibile." });
  }

  const eventKey = fixtures.map((match) => match.eventId).sort().join(":");
  const roundId = stablePredictionUuid(`serie-a-round:${day}:${eventKey}`);
  const db = createAdminClient();
  const { data: exactRound, error: roundError } = await db
    .from("fanta_bet_rounds")
    .select("id, status")
    .eq("id", roundId)
    .maybeSingle();
  if (roundError) return result({ day, roundId, error: roundError.message });

  let targetRound = exactRound;
  let created = false;
  if (!targetRound) {
    const { data: inserted, error: insertError } = await db
      .from("fanta_bet_rounds")
      .insert({ id: roundId, day, title: "Serie A", status: "draft" })
      .select("id, status")
      .single();
    if (insertError) {
      // Invocazioni concorrenti convergono sullo stesso UUID senza duplicare.
      const { data: concurrent } = await db
        .from("fanta_bet_rounds")
        .select("id, status")
        .eq("id", roundId)
        .maybeSingle();
      if (!concurrent) return result({ day, roundId, error: insertError.message });
      targetRound = concurrent;
    } else {
      targetRound = inserted;
      created = true;
    }
  }

  if (!targetRound) return result({ day, roundId, error: "Impossibile creare la bozza Serie A." });
  if (targetRound.status !== "draft") {
    return result({ day, roundId, matches: fixtures.length, skipped: true });
  }

  const matches = fixtures.map((match) => ({
    id: stablePredictionUuid(`serie-a-match:${match.eventId}`),
    round_id: roundId,
    home_team: null,
    away_team: null,
    home_name: match.homeName,
    away_name: match.awayName,
    home_logo: match.homeLogo || null,
    away_logo: match.awayLogo || null,
    competition: "Serie A",
    ext_event_id: match.eventId,
    kickoff: match.kickoff,
    odd_1: FIXED_WIN_MULTIPLIER,
    odd_x: FIXED_WIN_MULTIPLIER,
    odd_2: FIXED_WIN_MULTIPLIER,
  }));

  const { error: upsertError } = await db
    .from("fanta_bet_matches")
    .upsert(matches, { onConflict: "id" });
  if (upsertError) return result({ day, roundId, created, error: upsertError.message });

  const keepIds = matches.map((match) => match.id);
  const { data: saved, error: savedError } = await db
    .from("fanta_bet_matches")
    .select("id")
    .eq("round_id", roundId);
  if (savedError) return result({ day, roundId, created, error: savedError.message });
  const staleIds = (saved ?? [])
    .map((match) => match.id)
    .filter((id) => id[14] === "5" && !keepIds.includes(id));
  if (staleIds.length) {
    const { error: deleteError } = await db.from("fanta_bet_matches").delete().in("id", staleIds);
    if (deleteError) return result({ day, roundId, created, error: deleteError.message });
  }

  return result({ day, roundId, matches: matches.length, created });
}

/** Prepara o aggiorna la bozza Serie A senza mai duplicare giornata o incontri. */
export async function ensureSerieAPredictionDraft(): Promise<SerieAPredictionDraftResult> {
  if (activePreparation) return activePreparation;
  activePreparation = prepareSerieADraft().finally(() => {
    activePreparation = null;
  });
  return activePreparation;
}
