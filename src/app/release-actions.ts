"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer } from "@/app/social-actions";

// Stato di rilascio dell'app, salvato in DB (fanta_settings.app_open) così
// l'admin lo cambia al volo dal pannello, senza ridistribuire il codice.
//   app_open = true  → app aperta a tutti
//   app_open = false → modalità "in arrivo" (solo l'admin entra)
const KEY = "app_open";

// Default prudente: se il valore non c'è (o Supabase non configurato) l'app
// resta "chiusa" in modalità in arrivo, così non si espone per sbaglio.
export async function isAppOpen(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const db = createAdminClient();
  const { data } = await db.from("fanta_settings").select("value").eq("key", KEY).maybeSingle();
  return data?.value === "true";
}

export async function setAppOpen(open: boolean): Promise<{ error: string | null; open: boolean }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin", open: await isAppOpen() };

  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key: KEY, value: open ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  return { error: error?.message ?? null, open };
}
