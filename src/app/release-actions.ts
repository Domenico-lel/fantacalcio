"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer } from "@/app/social-actions";

// Stato di rilascio dell'app, salvato in DB (fanta_settings.app_open) così
// l'admin lo cambia al volo dal pannello, senza ridistribuire il codice.
//   app_open = true  → app aperta a tutti
//   app_open = false → modalità "in arrivo" (solo l'admin entra)
const APP_KEY = "app_open";
const CAREER_KEY = "career_open";

async function isSettingOpen(key: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const db = createAdminClient();
  const { data } = await db.from("fanta_settings").select("value").eq("key", key).maybeSingle();
  return data?.value === "true";
}

async function setSettingOpen(key: string, open: boolean): Promise<{ error: string | null; open: boolean }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin", open: await isSettingOpen(key) };

  const db = createAdminClient();
  const { error } = await db.from("fanta_settings").upsert(
    { key, value: open ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  return { error: error?.message ?? null, open: error ? await isSettingOpen(key) : open };
}

// Default prudente: se il valore non c'è (o Supabase non configurato) l'app
// resta "chiusa" in modalità in arrivo, così non si espone per sbaglio.
export async function isAppOpen(): Promise<boolean> {
  return isSettingOpen(APP_KEY);
}

export async function setAppOpen(open: boolean): Promise<{ error: string | null; open: boolean }> {
  return setSettingOpen(APP_KEY, open);
}

// Interruttore indipendente della sola modalità Carriera. L'admin può sempre
// accedere per collaudarla anche quando i manager vedono "In lavorazione".
export async function isCareerOpen(): Promise<boolean> {
  return isSettingOpen(CAREER_KEY);
}

export async function setCareerOpen(open: boolean): Promise<{ error: string | null; open: boolean }> {
  const result = await setSettingOpen(CAREER_KEY, open);
  if (!result.error) revalidatePath("/carriera");
  return result;
}
