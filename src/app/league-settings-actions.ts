"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getLeagueUrl, LEAGUE_SLUG_SETTING, normalizeLeagueUrl } from "@/lib/league-config";
import { getCurrentViewer } from "@/app/social-actions";

export async function getLeagueUrlSetting(): Promise<string> {
  return getLeagueUrl();
}

export async function setLeagueUrlSetting(value: string): Promise<{ error: string | null; url: string }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin può modificare il link della lega", url: "" };
  if (!isSupabaseConfigured()) return { error: "Database non configurato", url: "" };

  const url = normalizeLeagueUrl(value);
  if (!url) {
    return {
      error: "Incolla l'URL di Leghe Fantacalcio, ad esempio https://leghe.fantacalcio.it/nome-lega/view/competition/123",
      url: "",
    };
  }

  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key: LEAGUE_SLUG_SETTING, value: url, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  return { error: error?.message ?? null, url };
}
