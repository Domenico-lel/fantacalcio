import {
  ensureCurrentPredictionDraft,
  type PredictionDraftResult,
} from "@/lib/prediction-drafts";
import {
  ensureSerieAPredictionDraft,
  type SerieAPredictionDraftResult,
} from "@/lib/serie-a-prediction-drafts";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";

const LAST_CHECK_KEY = "all_prediction_drafts_last_checked_at";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface AllPredictionDraftsResult {
  fantasy: PredictionDraftResult;
  serieA: SerieAPredictionDraftResult;
  checkedAt: string | null;
}

let activePreparation: Promise<AllPredictionDraftsResult> | null = null;
let lastAttemptAt = 0;

function emptyFantasy(error: string | null = null): PredictionDraftResult {
  return { day: null, roundId: null, matches: 0, created: false, skipped: true, checkedAt: null, error };
}

function emptySerieA(error: string | null = null): SerieAPredictionDraftResult {
  return { day: null, roundId: null, matches: 0, oddsSources: 0, created: false, skipped: true, error };
}

async function saveCheckTimestamp(checkedAt: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key: LAST_CHECK_KEY, value: checkedAt, updated_at: checkedAt },
    { onConflict: "key" },
  );
  if (error) console.error("[prediction-drafts] Salvataggio timestamp fallito", error.message);
}

async function prepareAll(): Promise<AllPredictionDraftsResult> {
  const [fantasy, serieA] = await Promise.all([
    ensureCurrentPredictionDraft().catch((error) => emptyFantasy(
      error instanceof Error ? error.message : "Errore inatteso nella bozza Fantacalcio.",
    )),
    ensureSerieAPredictionDraft().catch((error) => emptySerieA(
      error instanceof Error ? error.message : "Errore inatteso nella bozza Serie A.",
    )),
  ]);
  const checkedAt = new Date().toISOString();
  await saveCheckTimestamp(checkedAt);
  return { fantasy, serieA, checkedAt };
}

/** Usata dal cron e dal pulsante admin per aggiornare entrambe le competizioni. */
export async function ensureAllPredictionDrafts(): Promise<AllPredictionDraftsResult> {
  if (!isSupabaseConfigured()) {
    const error = "Supabase non configurato.";
    return { fantasy: emptyFantasy(error), serieA: emptySerieA(error), checkedAt: null };
  }
  if (activePreparation) return activePreparation;
  lastAttemptAt = Date.now();
  activePreparation = prepareAll().finally(() => {
    activePreparation = null;
  });
  return activePreparation;
}

/** Fallback al primo accesso admin, limitato a una volta ogni sei ore. */
export async function ensureAllPredictionDraftsIfStale(): Promise<AllPredictionDraftsResult> {
  if (!isSupabaseConfigured()) {
    const error = "Supabase non configurato.";
    return { fantasy: emptyFantasy(error), serieA: emptySerieA(error), checkedAt: null };
  }
  if (activePreparation) return activePreparation;
  if (Date.now() - lastAttemptAt < 10 * 60 * 1000) {
    return { fantasy: emptyFantasy(), serieA: emptySerieA(), checkedAt: null };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_settings")
    .select("value")
    .eq("key", LAST_CHECK_KEY)
    .maybeSingle();
  if (error) {
    return { fantasy: emptyFantasy(error.message), serieA: emptySerieA(error.message), checkedAt: null };
  }
  const lastCheck = data?.value ? Date.parse(data.value) : 0;
  if (Number.isFinite(lastCheck) && Date.now() - lastCheck < CHECK_INTERVAL_MS) {
    return { fantasy: emptyFantasy(), serieA: emptySerieA(), checkedAt: data?.value ?? null };
  }
  return ensureAllPredictionDrafts();
}
