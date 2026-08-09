"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer, type Viewer } from "@/app/social-actions";
import {
  COUNTRY_OPTIONS,
  ROLE_OPTIONS,
  TRAINING_OPTIONS,
  acceptTransfer,
  chooseStartingClub,
  createInitialCareer,
  simulateNextSeason,
  type CareerSeason,
  type CareerState,
  type CountryCode,
  type GameMode,
  type PreferredFoot,
  type Role,
  type StartMode,
  type TrainingChoice,
} from "@/lib/career-engine";
import type { Json } from "@/lib/database.types";

export interface CreateCareerRequest {
  firstName: string;
  lastName: string;
  nationality: CountryCode;
  role: Role;
  preferredFoot: PreferredFoot;
  shirtNumber: number;
  gameMode: GameMode;
  startMode: StartMode;
  agentEnabled: boolean;
  startingClubName?: string;
}

export interface CareerRecord {
  id: string;
  ownerName: string;
  ownerLogo: string;
  dbVersion: number;
  state: CareerState;
  updatedAt: string;
}

export interface CareerHub {
  viewer: Viewer | null;
  career: CareerRecord | null;
  seasons: CareerSeason[];
  error: string | null;
}

export interface CareerMutationResult {
  hub: CareerHub;
  season?: CareerSeason;
  error: string | null;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type CareerRow = Awaited<ReturnType<typeof getOwnCareerRow>>;

function schemaMessage(message: string): string {
  if (/fanta_careers|fanta_career_seasons|schema cache|permission denied|relation .* does not exist/i.test(message)) {
    return "La modalità Carriera non è ancora attiva nel database. Applica la migrazione della carriera e riprova.";
  }
  return message;
}

function isCareerState(value: unknown): value is CareerState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CareerState>;
  return state.version === 1 && !!state.player && Array.isArray(state.seasons) && typeof state.goatScore === "number";
}

function parseState(value: Json): CareerState | null {
  return isCareerState(value) ? value : null;
}

function json(value: CareerState | CareerSeason): Json {
  return value as unknown as Json;
}

async function getOwnCareerRow(db: AdminClient, userId: string) {
  const { data, error } = await db
    .from("fanta_careers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };
}

async function readHub(viewer: Viewer): Promise<CareerHub> {
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error) return { viewer, career: null, seasons: [], error: schemaMessage(own.error.message) };
  if (!own.data) return { viewer, career: null, seasons: [], error: null };

  const state = parseState(own.data.state);
  if (!state) {
    return { viewer, career: null, seasons: [], error: "Il salvataggio della carriera non è leggibile." };
  }

  const seasonRes = await db
    .from("fanta_career_seasons")
    .select("summary")
    .eq("career_id", own.data.id)
    .order("season_no", { ascending: false });

  const storedSeasons = seasonRes.error
    ? []
    : (seasonRes.data ?? [])
        .map((row) => row.summary as unknown)
        .filter((row): row is CareerSeason => !!row && typeof row === "object" && "index" in row);

  return {
    viewer,
    career: {
      id: own.data.id,
      ownerName: own.data.owner_name,
      ownerLogo: own.data.owner_logo,
      dbVersion: own.data.version,
      state,
      updatedAt: own.data.updated_at,
    },
    seasons: storedSeasons.length > 0 ? storedSeasons : [...state.seasons].reverse(),
    error: seasonRes.error ? schemaMessage(seasonRes.error.message) : null,
  };
}

async function emptyHub(error: string): Promise<CareerHub> {
  return { viewer: null, career: null, seasons: [], error };
}

export async function fetchCareerHub(): Promise<CareerHub> {
  if (!isSupabaseConfigured()) return emptyHub("Database non configurato.");
  const viewer = await getCurrentViewer();
  if (!viewer) return emptyHub("Accedi per giocare la tua carriera.");
  return readHub(viewer);
}

function validRequest(input: CreateCareerRequest): string | null {
  if (!COUNTRY_OPTIONS.some((country) => country.code === input.nationality)) return "Nazionalità non valida.";
  if (!ROLE_OPTIONS.some((role) => role.code === input.role)) return "Ruolo non valido.";
  if (!["right", "left", "both"].includes(input.preferredFoot)) return "Piede preferito non valido.";
  if (!["realistic", "balanced", "legend"].includes(input.gameMode)) return "Modalità non valida.";
  if (!["academy", "freeAgent"].includes(input.startMode)) return "Tipo di partenza non valido.";
  return null;
}

export async function createCareer(input: CreateCareerRequest): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const invalid = validRequest(input);
  if (invalid) return { hub: await readHub(viewer), error: invalid };

  const db = createAdminClient();
  const existing = await getOwnCareerRow(db, viewer.userId);
  if (existing.error) {
    const error = schemaMessage(existing.error.message);
    return { hub: { viewer, career: null, seasons: [], error }, error };
  }
  if (existing.data) return { hub: await readHub(viewer), error: "Hai già una carriera salvata." };

  let state: CareerState;
  try {
    state = createInitialCareer(input, `${viewer.userId}:${crypto.randomUUID()}`);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Dati della carriera non validi.";
    return { hub: await readHub(viewer), error };
  }

  const now = new Date().toISOString();
  const { error: insertError } = await db.from("fanta_careers").insert({
    user_id: viewer.userId,
    owner_name: viewer.displayName,
    owner_logo: viewer.logo,
    status: state.stage === "retired" ? "retired" : "active",
    state: json(state),
    current_season: Math.max(1, state.seasonIndex + 1),
    goat_points: state.goatScore,
    version: 1,
    updated_at: now,
  });

  if (insertError) {
    const error = schemaMessage(insertError.message);
    return { hub: { viewer, career: null, seasons: [], error }, error };
  }

  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error: null };
}

async function saveState(
  db: AdminClient,
  row: NonNullable<CareerRow["data"]>,
  state: CareerState,
): Promise<string | null> {
  const { data, error } = await db
    .from("fanta_careers")
    .update({
      status: state.stage === "retired" ? "retired" : "active",
      state: json(state),
      current_season: Math.max(1, state.seasonIndex + 1),
      goat_points: state.goatScore,
      version: row.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("version", row.version)
    .select("id")
    .maybeSingle();

  if (error) return schemaMessage(error.message);
  if (!data) return "La carriera è stata aggiornata su un altro dispositivo. Ricarica e riprova.";
  return null;
}

export async function chooseCareerClub(clubName: string): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  let next: CareerState;
  try {
    next = chooseStartingClub(state, clubName);
  } catch (cause) {
    return { hub: await readHub(viewer), error: cause instanceof Error ? cause.message : "Club non valido." };
  }
  const error = await saveState(db, own.data, next);
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function advanceCareerSeason(choice: TrainingChoice, expectedVersion: number): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!TRAINING_OPTIONS.some((option) => option.code === choice)) {
    return { hub: await readHub(viewer), error: "Scelta di crescita non valida." };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { hub: await readHub(viewer), error: "Versione della carriera non valida. Ricarica e riprova." };
  }

  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  if (own.data.version !== expectedVersion) {
    return {
      hub: await readHub(viewer),
      error: "La stagione risulta già aggiornata. Ho ricaricato i progressi senza simularla di nuovo.",
    };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  let simulation: ReturnType<typeof simulateNextSeason>;
  try {
    simulation = simulateNextSeason(state, choice);
  } catch (cause) {
    return { hub: await readHub(viewer), error: cause instanceof Error ? cause.message : "Simulazione non riuscita." };
  }

  const { data: saved, error: transactionError } = await db.rpc("save_fanta_career_season", {
    p_career_id: own.data.id,
    p_user_id: viewer.userId,
    p_expected_version: own.data.version,
    p_status: simulation.state.stage === "retired" ? "retired" : "active",
    p_state: json(simulation.state),
    p_current_season: Math.max(1, simulation.state.seasonIndex + 1),
    p_goat_points: simulation.state.goatScore,
    p_season_no: simulation.season.index + 1,
    p_age: simulation.season.age,
    p_club_name: simulation.season.clubName,
    p_summary: json(simulation.season),
    p_season_goat_points: simulation.season.goatPointsEarned,
    p_updated_at: new Date().toISOString(),
  });

  const error = transactionError
    ? schemaMessage(transactionError.message)
    : saved
      ? null
      : "La carriera è stata aggiornata su un altro dispositivo. Ricarica e riprova.";
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), season: error ? undefined : simulation.season, error };
}

export async function acceptCareerTransfer(clubName: string): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  let next: CareerState;
  try {
    next = acceptTransfer(state, clubName);
  } catch (cause) {
    return { hub: await readHub(viewer), error: cause instanceof Error ? cause.message : "Offerta non valida." };
  }
  const error = await saveState(db, own.data, next);
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function declineCareerTransfers(): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };
  const error = await saveState(db, own.data, { ...state, pendingOffers: [] });
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function restartCareer(): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const db = createAdminClient();
  const { error: deleteError } = await db.from("fanta_careers").delete().eq("user_id", viewer.userId);
  const error = deleteError ? schemaMessage(deleteError.message) : null;
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}
