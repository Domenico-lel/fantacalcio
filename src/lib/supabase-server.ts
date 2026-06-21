import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Normalizza un valore di env: rimuove spazi e virgolette incollate per sbaglio
// (errore comune quando si impostano le variabili nella dashboard di Vercel).
function cleanEnv(v: string | undefined): string | undefined {
  if (!v) return v;
  return v.trim().replace(/^['"]|['"]$/g, "").trim();
}

// Server-only admin client — never expose the service role key to the browser
export function createAdminClient() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("Missing Supabase env vars");
  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL non valido (atteso https://...): "${url}". Controlla le variabili d'ambiente.`
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

export function isSupabaseConfigured() {
  return !!(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
