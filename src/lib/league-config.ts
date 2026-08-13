import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";

export const LEAGUE_SLUG_SETTING = "league_slug";

/**
 * Accetta sia lo slug sia l'URL completo della lega e restituisce solo lo slug.
 * La pagina della lega è pubblica, ma limitiamo comunque l'host per evitare che
 * il server venga usato per effettuare richieste verso URL arbitrari.
 */
export function normalizeLeagueSlug(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  // Lo slug semplice è quello storicamente usato nella variabile d'ambiente.
  if (!input.includes("/") && !input.includes(":")) {
    return /^[a-z0-9][a-z0-9-]*$/i.test(input) ? input : null;
  }

  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(withProtocol);
    if (url.hostname !== "leghe.fantacalcio.it") return null;
    const slug = url.pathname.split("/").filter(Boolean)[0];
    return slug ? decodeURIComponent(slug).trim() : null;
  } catch { return null; }
}

/**
 * Restituisce l'URL canonico della pagina inserita dall'admin.
 * Mantiene anche percorsi come /view/competition/{id}/dashboard: la nuova
 * interfaccia di Fantacalcio usa il percorso della competizione per decidere
 * quale classifica mostrare.
 */
export function normalizeLeagueUrl(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" || url.hostname !== "leghe.fantacalcio.it") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts[0] || !/^[a-z0-9][a-z0-9-]*$/i.test(decodeURIComponent(parts[0]))) return null;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function leagueUrlFromSlug(slug: string): string {
  return `https://leghe.fantacalcio.it/${encodeURIComponent(slug)}`;
}

/**
 * Alcune rotte /view/competition/... funzionano solo nella sessione web
 * dell'utente e dal server restituiscono 404. In quel caso proviamo anche la
 * pagina pubblica della lega, che espone la classifica corrente.
 */
export function leagueUrlCandidates(url: string): string[] {
  const normalized = normalizeLeagueUrl(url);
  if (!normalized) return [];
  try {
    const parsed = new URL(normalized);
    const slug = parsed.pathname.split("/").filter(Boolean)[0];
    const base = slug ? leagueUrlFromSlug(decodeURIComponent(slug)) : normalized;
    return [...new Set([normalized, base])];
  } catch {
    return [normalized];
  }
}

/** URL salvato, con eventuale percorso della competizione preservato. */
export async function getLeagueUrl(): Promise<string> {
  const fromEnv = normalizeLeagueUrl(process.env.FANTACALCIO_LEAGUE_URL ?? "")
    ?? (normalizeLeagueSlug(process.env.FANTACALCIO_LEAGUE_SLUG ?? "")
      ? leagueUrlFromSlug(normalizeLeagueSlug(process.env.FANTACALCIO_LEAGUE_SLUG ?? "")!)
      : "");
  if (!isSupabaseConfigured()) return fromEnv;

  try {
    const db = createAdminClient();
    const { data } = await db
      .from("fanta_settings")
      .select("value")
      .eq("key", LEAGUE_SLUG_SETTING)
      .maybeSingle();
    return normalizeLeagueUrl(data?.value ?? "") ?? fromEnv;
  } catch {
    return fromEnv;
  }
}

/** La configurazione salvata dall'admin prevale sulla variabile d'ambiente. */
export async function getLeagueSlug(): Promise<string> {
  const fromEnv = normalizeLeagueSlug(process.env.FANTACALCIO_LEAGUE_SLUG ?? "") ?? "";
  if (!isSupabaseConfigured()) return fromEnv;

  try {
    const db = createAdminClient();
    const { data } = await db
      .from("fanta_settings")
      .select("value")
      .eq("key", LEAGUE_SLUG_SETTING)
      .maybeSingle();
    return normalizeLeagueSlug(data?.value ?? "") ?? fromEnv;
  } catch {
    return fromEnv;
  }
}
