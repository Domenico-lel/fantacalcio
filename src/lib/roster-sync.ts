import { fetchFantacalcioRosters } from "@/lib/fantacalcio-api";
import { buildRosterSyncPlan } from "@/lib/roster-sync-plan";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";

const LAST_SYNC_KEY = "rosters_last_synced_at";
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface RosterSyncResult {
  teams: number;
  players: number;
  inserted: number;
  updated: number;
  deleted: number;
  unresolved: number;
  skipped: boolean;
  syncedAt: string | null;
  error: string | null;
}

let activeSync: Promise<RosterSyncResult> | null = null;
let lastAttemptAt = 0;

function emptyResult(error: string | null = null): RosterSyncResult {
  return {
    teams: 0,
    players: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unresolved: 0,
    skipped: false,
    syncedAt: null,
    error,
  };
}

function normalizedName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

async function runRosterSync(): Promise<RosterSyncResult> {
  if (!isSupabaseConfigured()) return emptyResult("Supabase non configurato.");

  const source = await fetchFantacalcioRosters();
  if (source.error || !source.teams.length) return emptyResult(source.error ?? "Nessuna rosa ricevuta.");

  const db = createAdminClient();
  const { data: savedTeams, error: teamsError } = await db
    .from("fanta_teams")
    .select("id, name, team_id");
  if (teamsError) return emptyResult(teamsError.message);

  const teams = [...(savedTeams ?? [])];
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  let syncedTeams = 0;
  const failedTeams: string[] = [];

  for (const sourceTeam of source.teams) {
    let savedTeam = teams.find((team) => team.team_id === sourceTeam.teamId)
      ?? teams.find((team) => normalizedName(team.name) === normalizedName(sourceTeam.teamName));

    if (!savedTeam) {
      const { data, error } = await db
        .from("fanta_teams")
        .insert({ name: sourceTeam.teamName, team_id: sourceTeam.teamId })
        .select("id, name, team_id")
        .single();
      if (error || !data) return emptyResult(error?.message ?? `Impossibile creare ${sourceTeam.teamName}.`);
      savedTeam = data;
      teams.push(data);
    } else if (!savedTeam.team_id) {
      const { error } = await db.from("fanta_teams").update({ team_id: sourceTeam.teamId }).eq("id", savedTeam.id);
      if (error) return emptyResult(error.message);
      savedTeam.team_id = sourceTeam.teamId;
    }

    const { data: currentPlayers, error: rosterReadError } = await db
      .from("fanta_roster")
      .select("id, player_name, role, photo_url")
      .eq("team_ref", savedTeam.id);
    if (rosterReadError) return emptyResult(rosterReadError.message);

    const plan = buildRosterSyncPlan(currentPlayers ?? [], sourceTeam.players);
    let teamWriteFailed = false;
    if (plan.insertions.length) {
      const { error } = await db.from("fanta_roster").insert(
        plan.insertions.map((player) => ({
          team_ref: savedTeam.id,
          player_name: player.name,
          role: player.role,
          photo_url: player.photoUrl,
        })),
      );
      if (error) {
        teamWriteFailed = true;
        failedTeams.push(sourceTeam.teamName);
        console.error("[roster-sync] Inserimento rosa fallito", { team: sourceTeam.teamName, error: error.message });
      } else {
        inserted += plan.insertions.length;
      }
    }

    if (plan.updates.length) {
      const updateResults = await Promise.all(plan.updates.map(({ id, player }) => (
        db.from("fanta_roster")
          .update({ player_name: player.name, role: player.role, photo_url: player.photoUrl })
          .eq("id", id)
      )));
      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) {
        teamWriteFailed = true;
        if (!failedTeams.includes(sourceTeam.teamName)) failedTeams.push(sourceTeam.teamName);
        console.error("[roster-sync] Aggiornamento rosa fallito", { team: sourceTeam.teamName, error: updateError.message });
      } else {
        updated += plan.updates.length;
      }
    }

    // Prima inseriamo/aggiorniamo, poi eliminiamo i record non più ufficiali.
    // Se il listone non risolve qualche ID o una scrittura fallisce, conserviamo
    // i record precedenti per evitare una rosa parziale o vuota.
    if (!teamWriteFailed && sourceTeam.unresolvedPlayerIds.length === 0) {
      if (plan.staleIds.length) {
        const { error } = await db.from("fanta_roster").delete().in("id", plan.staleIds);
        if (error) return emptyResult(error.message);
        deleted += plan.staleIds.length;
      }
    }
    syncedTeams += 1;
  }

  if (failedTeams.length) {
    return {
      teams: syncedTeams,
      players: source.playerCount,
      inserted,
      updated,
      deleted,
      unresolved: source.unresolvedCount,
      skipped: false,
      syncedAt: null,
      error: `Sincronizzazione incompleta per: ${failedTeams.join(", ")}. I dati precedenti sono stati preservati.`,
    };
  }

  const syncedAt = new Date().toISOString();
  const { error: timestampError } = await db.from("fanta_settings").upsert(
    { key: LAST_SYNC_KEY, value: syncedAt, updated_at: syncedAt },
    { onConflict: "key" },
  );
  if (timestampError) return emptyResult(timestampError.message);

  return {
    teams: syncedTeams,
    players: source.playerCount,
    inserted,
    updated,
    deleted,
    unresolved: source.unresolvedCount,
    skipped: false,
    syncedAt,
    error: null,
  };
}

/** Sincronizzazione esplicita (cron o azione admin), deduplicata per istanza. */
export async function syncLeagueRosters(): Promise<RosterSyncResult> {
  if (activeSync) return activeSync;
  lastAttemptAt = Date.now();
  activeSync = runRosterSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

/** Aggiorna soltanto se l'ultima sincronizzazione riuscita risale a oltre 24 ore fa. */
export async function syncLeagueRostersIfStale(): Promise<RosterSyncResult> {
  if (!isSupabaseConfigured()) return emptyResult("Supabase non configurato.");
  if (activeSync) return activeSync;
  // Limita i tentativi falliti durante refresh ripetuti della PWA.
  if (Date.now() - lastAttemptAt < 15 * 60 * 1000) {
    return { ...emptyResult(), skipped: true };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_settings")
    .select("value")
    .eq("key", LAST_SYNC_KEY)
    .maybeSingle();
  if (error) return emptyResult(error.message);

  const lastSync = data?.value ? Date.parse(data.value) : 0;
  if (Number.isFinite(lastSync) && Date.now() - lastSync < SYNC_INTERVAL_MS) {
    return { ...emptyResult(), skipped: true, syncedAt: data?.value ?? null };
  }
  return syncLeagueRosters();
}
