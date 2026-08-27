// Costanti del sistema pronostici/crediti.
// Modulo client/server-safe (niente "use server") così è importabile ovunque.

export const STARTING_CREDITS = 500;
export const FIXED_WIN_MULTIPLIER = 2;
export const BET_CUTOFF_MINUTES = 15;
export const COUNTDOWN_ORANGE_MINUTES = 30;
export const COUNTDOWN_RED_MINUTES = 5;

export function calculateFixedPayout(stake: number): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0;
  return Math.round(stake * FIXED_WIN_MULTIPLIER);
}

export function calculateBetClosesAt(kickoffs: Array<string | null | undefined>): string | null {
  const firstKickoff = kickoffs
    .map((value) => value ? Date.parse(value) : Number.NaN)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  if (!Number.isFinite(firstKickoff)) return null;
  return new Date(firstKickoff - BET_CUTOFF_MINUTES * 60_000).toISOString();
}

export type CountdownTone = "normal" | "orange" | "red" | "closed";

export function countdownTone(millisecondsLeft: number): CountdownTone {
  if (millisecondsLeft <= 0) return "closed";
  if (millisecondsLeft <= COUNTDOWN_RED_MINUTES * 60_000) return "red";
  if (millisecondsLeft <= COUNTDOWN_ORANGE_MINUTES * 60_000) return "orange";
  return "normal";
}

// Competizioni reali disponibili per i pronostici (piano gratuito football-data.org).
// `code` = codice competizione football-data.org; `name` = etichetta mostrata.
export const FOOTBALL_COMPETITIONS = [
  { code: "SA", name: "Serie A" },
  { code: "CL", name: "Champions League" },
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "BL1", name: "Bundesliga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "DED", name: "Eredivisie" },
  { code: "ELC", name: "Championship" },
  { code: "EC", name: "Europei" },
  { code: "WC", name: "Mondiali" },
] as const;

export type CompetitionCode = (typeof FOOTBALL_COMPETITIONS)[number]["code"];

// Partita reale normalizzata (dal provider o da inserimento manuale).
export interface ExtMatch {
  eventId: string; // id football-data.org (per l'auto-aggiornamento del risultato)
  competition: string; // nome competizione
  homeName: string;
  awayName: string;
  homeLogo: string; // URL stemma
  awayLogo: string;
  kickoff: string; // data/ora ISO (utcDate)
  status: string; // SCHEDULED | TIMED | IN_PLAY | FINISHED | ...
  matchday: number | null;
}
