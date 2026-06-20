"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { fetchLeagueTeams } from "@/lib/league-teams";
import { getCurrentViewer } from "@/app/social-actions";

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  teamId: string | null;
  claimed: boolean;
  mine: boolean;
}

export interface RosterPlayer {
  id: string;
  playerName: string;
  role: "P" | "D" | "C" | "A" | null;
}

// ─── Squadre ──────────────────────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
  if (!isSupabaseConfigured()) return [];
  const viewer = await getCurrentViewer();
  const db = createAdminClient();

  const [{ data: teams }, { data: profiles }] = await Promise.all([
    db.from("fanta_teams").select("*").order("name", { ascending: true }),
    db.from("fanta_profiles").select("user_id, team_ref"),
  ]);

  const claimedBy = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.team_ref) claimedBy.set(p.team_ref, p.user_id);
  }

  return (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logo_url,
    teamId: t.team_id,
    claimed: claimedBy.has(t.id),
    mine: !!viewer && claimedBy.get(t.id) === viewer.userId,
  }));
}

export async function syncTeams(): Promise<{ count: number; error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { count: 0, error: "Solo l'admin può sincronizzare le squadre" };

  const teams = await fetchLeagueTeams();
  if (teams.length === 0) return { count: 0, error: "Nessuna squadra trovata nella classifica (controlla lo slug lega)" };

  const db = createAdminClient();
  const rows = teams.map((t) => ({ name: t.name, team_id: t.teamId }));
  const { error } = await db.from("fanta_teams").upsert(rows, { onConflict: "name" });
  return { count: error ? 0 : teams.length, error: error?.message ?? null };
}

export async function uploadTeamLogo(teamRef: string, formData: FormData): Promise<{ url: string | null; error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { url: null, error: "Solo l'admin può caricare i loghi" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { url: null, error: "Nessun file valido" };
  if (file.size > 3 * 1024 * 1024) return { url: null, error: "Immagine troppo grande (max 3MB)" };

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${teamRef}/${crypto.randomUUID()}.${ext}`;
  const db = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await db.storage.from("team-logos").upload(path, buffer, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (upErr) return { url: null, error: upErr.message };

  const { data } = db.storage.from("team-logos").getPublicUrl(path);
  const { error } = await db.from("fanta_teams").update({ logo_url: data.publicUrl }).eq("id", teamRef);
  return { url: error ? null : data.publicUrl, error: error?.message ?? null };
}

// ─── Rose ────────────────────────────────────────────────────────────────

export async function fetchRoster(teamRef: string): Promise<RosterPlayer[]> {
  if (!teamRef || !isSupabaseConfigured()) return [];
  const db = createAdminClient();
  const { data } = await db
    .from("fanta_roster")
    .select("id, player_name, role")
    .eq("team_ref", teamRef)
    .order("role", { ascending: true })
    .order("player_name", { ascending: true });
  return (data ?? []).map((r) => ({ id: r.id, playerName: r.player_name, role: r.role }));
}

export async function fetchMyRoster(): Promise<{ teamRef: string | null; players: RosterPlayer[] }> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { teamRef: null, players: [] };
  const db = createAdminClient();
  const { data: profile } = await db
    .from("fanta_profiles")
    .select("team_ref")
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (!profile?.team_ref) return { teamRef: null, players: [] };
  const players = await fetchRoster(profile.team_ref);
  return { teamRef: profile.team_ref, players };
}

export async function addRosterPlayer(teamRef: string, playerName: string, role: string | null): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin può modificare le rose" };
  const name = (playerName ?? "").trim();
  if (!name) return { error: "Inserisci il nome del giocatore" };
  const r = role && ["P", "D", "C", "A"].includes(role) ? (role as "P" | "D" | "C" | "A") : null;

  const db = createAdminClient();
  const { error } = await db.from("fanta_roster").insert({ team_ref: teamRef, player_name: name, role: r });
  return { error: error?.message ?? null };
}

export async function deleteRosterPlayer(id: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Non autorizzato" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_roster").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ─── Reclama squadra (registrazione) ────────────────────────────────────────

export async function claimTeam(teamRef: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { error: "Non autenticato" };

  const db = createAdminClient();
  const { data: taken } = await db
    .from("fanta_profiles")
    .select("user_id")
    .eq("team_ref", teamRef)
    .maybeSingle();
  if (taken && taken.user_id !== viewer.userId) {
    return { error: "Questa squadra è già stata scelta da un altro manager" };
  }

  const { data: team } = await db.from("fanta_teams").select("name").eq("id", teamRef).maybeSingle();
  const patch: { team_ref: string; team_name?: string } = { team_ref: teamRef };
  if (team?.name) patch.team_name = team.name;

  const { error } = await db.from("fanta_profiles").update(patch).eq("user_id", viewer.userId);
  return { error: error?.message ?? null };
}
