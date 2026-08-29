export const FANTACALCIO_SYNC_INTERVAL_MS = 2 * 60 * 1000;

/** Un solo URL upstream per finestra di sync, condiviso da tutta la lega. */
export function fantacalcioSyncToken(now = Date.now()): string {
  return String(Math.floor(now / FANTACALCIO_SYNC_INTERVAL_MS));
}

/** Evita le risposte CDN vecchie di Fantacalcio senza generare URL a ogni client. */
export function withFantacalcioSyncToken(url: string, token: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("_", token);
  return parsed.toString();
}
