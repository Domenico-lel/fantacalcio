"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { TeamProfile, SquadState } from "@/lib/store";
import { MOCK_PLAYERS } from "@/lib/mock-data";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function upsertProfile(
  userId: string,
  profile: TeamProfile
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }; // silent no-op in demo mode

  try {
    const db = createAdminClient();
    const { error } = await db.from("fanta_profiles").upsert(
      {
        user_id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        team_name: profile.teamName,
        logo: profile.logo,
        budget: profile.budget,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function fetchProfile(
  userId: string
): Promise<{ data: TeamProfile | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("fanta_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { data: null, error: null }; // not found
      return { data: null, error: error.message };
    }

    return {
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        teamName: data.team_name,
        logo: data.logo,
        budget: data.budget,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ─── Squad ────────────────────────────────────────────────────────────────────

export async function upsertSquad(
  userId: string,
  squad: SquadState
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  try {
    const db = createAdminClient();
    const { error } = await db.from("fanta_squads").upsert(
      {
        user_id: userId,
        formation: squad.formation,
        starters: squad.starters,
        captain_id: squad.captainId,
        vice_captain_id: squad.viceCaptainId,
        roster_ids: squad.roster.map((p) => p.id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function fetchSquad(
  userId: string
): Promise<{ data: SquadState | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("fanta_squads")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { data: null, error: null }; // not found
      return { data: null, error: error.message };
    }

    const roster = MOCK_PLAYERS.filter((p) => data.roster_ids.includes(p.id));
    return {
      data: {
        roster,
        formation: data.formation,
        starters: data.starters,
        captainId: data.captain_id,
        viceCaptainId: data.vice_captain_id,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}
