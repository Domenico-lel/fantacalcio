// Costanti del sistema pronostici/crediti.
// Modulo client/server-safe (niente "use server") così è importabile ovunque.

export const STARTING_CREDITS = 500;

// Competizioni reali disponibili per i pronostici (piano gratuito football-data.org).
// `code` = codice competizione football-data.org; `name` = etichetta mostrata;
// `oddsKey` = sport_key su The Odds API (per pre-compilare le quote 1/X/2).
export const FOOTBALL_COMPETITIONS = [
  { code: "SA", name: "Serie A", oddsKey: "soccer_italy_serie_a" },
  { code: "CL", name: "Champions League", oddsKey: "soccer_uefa_champs_league" },
  { code: "PL", name: "Premier League", oddsKey: "soccer_epl" },
  { code: "PD", name: "La Liga", oddsKey: "soccer_spain_la_liga" },
  { code: "BL1", name: "Bundesliga", oddsKey: "soccer_germany_bundesliga" },
  { code: "FL1", name: "Ligue 1", oddsKey: "soccer_france_ligue_one" },
  { code: "PPL", name: "Primeira Liga", oddsKey: "soccer_portugal_primeira_liga" },
  { code: "DED", name: "Eredivisie", oddsKey: "soccer_netherlands_eredivisie" },
  { code: "ELC", name: "Championship", oddsKey: "soccer_efl_champ" },
  { code: "EC", name: "Europei", oddsKey: "soccer_uefa_european_championship" },
  { code: "WC", name: "Mondiali", oddsKey: "soccer_fifa_world_cup" },
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
  // quote 1/X/2 pre-compilate da The Odds API (assenti se non disponibili)
  odd1?: number | null;
  oddX?: number | null;
  odd2?: number | null;
  // numero di bookmaker confluiti nel consenso (solo informativo, non salvato nel DB)
  oddsSources?: number;
}
