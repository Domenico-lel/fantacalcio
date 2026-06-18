"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { TeamProfile } from "@/lib/store";

// ─── Trophies ─────────────────────────────────────────────────────────────────

export interface Trophy {
  id: string;
  user_id: string | null;
  display_name: string;
  year: number;
  season: string;
  position: 1 | 2 | 3;
  team_name: string;
  points: number | null;
}

export async function claimTrophies(userId: string, firstName: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId || !firstName) return;
  try {
    const db = createAdminClient();
    await db
      .from("fanta_trophies")
      .update({ user_id: userId } as never)
      .ilike("display_name", firstName.trim())
      .is("user_id", null);
  } catch { /* silent */ }
}

export async function fetchAllTrophies(): Promise<{ data: Trophy[]; error: string | null }> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("fanta_trophies")
      .select("*")
      .order("year", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as Trophy[], error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

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
      } as never,
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
