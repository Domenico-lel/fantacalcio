"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getLeagueSlug, LEAGUE_SLUG_SETTING, normalizeLeagueSlug } from "@/lib/league-config";
import { getCurrentViewer } from "@/app/social-actions";

export async function getLeagueUrlSetting(): Promise<string> {
  const slug = await getLeagueSlug();
  return slug ? `https://leghe.fantacalcio.it/${encodeURIComponent(slug)}` : "";
}

export async function setLeagueUrlSetting(value: string): Promise<{ error: string | null; url: string }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin può modificare il link della lega", url: "" };
  if (!isSupabaseConfigured()) return { error: "Database non configurato", url: "" };

  const slug = normalizeLeagueSlug(value);
  if (!slug) {
    return {
      error: "Incolla l'URL della lega nel formato https://leghe.fantacalcio.it/nome-della-lega",
      url: "",
    };
  }

  const url = `https://leghe.fantacalcio.it/${encodeURIComponent(slug)}`;
  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key: LEAGUE_SLUG_SETTING, value: slug, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  return { error: error?.message ?? null, url };
}
