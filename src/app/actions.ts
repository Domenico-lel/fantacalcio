"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { TeamProfile } from "@/lib/store";

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
