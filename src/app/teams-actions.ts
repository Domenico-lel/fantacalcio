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
  photoUrl: string | null;
}

export interface PlayerHit {
  id: string;
  name: string;
  photoUrl: string;
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
  const { data, error } = await db
    .from("fanta_roster")
    .select("id, player_name, role, photo_url")
    .eq("team_ref", teamRef)
    .order("role", { ascending: true })
    .order("player_name", { ascending: true });
  // fallback se la colonna photo_url non è ancora stata migrata
  if (error && /photo_url/i.test(error.message)) {
    const { data: d2 } = await db
      .from("fanta_roster")
      .select("id, player_name, role")
      .eq("team_ref", teamRef)
      .order("role", { ascending: true })
      .order("player_name", { ascending: true });
    return (d2 ?? []).map((r) => ({ id: r.id, playerName: r.player_name, role: r.role, photoUrl: null }));
  }
  return (data ?? []).map((r) => ({ id: r.id, playerName: r.player_name, role: r.role, photoUrl: r.photo_url }));
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

export async function addRosterPlayer(teamRef: string, playerName: string, role: string | null, photoUrl?: string | null): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin può modificare le rose" };
  const name = (playerName ?? "").trim();
  if (!name) return { error: "Inserisci il nome del giocatore" };
  const r = role && ["P", "D", "C", "A"].includes(role) ? (role as "P" | "D" | "C" | "A") : null;
  const photo = (photoUrl ?? "").trim() || null;

  const db = createAdminClient();
  const { error } = await db.from("fanta_roster").insert({ team_ref: teamRef, player_name: name, role: r, photo_url: photo });
  // fallback se la colonna photo_url non è ancora stata migrata
  if (error && /photo_url/i.test(error.message)) {
    const retry = await db.from("fanta_roster").insert({ team_ref: teamRef, player_name: name, role: r });
    return { error: retry.error?.message ?? null };
  }
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

// ─── Gestione profili manager (admin) ────────────────────────────────────────

export interface AdminProfile {
  userId: string;
  firstName: string;
  lastName: string;
  teamName: string;
  teamRef: string | null;
  logo: string;
}

export async function adminListProfiles(): Promise<AdminProfile[]> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return [];
  const db = createAdminClient();
  const { data } = await db
    .from("fanta_profiles")
    .select("user_id, first_name, last_name, team_name, team_ref, logo")
    .order("team_name", { ascending: true });
  return (data ?? []).map((p) => ({
    userId: p.user_id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    teamName: p.team_name ?? "",
    teamRef: p.team_ref,
    logo: p.logo ?? "⚽",
  }));
}

export async function adminUpdateProfile(
  userId: string,
  patch: { firstName?: string; lastName?: string; teamName?: string }
): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };

  const update: Record<string, string> = {};
  if (patch.firstName !== undefined) update.first_name = patch.firstName.trim();
  if (patch.lastName !== undefined) update.last_name = patch.lastName.trim();
  if (patch.teamName !== undefined) {
    const tn = patch.teamName.trim();
    if (!tn) return { error: "Il nome squadra non può essere vuoto" };
    update.team_name = tn;
  }
  if (Object.keys(update).length === 0) return { error: null };
  update.updated_at = new Date().toISOString();

  const db = createAdminClient();
  const { error } = await db.from("fanta_profiles").update(update as never).eq("user_id", userId);
  return { error: error?.message ?? null };
}

// Libera la squadra di un manager (resta il profilo, la squadra torna selezionabile)
export async function adminReleaseTeam(userId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_profiles").update({ team_ref: null } as never).eq("user_id", userId);
  return { error: error?.message ?? null };
}

// Elimina del tutto un profilo manager (es. account doppio/cancellato) — libera la squadra
export async function adminDeleteProfile(userId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_profiles").delete().eq("user_id", userId);
  return { error: error?.message ?? null };
}

// ─── Ricerca giocatori (Transfermarkt) per la tendina rosa ───────────────────

const TM_SEARCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "it-IT,it;q=0.9",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchPlayers(query: string): Promise<PlayerHit[]> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return [];
  const q = (query ?? "").trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `https://www.transfermarkt.it/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(q)}`,
      { headers: TM_SEARCH_HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const hits: PlayerHit[] = [];
    const seen = new Set<string>();
    // Ogni giocatore ha un'immagine ritratto con il nome nel title
    const imgTags = html.match(/<img\b[^>]*portrait\/[^>]*>/gi) ?? [];
    for (const tag of imgTags) {
      const src = tag.match(/(?:data-src|src)="([^"]*portrait\/[^"]*)"/i)?.[1];
      const id = src?.match(/portrait\/(?:small|medium|header|big)\/(\d+)/i)?.[1];
      const title = tag.match(/title="([^"]+)"/i)?.[1] ?? tag.match(/alt="([^"]+)"/i)?.[1];
      if (!src || !id || !title || seen.has(id)) continue;
      const name = decodeEntities(title);
      if (!name) continue;
      seen.add(id);
      hits.push({ id, name, photoUrl: src.replace(/\/portrait\/(small|header)\//, "/portrait/medium/") });
      if (hits.length >= 20) break;
    }
    return hits;
  } catch {
    return [];
  }
}
