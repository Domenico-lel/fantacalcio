"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { fetchLeagueTeams } from "@/lib/league-teams";
import { getCurrentViewer } from "@/app/social-actions";
import { normalizeBadges } from "@/lib/badges";

export interface Team {
  id: string;
  name: string;          // nome visualizzato nell'app (override admin, se presente)
  logoUrl: string | null;
  teamId: string | null;
  claimed: boolean;      // true = squadra piena (ha raggiunto max allenatori)
  mine: boolean;
  managerCount: number;  // quanti allenatori l'hanno già scelta
  maxManagers: number;   // posti disponibili (default 1)
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
    db.from("fanta_profiles").select("user_id, team_ref, team_name"),
  ]);

  // Una squadra può avere più allenatori: raccogliamo gli user_id per squadra.
  const membersByTeam = new Map<string, string[]>();
  const legacyNameByTeam = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (!p.team_ref) continue;
    const arr = membersByTeam.get(p.team_ref) ?? [];
    arr.push(p.user_id);
    membersByTeam.set(p.team_ref, arr);
    const legacyName = (p.team_name ?? "").trim();
    if (legacyName && !legacyNameByTeam.has(p.team_ref)) legacyNameByTeam.set(p.team_ref, legacyName);
  }

  return (teams ?? []).map((t) => {
    const members = membersByTeam.get(t.id) ?? [];
    // max_managers può non esistere (migrazione non ancora eseguita) → default 1
    const maxManagers = (t as { max_managers?: number }).max_managers ?? 1;
    const displayName = (t.display_name ?? "").trim() || legacyNameByTeam.get(t.id) || t.name;
    return {
      id: t.id,
      name: displayName,
      logoUrl: t.logo_url,
      teamId: t.team_id,
      claimed: members.length >= maxManagers, // "piena" quando ha raggiunto la capienza
      mine: !!viewer && members.includes(viewer.userId),
      managerCount: members.length,
      maxManagers,
    };
  });
}

export interface StandingsTeamInfo {
  displayName: string;    // nome da mostrare in classifica (override scelto in bacheca)
  logoUrl: string | null; // logo del catalogo squadre
}

// Mappa per la Classifica: nome ufficiale (= fanta_teams.name, che coincide con il nome
// scrapato da fantacalcio.it) → nome da mostrare + logo. L'override del nome viene dal
// profilo del manager (team_name, modificato dall'admin in bacheca); così un rename in
// bacheca si riflette anche sulla classifica principale finché fantacalcio.it non porta
// i nomi ufficiali della nuova competizione.
export async function fetchStandingsNameMap(): Promise<Record<string, StandingsTeamInfo>> {
  if (!isSupabaseConfigured()) return {};
  const db = createAdminClient();
  const [{ data: teams }, { data: profiles }] = await Promise.all([
    db.from("fanta_teams").select("id, name, display_name, logo_url"),
    db.from("fanta_profiles").select("team_ref, team_name"),
  ]);

  // Nome scelto dal manager, per squadra (in caso di squadra condivisa prendo il primo).
  const nameByTeam = new Map<string, string>();
  for (const p of profiles ?? []) {
    const tn = (p.team_name ?? "").trim();
    if (!p.team_ref || !tn) continue;
    if (!nameByTeam.has(p.team_ref)) nameByTeam.set(p.team_ref, tn);
  }

  const map: Record<string, StandingsTeamInfo> = {};
  for (const t of teams ?? []) {
    if (!t.name) continue;
    const displayName = (t.display_name ?? "").trim() || nameByTeam.get(t.id) || t.name;
    map[t.name] = { displayName, logoUrl: t.logo_url };
  }
  return map;
}

export async function syncTeams(): Promise<{ count: number; error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { count: 0, error: "Solo l'admin può sincronizzare le squadre" };

  const { teams, error: fetchError } = await fetchLeagueTeams();
  if (fetchError || teams.length === 0) return { count: 0, error: fetchError ?? "Nessuna squadra trovata nella classifica" };

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
  // Quanti allenatori ha già questa squadra e qual è la sua capienza?
  const [{ data: members }, { data: team }] = await Promise.all([
    db.from("fanta_profiles").select("user_id").eq("team_ref", teamRef),
    db.from("fanta_teams").select("*").eq("id", teamRef).maybeSingle(),
  ]);
  const already = (members ?? []).some((m) => m.user_id === viewer.userId);
  const maxManagers = (team as { max_managers?: number } | null)?.max_managers ?? 1;
  if (!already && (members?.length ?? 0) >= maxManagers) {
    return { error: "Questa squadra ha già raggiunto il numero massimo di allenatori" };
  }

  const patch: { team_ref: string; team_name?: string } = { team_ref: teamRef };
  const displayName = (team?.display_name ?? "").trim() || team?.name;
  if (displayName) patch.team_name = displayName;

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
  badges: string[];
}

export async function adminListProfiles(): Promise<AdminProfile[]> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_profiles")
    .select("user_id, first_name, last_name, team_name, team_ref, logo, badges")
    .order("team_name", { ascending: true });
  // fallback se la colonna badges non è ancora stata migrata
  if (error && /badges/i.test(error.message)) {
    const { data: d2 } = await db
      .from("fanta_profiles")
      .select("user_id, first_name, last_name, team_name, team_ref, logo")
      .order("team_name", { ascending: true });
    return (d2 ?? []).map((p) => ({
      userId: p.user_id,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      teamName: p.team_name ?? "",
      teamRef: p.team_ref,
      logo: p.logo ?? "⚽",
      badges: [],
    }));
  }
  return (data ?? []).map((p) => ({
    userId: p.user_id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    teamName: p.team_name ?? "",
    teamRef: p.team_ref,
    logo: p.logo ?? "⚽",
    badges: normalizeBadges(p.badges),
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

// Il nome visualizzato appartiene alla squadra, non a un singolo manager.
// `fanta_teams.name` resta il nome tecnico importato dalla classifica, necessario al sync.
export async function adminUpdateTeamName(teamRef: string, displayName: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };

  const name = displayName.trim();
  if (!teamRef || !name) return { error: "Il nome squadra non può essere vuoto" };
  if (name.length > 60) return { error: "Il nome squadra può avere al massimo 60 caratteri" };

  const db = createAdminClient();
  const { data, error } = await db
    .from("fanta_teams")
    .update({ display_name: name } as never)
    .eq("id", teamRef)
    .select("id")
    .maybeSingle();
  if (error) {
    if (/display_name/i.test(error.message)) {
      return { error: "Aggiornamento database mancante: esegui la migrazione del nome squadra." };
    }
    return { error: error.message };
  }
  if (!data) return { error: "Squadra non trovata" };

  // Mantiene aggiornati header e cache denormalizzata dei manager già assegnati.
  const { error: profilesError } = await db
    .from("fanta_profiles")
    .update({ team_name: name, updated_at: new Date().toISOString() } as never)
    .eq("team_ref", teamRef);
  return { error: profilesError?.message ?? null };
}

// Libera la squadra di un manager (resta il profilo, la squadra torna selezionabile)
export async function adminReleaseTeam(userId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_profiles").update({ team_ref: null } as never).eq("user_id", userId);
  return { error: error?.message ?? null };
}

// Imposta quanti allenatori può avere una squadra (1 = normale, 2 = condivisa).
// Non si può scendere sotto il numero di allenatori già assegnati.
export async function adminSetTeamCapacity(teamRef: string, maxManagers: number): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const n = Math.max(1, Math.min(4, Math.floor(maxManagers || 1)));

  const db = createAdminClient();
  const { count } = await db
    .from("fanta_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("team_ref", teamRef);
  if ((count ?? 0) > n) {
    return { error: `La squadra ha già ${count} allenatori: liberane uno prima di ridurre i posti.` };
  }

  const { error } = await db.from("fanta_teams").update({ max_managers: n } as never).eq("id", teamRef);
  if (error && /max_managers/i.test(error.message)) {
    return { error: "Colonna max_managers mancante: esegui supabase-coaches-migration.sql." };
  }
  return { error: error?.message ?? null };
}

// Assegna manualmente una squadra a un manager (versione admin di claimTeam).
// Se il manager ne aveva già un'altra, quella torna libera automaticamente.
export async function adminAssignTeam(userId: string, teamRef: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (!userId || !teamRef) return { error: "Dati mancanti" };

  const db = createAdminClient();
  // La squadra ha ancora posti liberi? (escludendo il manager che stiamo assegnando)
  const [{ data: members }, { data: team }] = await Promise.all([
    db.from("fanta_profiles").select("user_id").eq("team_ref", teamRef),
    db.from("fanta_teams").select("*").eq("id", teamRef).maybeSingle(),
  ]);
  const others = (members ?? []).filter((m) => m.user_id !== userId).length;
  const maxManagers = (team as { max_managers?: number } | null)?.max_managers ?? 1;
  if (others >= maxManagers) {
    return { error: "Questa squadra ha già raggiunto il numero massimo di allenatori" };
  }

  const patch: { team_ref: string; team_name?: string; updated_at: string } = {
    team_ref: teamRef,
    updated_at: new Date().toISOString(),
  };
  const displayName = (team?.display_name ?? "").trim() || team?.name;
  if (displayName) patch.team_name = displayName;

  const { error } = await db.from("fanta_profiles").update(patch as never).eq("user_id", userId);
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

// Assegna/aggiorna i badge di un manager (l'admin sceglie dal catalogo).
export async function adminSetProfileBadges(userId: string, badges: string[]): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const clean = normalizeBadges(badges);
  const db = createAdminClient();
  const { error } = await db.from("fanta_profiles").update({ badges: clean } as never).eq("user_id", userId);
  if (error && /badges/i.test(error.message)) {
    return { error: "Colonna badges mancante: esegui supabase-badges-migration.sql." };
  }
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
  if (!viewer) return []; // qualsiasi utente autenticato (admin o manager)
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
