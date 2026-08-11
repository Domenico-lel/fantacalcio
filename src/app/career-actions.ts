"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer, type Viewer } from "@/app/social-actions";
import {
  COUNTRY_OPTIONS,
  ROLE_OPTIONS,
  TRAINING_OPTIONS,
  acceptTransfer,
  acknowledgeSeasonReport,
  chooseStartingClub,
  continueCareerDecision,
  createInitialCareer,
  declineTransferOffers,
  normalizeCareerDecisionState,
  resolveCareerDecision,
  simulateNextSeason,
  upgradeCareerCatalog,
  type CareerDecisionResult,
  type CareerSeason,
  type CareerState,
  type CountryCode,
  type GameMode,
  type PreferredFoot,
  type Role,
  type StartMode,
  type TrainingChoice,
} from "@/lib/career-engine";
import type { Database, Json } from "@/lib/database.types";

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
  status: "active" | "retired" | "archived";
  dbVersion: number;
  state: CareerState;
  createdAt: string;
  updatedAt: string;
}

export interface CareerHub {
  viewer: Viewer | null;
  career: CareerRecord | null;
  seasons: CareerSeason[];
  archivedCareers: CareerRecord[];
  error: string | null;
}

export interface CareerMutationResult {
  hub: CareerHub;
  season?: CareerSeason;
  decision?: CareerDecisionResult;
  error: string | null;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type CareerRow = Awaited<ReturnType<typeof getOwnCareerRow>>;
type CareerTableRow = Database["public"]["Tables"]["fanta_careers"]["Row"];

function schemaMessage(message: string): string {
  if (/duplicate key|fanta_careers_one_active_per_user_idx/i.test(message)) {
    return "Hai già una carriera attiva. Ricarica per vedere i progressi più recenti.";
  }
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
  return isCareerState(value) ? normalizeCareerDecisionState(upgradeCareerCatalog(value)) : null;
}

function json(value: CareerState | CareerSeason): Json {
  return value as unknown as Json;
}

async function getOwnCareerRow(db: AdminClient, userId: string) {
  const { data, error } = await db
    .from("fanta_careers")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "retired"])
    // "active" viene prima di "retired": in assenza di un'attiva teniamo
    // visibile l'ultima conclusa finche l'utente non la archivia.
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

function careerRecord(row: CareerTableRow): CareerRecord | null {
  const state = parseState(row.state);
  if (!state) return null;
  return {
    id: row.id,
    ownerName: row.owner_name,
    ownerLogo: row.owner_logo,
    status: row.status,
    dbVersion: row.version,
    state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readHub(viewer: Viewer): Promise<CareerHub> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_careers")
    .select("*")
    .eq("user_id", viewer.userId)
    .order("updated_at", { ascending: false });
  if (error) {
    return {
      viewer,
      career: null,
      seasons: [],
      archivedCareers: [],
      error: schemaMessage(error.message),
    };
  }

  const rows = data ?? [];
  const currentRow = rows.find((row) => row.status === "active")
    ?? rows.find((row) => row.status === "retired")
    ?? null;
  const career = currentRow ? careerRecord(currentRow) : null;
  if (currentRow && !career) {
    return {
      viewer,
      career: null,
      seasons: [],
      archivedCareers: rows
        .filter((row) => row.status === "archived")
        .map(careerRecord)
        .filter((record): record is CareerRecord => record !== null),
      error: "Il salvataggio della carriera non è leggibile.",
    };
  }

  const archivedCareers = rows
    .filter((row) => row.status === "archived" || (row.status === "retired" && row.id !== currentRow?.id))
    .map(careerRecord)
    .filter((record): record is CareerRecord => record !== null);

  return {
    viewer,
    career,
    // Lo stato versionato e la fonte autorevole: contiene anche le stagioni
    // convertite dal vecchio catalogo fittizio ai club reali.
    seasons: career ? [...career.state.seasons].reverse() : [],
    archivedCareers,
    error: null,
  };
}

async function emptyHub(error: string): Promise<CareerHub> {
  return { viewer: null, career: null, seasons: [], archivedCareers: [], error };
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
    return { hub: { viewer, career: null, seasons: [], archivedCareers: [], error }, error };
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
    return { hub: { viewer, career: null, seasons: [], archivedCareers: [], error }, error };
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

function validExpectedVersion(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

function validMutationId(value: string): boolean {
  return value.trim().length > 0 && value.length <= 160;
}

export async function resolveCareerChoice(
  decisionId: string,
  optionId: string,
  expectedVersion: number,
): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!validMutationId(decisionId) || !validMutationId(optionId) || !validExpectedVersion(expectedVersion)) {
    return { hub: await readHub(viewer), error: "Scelta non valida. Ricarica e riprova." };
  }

  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  const alreadyResolved = state.decisionHistory?.find(
    (item) => item.decisionId === decisionId && item.optionId === optionId,
  );
  if (own.data.version !== expectedVersion) {
    return alreadyResolved
      ? { hub: await readHub(viewer), decision: alreadyResolved, error: null }
      : {
          hub: await readHub(viewer),
          error: "La decisione è cambiata su un altro dispositivo. Ho ricaricato i progressi.",
        };
  }

  let resolution: ReturnType<typeof resolveCareerDecision>;
  try {
    resolution = resolveCareerDecision(state, decisionId, optionId);
  } catch (cause) {
    return {
      hub: await readHub(viewer),
      error: cause instanceof Error ? cause.message : "Non riesco ad applicare questa scelta.",
    };
  }

  const error = await saveState(db, own.data, resolution.state);
  revalidatePath("/carriera");
  return {
    hub: await readHub(viewer),
    decision: error ? undefined : resolution.result,
    error,
  };
}

export async function continueCareerChoice(
  decisionId: string,
  expectedVersion: number,
): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!validMutationId(decisionId) || !validExpectedVersion(expectedVersion)) {
    return { hub: await readHub(viewer), error: "Decisione non valida. Ricarica e riprova." };
  }

  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  if (own.data.version !== expectedVersion) {
    const wasContinued = state.pendingDecision?.id !== decisionId
      && !!state.decisionHistory?.some((item) => item.decisionId === decisionId);
    return wasContinued
      ? { hub: await readHub(viewer), error: null }
      : {
          hub: await readHub(viewer),
          error: "La decisione è cambiata su un altro dispositivo. Ho ricaricato i progressi.",
        };
  }

  let next: CareerState;
  try {
    next = continueCareerDecision(state, decisionId);
  } catch (cause) {
    return {
      hub: await readHub(viewer),
      error: cause instanceof Error ? cause.message : "Non riesco a continuare la carriera.",
    };
  }

  const error = await saveState(db, own.data, next);
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function acknowledgeCareerReport(
  seasonId: string,
  expectedVersion: number,
): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!validMutationId(seasonId) || !validExpectedVersion(expectedVersion)) {
    return { hub: await readHub(viewer), error: "Report non valido. Ricarica e riprova." };
  }

  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };

  if (own.data.version !== expectedVersion) {
    const wasAcknowledged = state.pendingSeasonReportId !== seasonId
      && state.seasons.some((season) => season.id === seasonId);
    return wasAcknowledged
      ? { hub: await readHub(viewer), error: null }
      : {
          hub: await readHub(viewer),
          error: "Il report è cambiato su un altro dispositivo. Ho ricaricato i progressi.",
        };
  }

  let next: CareerState;
  try {
    next = acknowledgeSeasonReport(state, seasonId);
  } catch (cause) {
    return {
      hub: await readHub(viewer),
      error: cause instanceof Error ? cause.message : "Non riesco a chiudere il report.",
    };
  }

  const error = await saveState(db, own.data, next);
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function acceptCareerTransfer(
  clubName: string,
  expectedVersion: number,
): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!validExpectedVersion(expectedVersion)) {
    return { hub: await readHub(viewer), error: "Versione della carriera non valida. Ricarica e riprova." };
  }
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };
  if (own.data.version !== expectedVersion) {
    const alreadyAccepted = state.currentClub?.name.toLocaleLowerCase("it") === clubName.trim().toLocaleLowerCase("it")
      && state.pendingOffers.length === 0;
    return alreadyAccepted
      ? { hub: await readHub(viewer), error: null }
      : {
          hub: await readHub(viewer),
          error: "Le offerte sono cambiate su un altro dispositivo. Ho ricaricato il mercato.",
        };
  }

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

export async function declineCareerTransfers(expectedVersion: number): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  if (!validExpectedVersion(expectedVersion)) {
    return { hub: await readHub(viewer), error: "Versione della carriera non valida. Ricarica e riprova." };
  }
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error || !own.data) {
    const error = schemaMessage(own.error?.message ?? "Carriera non trovata.");
    return { hub: await readHub(viewer), error };
  }
  const state = parseState(own.data.state);
  if (!state) return { hub: await readHub(viewer), error: "Salvataggio non valido." };
  if (own.data.version !== expectedVersion) {
    return state.pendingOffers.length === 0
      ? { hub: await readHub(viewer), error: null }
      : {
          hub: await readHub(viewer),
          error: "Le offerte sono cambiate su un altro dispositivo. Ho ricaricato il mercato.",
        };
  }

  let next: CareerState;
  try {
    next = declineTransferOffers(state);
  } catch (cause) {
    return {
      hub: await readHub(viewer),
      error: cause instanceof Error ? cause.message : "Non riesco a rifiutare le offerte.",
    };
  }
  const error = await saveState(db, own.data, next);
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}

export async function restartCareer(expectedVersion: number): Promise<CareerMutationResult> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { hub: await emptyHub("Non autenticato."), error: "Non autenticato." };
  const db = createAdminClient();
  const own = await getOwnCareerRow(db, viewer.userId);
  if (own.error) {
    const error = schemaMessage(own.error.message);
    return { hub: await readHub(viewer), error };
  }
  if (!own.data) return { hub: await readHub(viewer), error: null };
  if (own.data.version !== expectedVersion) {
    return {
      hub: await readHub(viewer),
      error: "La carriera è cambiata su un altro dispositivo. Ho ricaricato i progressi: controllali prima di archiviarla.",
    };
  }

  // "Ricomincia" non distrugge piu la cronologia: la carriera e le relative
  // stagioni restano consultabili nell'archivio e una nuova riga potra essere
  // creata con createCareer.
  const { data, error: archiveError } = await db
    .from("fanta_careers")
    .update({
      status: "archived",
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", own.data.id)
    .eq("user_id", viewer.userId)
    .eq("version", expectedVersion)
    .select("id")
    .maybeSingle();
  const error = archiveError
    ? schemaMessage(archiveError.message)
    : data
      ? null
      : "La carriera è stata aggiornata su un altro dispositivo. Ricarica e riprova.";
  revalidatePath("/carriera");
  return { hub: await readHub(viewer), error };
}
