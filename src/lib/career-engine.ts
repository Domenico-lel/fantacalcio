/**
 * Motore deterministico per la modalita Carriera single-player.
 *
 * Il catalogo usa club e campionati reali, ma il motore non usa rete, database
 * o dipendenze esterne: lo stesso stato, seed e scelta di allenamento producono
 * sempre lo stesso risultato.
 */

export type CountryCode = "IT" | "ES" | "GB" | "DE" | "FR" | "PT" | "NL" | "BR" | "AR";

export type Role =
  | "GK"
  | "RB"
  | "CB"
  | "LB"
  | "DM"
  | "CM"
  | "AM"
  | "RW"
  | "LW"
  | "SS"
  | "CF"
  | "ST";

export type PreferredFoot = "right" | "left" | "both";
export type GameMode = "realistic" | "balanced" | "legend";
export type StartMode = "academy" | "freeAgent";
export type TrainingChoice =
  | "balanced"
  | "finishing"
  | "playmaking"
  | "athleticism"
  | "defending"
  | "goalkeeping"
  | "recovery";

export type CareerStage = "choosingClub" | "active" | "retired";
export type EventTone = "positive" | "neutral" | "negative" | "special";
export type SquadRole = "prospect" | "rotation" | "starter" | "star";

export interface LeagueMetadata {
  name: string;
  shortName: string;
  strength: number;
  clubs: number;
  leagueMatches: number;
  style: string;
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  flag: string;
  demonym: string;
  league: LeagueMetadata;
}

export interface RoleOption {
  code: Role;
  label: string;
  shortLabel: string;
  department: "Porta" | "Difesa" | "Centrocampo" | "Attacco";
}

export interface TrainingOption {
  code: TrainingChoice;
  label: string;
  description: string;
}

export interface ClubDefinition {
  /** Identificatore stabile e namespaced del provider dello stemma. */
  id: string;
  name: string;
  country: CountryCode;
  league: string;
  crestUrl: string;
  /** Nomi usati dal vecchio catalogo e accettati nei salvataggi esistenti. */
  legacyNames: readonly string[];
  rating: number;
  youthRating: number;
  prestige: number;
  colors: readonly [string, string];
}

export const COUNTRY_OPTIONS: readonly CountryOption[] = [
  {
    code: "IT",
    name: "Italia",
    flag: "🇮🇹",
    demonym: "Italiana",
    league: { name: "Serie A", shortName: "Serie A", strength: 88, clubs: 20, leagueMatches: 38, style: "Tattica e tecnica" },
  },
  {
    code: "ES",
    name: "Spagna",
    flag: "🇪🇸",
    demonym: "Spagnola",
    league: { name: "LaLiga", shortName: "LaLiga", strength: 89, clubs: 20, leagueMatches: 38, style: "Possesso e creativita" },
  },
  {
    code: "GB",
    name: "Inghilterra",
    flag: "🇬🇧",
    demonym: "Inglese",
    league: { name: "Premier League", shortName: "Premier", strength: 92, clubs: 20, leagueMatches: 38, style: "Ritmo e intensita" },
  },
  {
    code: "DE",
    name: "Germania",
    flag: "🇩🇪",
    demonym: "Tedesca",
    league: { name: "Bundesliga", shortName: "Bundesliga", strength: 86, clubs: 18, leagueMatches: 34, style: "Pressing e verticalita" },
  },
  {
    code: "FR",
    name: "Francia",
    flag: "🇫🇷",
    demonym: "Francese",
    league: { name: "Ligue 1", shortName: "Ligue 1", strength: 84, clubs: 18, leagueMatches: 34, style: "Atletismo e talento" },
  },
  {
    code: "PT",
    name: "Portogallo",
    flag: "🇵🇹",
    demonym: "Portoghese",
    league: { name: "Primeira Liga", shortName: "Primeira", strength: 79, clubs: 18, leagueMatches: 34, style: "Tecnica e giovani" },
  },
  {
    code: "NL",
    name: "Paesi Bassi",
    flag: "🇳🇱",
    demonym: "Olandese",
    league: { name: "Eredivisie", shortName: "Eredivisie", strength: 78, clubs: 18, leagueMatches: 34, style: "Gioco offensivo" },
  },
  {
    code: "BR",
    name: "Brasile",
    flag: "🇧🇷",
    demonym: "Brasiliana",
    league: { name: "Brasileirão Série A", shortName: "Brasileirão", strength: 80, clubs: 20, leagueMatches: 38, style: "Estro e uno contro uno" },
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    demonym: "Argentina",
    league: { name: "Liga Profesional Argentina", shortName: "Liga Profesional", strength: 78, clubs: 20, leagueMatches: 38, style: "Carattere e tecnica" },
  },
] as const;

export const ROLE_OPTIONS: readonly RoleOption[] = [
  { code: "GK", label: "Portiere", shortLabel: "POR", department: "Porta" },
  { code: "RB", label: "Terzino destro", shortLabel: "TD", department: "Difesa" },
  { code: "CB", label: "Difensore centrale", shortLabel: "DC", department: "Difesa" },
  { code: "LB", label: "Terzino sinistro", shortLabel: "TS", department: "Difesa" },
  { code: "DM", label: "Mediano", shortLabel: "MED", department: "Centrocampo" },
  { code: "CM", label: "Centrocampista", shortLabel: "CC", department: "Centrocampo" },
  { code: "AM", label: "Trequartista", shortLabel: "TRQ", department: "Centrocampo" },
  { code: "RW", label: "Ala destra", shortLabel: "AD", department: "Attacco" },
  { code: "LW", label: "Ala sinistra", shortLabel: "AS", department: "Attacco" },
  { code: "SS", label: "Seconda punta", shortLabel: "SP", department: "Attacco" },
  { code: "CF", label: "Punta mobile", shortLabel: "ATT", department: "Attacco" },
  { code: "ST", label: "Centravanti", shortLabel: "PC", department: "Attacco" },
] as const;

export const TRAINING_OPTIONS: readonly TrainingOption[] = [
  { code: "balanced", label: "Completo", description: "Crescita uniforme e rischio contenuto." },
  { code: "finishing", label: "Finalizzazione", description: "Piu gol e freddezza sotto porta." },
  { code: "playmaking", label: "Regia", description: "Piu assist, tecnica e visione." },
  { code: "athleticism", label: "Atletismo", description: "Piu presenze, intensita e crescita fisica." },
  { code: "defending", label: "Difesa", description: "Migliora duelli, intercetti e affidabilita." },
  { code: "goalkeeping", label: "Portieri", description: "Reattivita, parate e porte inviolate." },
  { code: "recovery", label: "Recupero", description: "Riduce gli infortuni e preserva la forma." },
] as const;

type ClubProvider = "football-data" | "espn";
type ClubRow = readonly [
  providerId: number,
  name: string,
  legacyName: string,
  rating: number,
  youthRating: number,
  prestige: number,
  primary: string,
  secondary: string,
  customCrestUrl?: string,
];

function makeClubs(
  country: CountryCode,
  league: string,
  provider: ClubProvider,
  rows: readonly ClubRow[],
): readonly ClubDefinition[] {
  return rows.map(([providerId, name, legacyName, rating, youthRating, prestige, primary, secondary, customCrestUrl]) => ({
    id: `${provider}:${providerId}`,
    name,
    country,
    league,
    crestUrl: customCrestUrl ?? (
      provider === "football-data"
        ? `https://crests.football-data.org/${providerId}.png`
        : `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${providerId}.png&h=96&w=96`
    ),
    legacyNames: [legacyName],
    rating,
    youthRating,
    prestige,
    colors: [primary, secondary] as const,
  }));
}

export const CLUBS_BY_COUNTRY: Record<CountryCode, readonly ClubDefinition[]> = {
  IT: makeClubs("IT", "Serie A", "football-data", [
    [108, "Inter", "Torri Milano", 88, 87, 94, "#111827", "#38bdf8"],
    [109, "Juventus", "Reale Torino", 84, 84, 88, "#111827", "#f8fafc"],
    [100, "Roma", "Lupi Capitolini", 83, 82, 87, "#991b1b", "#f59e0b"],
    [113, "Napoli", "Partenope Azzurra", 82, 85, 85, "#0369a1", "#e0f2fe"],
    [99, "Fiorentina", "Giglio Firenze", 78, 81, 76, "#581c87", "#f5d0fe"],
    [107, "Genoa", "Grifoni Genova", 73, 77, 67, "#1e3a8a", "#dc2626"],
    [103, "Bologna", "Emilia Calcio", 69, 79, 58, "#be123c", "#1e3a8a"],
    [5890, "Lecce", "Salento United", 65, 74, 50, "#facc15", "#dc2626"],
  ]),
  ES: makeClubs("ES", "LaLiga", "football-data", [
    [86, "Real Madrid", "Real Castiglia", 90, 90, 97, "#f8fafc", "#f59e0b"],
    [81, "FC Barcelona", "Catalunya Blau", 89, 93, 96, "#1d4ed8", "#be123c"],
    [78, "Atlético de Madrid", "Atletico Manzanares", 85, 83, 89, "#dc2626", "#f8fafc"],
    [95, "Valencia CF", "Costa Valencia", 80, 86, 80, "#f97316", "#111827"],
    [559, "Sevilla FC", "Siviglia Dorada", 78, 80, 76, "#b91c1c", "#f8fafc"],
    [77, "Athletic Club", "Leoni di Bilbao", 76, 84, 74, "#dc2626", "#f8fafc"],
    [558, "RC Celta", "Galizia Verde", 70, 77, 61, "#38bdf8", "#f8fafc"],
    [89, "RCD Mallorca", "Isola Majorca", 66, 73, 52, "#e11d48", "#111827"],
  ]),
  GB: makeClubs("GB", "Premier League", "football-data", [
    [57, "Arsenal", "North London Forge", 90, 88, 95, "#ef4444", "#f8fafc"],
    [65, "Manchester City", "Manchester Sky", 90, 91, 96, "#38bdf8", "#f8fafc"],
    [64, "Liverpool", "Mersey Reds", 89, 86, 95, "#dc2626", "#f8fafc"],
    [61, "Chelsea", "West London Royal", 84, 88, 89, "#1d4ed8", "#f8fafc"],
    [67, "Newcastle United", "Tyneside Magpies", 82, 80, 83, "#111827", "#f8fafc"],
    [58, "Aston Villa", "Birmingham Lions", 76, 82, 72, "#7c3aed", "#38bdf8"],
    [397, "Brighton & Hove Albion", "Brighton Waves", 72, 83, 65, "#2563eb", "#f8fafc"],
    [351, "Nottingham Forest", "Nottingham Oaks", 67, 76, 57, "#b91c1c", "#f8fafc"],
  ]),
  DE: makeClubs("DE", "Bundesliga", "football-data", [
    [5, "FC Bayern München", "Bavaria Rot", 89, 92, 96, "#dc2626", "#f8fafc"],
    [4, "Borussia Dortmund", "Rhein Schwarz", 84, 89, 88, "#111827", "#facc15"],
    [721, "RB Leipzig", "Leipzig Falken", 82, 88, 82, "#f8fafc", "#dc2626"],
    [19, "Eintracht Frankfurt", "Kieler Wellen", 79, 84, 82, "#e1000f", "#111827"],
    [7, "Hamburger SV", "Hanse Hamburg", 78, 81, 78, "#1d4ed8", "#f8fafc"],
    [10, "VfB Stuttgart", "Stoccarda Motori", 76, 84, 72, "#dc2626", "#f8fafc"],
    [28, "1. FC Union Berlin", "Berlino Union", 72, 78, 65, "#b91c1c", "#f8fafc"],
    [17, "SC Freiburg", "Foresta Friburgo", 69, 82, 59, "#111827", "#dc2626"],
  ]),
  FR: makeClubs("FR", "Ligue 1", "football-data", [
    [524, "Paris Saint-Germain", "Paris Etoile", 89, 86, 94, "#172554", "#ef4444"],
    [516, "Olympique de Marseille", "Olympique Mediterranee", 82, 84, 86, "#38bdf8", "#f8fafc"],
    [548, "AS Monaco", "Monaco Principato", 81, 91, 82, "#dc2626", "#f8fafc"],
    [523, "Olympique Lyonnais", "Lione Lumiere", 78, 88, 79, "#1d4ed8", "#dc2626"],
    [546, "RC Lens", "Loira Verde", 77, 83, 78, "#dc2626", "#facc15"],
    [521, "LOSC Lille", "Lilla Fiandre", 75, 82, 72, "#b91c1c", "#f8fafc"],
    [522, "OGC Nice", "Riviera Nizza", 72, 78, 65, "#111827", "#dc2626"],
    [529, "Stade Rennais FC", "Bretagna Armor", 68, 80, 57, "#e11d48", "#111827"],
  ]),
  PT: makeClubs("PT", "Primeira Liga", "football-data", [
    [1903, "SL Benfica", "Lisboa Aquile", 84, 92, 90, "#dc2626", "#f8fafc"],
    [503, "FC Porto", "Porto Draghi", 83, 89, 89, "#1d4ed8", "#f8fafc"],
    [498, "Sporting CP", "Leoni di Alvalade", 82, 93, 87, "#16a34a", "#f8fafc"],
    [5613, "SC Braga", "Braga Arcivescovi", 76, 84, 72, "#dc2626", "#f8fafc"],
    [5543, "Vitória SC", "Vitoria Castello", 71, 80, 63, "#111827", "#f8fafc"],
    [5531, "FC Famalicão", "Faro Atlantico", 68, 76, 57, "#111827", "#facc15"],
    [5530, "Santa Clara", "Madeira Maritima", 65, 75, 51, "#dc2626", "#f8fafc"],
    [496, "Rio Ave FC", "Azzorre Naviganti", 62, 78, 45, "#15803d", "#f8fafc"],
  ]),
  NL: makeClubs("NL", "Eredivisie", "football-data", [
    [678, "Ajax", "Amsterdam Tulipani", 83, 95, 91, "#dc2626", "#f8fafc", "https://eredivisie.b-cdn.net/production/clubs/ajax/Ajax_Logo.png?height=256&quality=90&width=256"],
    [675, "Feyenoord", "Rotterdam Porto", 80, 89, 85, "#dc2626", "#111827"],
    [674, "PSV", "Eindhoven Luce", 81, 92, 87, "#dc2626", "#f8fafc"],
    [676, "FC Utrecht", "Utrecht Torri", 74, 85, 70, "#dc2626", "#f8fafc"],
    [682, "AZ", "Alkmaar Formaggi", 73, 87, 68, "#dc2626", "#f8fafc"],
    [666, "FC Twente", "Arnhem Aquile", 68, 80, 58, "#dc2626", "#f8fafc"],
    [677, "FC Groningen", "Groninga Nord", 65, 79, 52, "#16a34a", "#f8fafc"],
    [673, "sc Heerenveen", "Breda Baronia", 62, 76, 46, "#2563eb", "#f8fafc"],
  ]),
  BR: makeClubs("BR", "Brasileirão Série A", "espn", [
    [819, "Flamengo", "Rio Rubro", 82, 91, 91, "#dc2626", "#111827"],
    [2029, "Palmeiras", "Selva Paulista", 83, 89, 90, "#15803d", "#f8fafc"],
    [2674, "Santos", "Baixada Oceano", 78, 95, 86, "#f8fafc", "#111827"],
    [874, "Corinthians", "Metropoli Alvinegra", 80, 86, 88, "#111827", "#f8fafc"],
    [3445, "Fluminense", "Recife Sol", 77, 86, 81, "#7a1538", "#00843d"],
    [6273, "Grêmio", "Porto Alegre Tricolore", 76, 83, 78, "#2563eb", "#111827"],
    [2026, "São Paulo", "Goias Cerrado", 76, 87, 82, "#f8fafc", "#dc2626"],
    [9967, "Bahia", "Bahia Tricolore", 71, 82, 66, "#2563eb", "#dc2626"],
  ]),
  AR: makeClubs("AR", "Liga Profesional Argentina", "espn", [
    [5, "Boca Juniors", "Buenos Aires Azul", 82, 91, 92, "#1d4ed8", "#facc15"],
    [16, "River Plate", "Monumental Rojo", 83, 93, 93, "#f8fafc", "#dc2626"],
    [11, "Independiente", "Avellaneda Diablo", 78, 86, 83, "#dc2626", "#f8fafc"],
    [15, "Racing Club", "Academia Celeste", 77, 88, 81, "#38bdf8", "#f8fafc"],
    [8, "Estudiantes de La Plata", "Mendoza Andes", 74, 86, 77, "#dc2626", "#f8fafc"],
    [17, "Rosario Central", "Rosario Canaglia", 73, 84, 71, "#1d4ed8", "#facc15"],
    [19, "Talleres", "Cordoba Talleres", 71, 83, 67, "#1d4ed8", "#f8fafc"],
    [9, "Gimnasia La Plata", "La Plata Bosque", 67, 80, 58, "#15803d", "#f8fafc"],
  ]),
};

export interface CreateCareerInput {
  firstName: string;
  lastName: string;
  nationality: CountryCode;
  role: Role;
  preferredFoot: PreferredFoot;
  shirtNumber: number;
  gameMode: GameMode;
  startMode: StartMode;
  agentEnabled: boolean;
  startingClubName?: string;
  startingAge?: number;
}

export interface CareerPlayer {
  firstName: string;
  lastName: string;
  displayName: string;
  nationality: CountryCode;
  role: Role;
  preferredFoot: PreferredFoot;
  shirtNumber: number;
}

export interface CareerClub extends ClubDefinition {
  joinedSeason: number;
  contractUntil: number;
  squadRole: SquadRole;
}

export interface CareerEvent {
  id: string;
  seasonIndex: number;
  age: number;
  type:
    | "debut"
    | "form"
    | "training"
    | "injury"
    | "milestone"
    | "captaincy"
    | "nationalTeam"
    | "trophy"
    | "award"
    | "transfer"
    | "contract"
    | "retirement";
  title: string;
  description: string;
  tone: EventTone;
  impact: number;
}

export interface CareerOffer {
  id: string;
  /** Assenti soltanto nei salvataggi creati prima del catalogo 2026. */
  clubId?: string;
  clubName: string;
  country: CountryCode;
  league: string;
  crestUrl?: string;
  clubRating: number;
  squadRole: SquadRole;
  contractYears: number;
  annualSalary: number;
  transferFee: number;
  interest: number;
  message: string;
}

export interface CareerHonour {
  name: string;
  count: number;
  lastWonSeason: number;
}

export interface CareerTotals {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  saves: number;
  tackles: number;
  keyPasses: number;
  playerOfTheMatch: number;
  yellowCards: number;
  redCards: number;
}

export interface NationalTeamCareer {
  country: CountryCode;
  caps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  trophies: number;
  firstCallUpSeason: number | null;
}

export interface CareerSeason {
  id: string;
  index: number;
  label: string;
  year: number;
  age: number;
  clubName: string;
  country: CountryCode;
  league: string;
  squadRole: SquadRole;
  trainingChoice: TrainingChoice;
  overallStart: number;
  overallEnd: number;
  potentialEnd: number;
  marketValueStart: number;
  marketValueEnd: number;
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  saves: number;
  tackles: number;
  keyPasses: number;
  playerOfTheMatch: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
  leaguePosition: number;
  leaguePoints: number;
  cupResult: string;
  continentalResult: string | null;
  trophies: string[];
  awards: string[];
  nationalCaps: number;
  nationalGoals: number;
  nationalAssists: number;
  nationalCleanSheets: number;
  events: CareerEvent[];
  goatPointsEarned: number;
  retiredAfterSeason: boolean;
}

export interface CareerState {
  version: 1;
  id: string;
  seed: string;
  stage: CareerStage;
  gameMode: GameMode;
  startMode: StartMode;
  agentEnabled: boolean;
  player: CareerPlayer;
  currentClub: CareerClub | null;
  age: number;
  seasonYear: number;
  seasonIndex: number;
  overall: number;
  potential: number;
  reputation: number;
  marketValue: number;
  form: number;
  seasons: CareerSeason[];
  totals: CareerTotals;
  nationalTeam: NationalTeamCareer;
  trophyCabinet: CareerHonour[];
  awardCabinet: CareerHonour[];
  goatScore: number;
  pendingOffers: CareerOffer[];
  feed: CareerEvent[];
  retiredAtAge: number | null;
}

interface RoleProfile {
  goalRate: number;
  assistRate: number;
  cleanSheetWeight: number;
  tackleRate: number;
  keyPassRate: number;
  nationalGoalRate: number;
  training: readonly TrainingChoice[];
}

const ROLE_PROFILES: Record<Role, RoleProfile> = {
  GK: { goalRate: 0.001, assistRate: 0.008, cleanSheetWeight: 1, tackleRate: 0.08, keyPassRate: 0.12, nationalGoalRate: 0, training: ["goalkeeping", "recovery", "athleticism"] },
  RB: { goalRate: 0.035, assistRate: 0.13, cleanSheetWeight: 0.68, tackleRate: 2.45, keyPassRate: 0.85, nationalGoalRate: 0.025, training: ["defending", "athleticism", "playmaking"] },
  CB: { goalRate: 0.045, assistRate: 0.025, cleanSheetWeight: 0.8, tackleRate: 2.75, keyPassRate: 0.25, nationalGoalRate: 0.04, training: ["defending", "athleticism", "recovery"] },
  LB: { goalRate: 0.035, assistRate: 0.13, cleanSheetWeight: 0.68, tackleRate: 2.45, keyPassRate: 0.85, nationalGoalRate: 0.025, training: ["defending", "athleticism", "playmaking"] },
  DM: { goalRate: 0.055, assistRate: 0.09, cleanSheetWeight: 0.5, tackleRate: 2.65, keyPassRate: 1.15, nationalGoalRate: 0.045, training: ["defending", "playmaking", "athleticism"] },
  CM: { goalRate: 0.09, assistRate: 0.15, cleanSheetWeight: 0.34, tackleRate: 1.65, keyPassRate: 1.75, nationalGoalRate: 0.07, training: ["playmaking", "athleticism", "balanced"] },
  AM: { goalRate: 0.2, assistRate: 0.24, cleanSheetWeight: 0.2, tackleRate: 0.75, keyPassRate: 2.35, nationalGoalRate: 0.17, training: ["playmaking", "finishing", "athleticism"] },
  RW: { goalRate: 0.25, assistRate: 0.2, cleanSheetWeight: 0.16, tackleRate: 0.55, keyPassRate: 1.9, nationalGoalRate: 0.21, training: ["finishing", "playmaking", "athleticism"] },
  LW: { goalRate: 0.25, assistRate: 0.2, cleanSheetWeight: 0.16, tackleRate: 0.55, keyPassRate: 1.9, nationalGoalRate: 0.21, training: ["finishing", "playmaking", "athleticism"] },
  SS: { goalRate: 0.34, assistRate: 0.17, cleanSheetWeight: 0.12, tackleRate: 0.42, keyPassRate: 1.45, nationalGoalRate: 0.29, training: ["finishing", "playmaking", "athleticism"] },
  CF: { goalRate: 0.39, assistRate: 0.13, cleanSheetWeight: 0.1, tackleRate: 0.35, keyPassRate: 1.15, nationalGoalRate: 0.34, training: ["finishing", "athleticism", "playmaking"] },
  ST: { goalRate: 0.45, assistRate: 0.09, cleanSheetWeight: 0.08, tackleRate: 0.3, keyPassRate: 0.78, nationalGoalRate: 0.39, training: ["finishing", "athleticism", "recovery"] },
};

const MODE_CONFIG: Record<GameMode, { growth: number; performance: number; injury: number; reputation: number }> = {
  // Rapida e Immersiva cambiano il ritmo del resoconto, non la difficoltà.
  realistic: { growth: 1, performance: 1, injury: 1, reputation: 1 },
  balanced: { growth: 1, performance: 1, injury: 1, reputation: 1 },
  legend: { growth: 1.18, performance: 1.08, injury: 0.82, reputation: 1.16 },
};

const NATIONAL_THRESHOLDS: Record<CountryCode, number> = {
  IT: 78,
  ES: 80,
  GB: 81,
  DE: 79,
  FR: 80,
  PT: 77,
  NL: 76,
  BR: 81,
  AR: 79,
};

const EMPTY_TOTALS: CareerTotals = {
  appearances: 0,
  starts: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
  saves: 0,
  tackles: 0,
  keyPasses: 0,
  playerOfTheMatch: 0,
  yellowCards: 0,
  redCards: 0,
};

const CAREER_START_YEAR = 2026;

class SeededRandom {
  private value: number;

  constructor(seed: string) {
    this.value = hashString(seed) || 0x6d2b79f5;
  }

  next(): number {
    this.value = (this.value + 0x6d2b79f5) | 0;
    let result = this.value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  }

  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next() < clamp(probability, 0, 1);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Impossibile scegliere da una lista vuota.");
    return items[this.int(0, items.length - 1)] as T;
  }

  shuffled<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 0): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function roundMoney(value: number): number {
  const unit = value < 1_000_000 ? 25_000 : 100_000;
  return Math.max(0, Math.round(value / unit) * unit);
}

function findCountry(code: CountryCode): CountryOption {
  const country = COUNTRY_OPTIONS.find((item) => item.code === code);
  if (!country) throw new Error(`Paese non supportato: ${code}`);
  return country;
}

const ALL_CLUBS: readonly ClubDefinition[] = Object.values(CLUBS_BY_COUNTRY).flat();

const LEGACY_LEAGUE_NAMES: Readonly<Record<string, string>> = {
  "Lega Aurora": "Serie A",
  "Liga del Sol": "LaLiga",
  "Albion Crown League": "Premier League",
  "Bundeskrone Liga": "Bundesliga",
  "Ligue Lumiere": "Ligue 1",
  "Liga Navegadores": "Primeira Liga",
  "Oranje Elite": "Eredivisie",
  "Serie Verdeoro": "Brasileirão Série A",
  "Liga del Plata": "Liga Profesional Argentina",
};

function normalizeCatalogName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CLUB_LOOKUP = new Map<string, ClubDefinition>();
for (const club of ALL_CLUBS) {
  CLUB_LOOKUP.set(normalizeCatalogName(club.id), club);
  CLUB_LOOKUP.set(normalizeCatalogName(club.name), club);
  for (const legacyName of club.legacyNames) CLUB_LOOKUP.set(normalizeCatalogName(legacyName), club);
}

/** Risolve sia i nomi correnti sia quelli fittizi presenti nei vecchi salvataggi. */
export function getClubByName(name: string): ClubDefinition | undefined {
  return CLUB_LOOKUP.get(normalizeCatalogName(name));
}

function findClub(name: string): ClubDefinition | undefined {
  return getClubByName(name);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CATALOG_TEXT_REPLACEMENTS: readonly (readonly [string, string])[] = [
  ...ALL_CLUBS.flatMap((club) => club.legacyNames.map((legacyName) => [legacyName, club.name] as const)),
  ...Object.entries(LEGACY_LEAGUE_NAMES),
].sort(([left], [right]) => right.length - left.length);

function upgradeCatalogText(value: string): string {
  return CATALOG_TEXT_REPLACEMENTS.reduce(
    (result, [legacyName, currentName]) => result.replace(new RegExp(escapeRegExp(legacyName), "gi"), currentName),
    value,
  );
}

function currentLeague(country: CountryCode, fallback: string): string {
  return findCountry(country).league.name || fallback;
}

/**
 * Aggiorna in memoria un salvataggio creato con il catalogo fittizio.
 *
 * È intenzionalmente idempotente: puo essere richiamata ad ogni caricamento,
 * cosi anche gli stati parzialmente migrati ricevono stemmi e metadati correnti.
 */
export function upgradeCareerCatalog(state: CareerState): CareerState {
  const currentClubDefinition = state.currentClub ? findClub(state.currentClub.name) : undefined;
  const currentClub = state.currentClub
    ? currentClubDefinition
      ? {
          ...currentClubDefinition,
          joinedSeason: state.currentClub.joinedSeason,
          contractUntil: state.currentClub.contractUntil,
          squadRole: state.currentClub.squadRole,
        }
      : {
          ...state.currentClub,
          league: currentLeague(state.currentClub.country, state.currentClub.league),
        }
    : null;

  const upgradeEvent = (event: CareerEvent): CareerEvent => ({
    ...event,
    title: upgradeCatalogText(event.title),
    description: upgradeCatalogText(event.description),
  });

  const pendingOffers = state.pendingOffers.map((offer): CareerOffer => {
    const club = findClub(offer.clubName);
    return club
      ? {
          ...offer,
          clubId: club.id,
          clubName: club.name,
          country: club.country,
          league: club.league,
          crestUrl: club.crestUrl,
          clubRating: club.rating,
          message: upgradeCatalogText(offer.message),
        }
      : {
          ...offer,
          league: currentLeague(offer.country, offer.league),
          message: upgradeCatalogText(offer.message),
        };
  });

  const seasons = state.seasons.map((season): CareerSeason => {
    const club = findClub(season.clubName);
    return {
      ...season,
      clubName: club?.name ?? upgradeCatalogText(season.clubName),
      country: club?.country ?? season.country,
      league: club?.league ?? currentLeague(season.country, season.league),
      trophies: season.trophies.map(upgradeCatalogText),
      awards: season.awards.map(upgradeCatalogText),
      events: season.events.map(upgradeEvent),
    };
  });

  return {
    ...state,
    currentClub,
    pendingOffers,
    seasons,
    trophyCabinet: state.trophyCabinet.map((honour) => ({
      ...honour,
      name: upgradeCatalogText(honour.name),
    })),
    awardCabinet: state.awardCabinet.map((honour) => ({
      ...honour,
      name: upgradeCatalogText(honour.name),
    })),
    feed: state.feed.map(upgradeEvent),
  };
}

function squadRoleFor(overall: number, clubRating: number): SquadRole {
  const difference = overall - clubRating;
  if (difference >= 5) return "star";
  if (difference >= -3) return "starter";
  if (difference >= -9) return "rotation";
  return "prospect";
}

function salaryFor(overall: number, role: SquadRole, prestige: number): number {
  const roleMultiplier: Record<SquadRole, number> = { prospect: 0.55, rotation: 0.85, starter: 1.15, star: 1.65 };
  const raw = Math.max(90_000, (overall - 42) ** 2.25 * 2_500);
  return roundMoney(raw * roleMultiplier[role] * (0.75 + prestige / 180));
}

function calculateMarketValue(overall: number, age: number, reputation: number, clubRating: number): number {
  const ageMultiplier = age <= 21 ? 1.32 : age <= 25 ? 1.2 : age <= 29 ? 1 : age <= 32 ? 0.72 : age <= 35 ? 0.43 : 0.22;
  const qualityBase = Math.max(1, overall - 44) ** 2.42 * 3_300;
  const reputationMultiplier = 0.78 + reputation / 78;
  const clubMultiplier = 0.78 + clubRating / 190;
  return roundMoney(qualityBase * ageMultiplier * reputationMultiplier * clubMultiplier);
}

function offerFromClub(state: CareerState, club: ClubDefinition, index: number, starting: boolean): CareerOffer {
  const squadRole = squadRoleFor(state.overall, club.rating);
  const rng = new SeededRandom(`${state.seed}|offer|${state.seasonIndex}|${club.name}|${index}|${starting}`);
  const contractYears = rng.int(starting ? 2 : 3, 5);
  const feeMultiplier = 0.86 + rng.next() * 0.38;
  const transferFee = starting ? 0 : roundMoney(state.marketValue * feeMultiplier);
  const differenceFit = 100 - Math.abs(club.rating - state.overall) * 4;
  const interest = Math.round(clamp(differenceFit + rng.between(-7, 8) + state.reputation * 0.12, 35, 99));
  const messageByRole: Record<SquadRole, string> = {
    prospect: "Un progetto di crescita con spazio da conquistare.",
    rotation: "Minuti regolari e una corsa aperta per l'undici titolare.",
    starter: "Il club ti considera una pedina centrale del nuovo ciclo.",
    star: "La squadra vuole costruire il proprio gioco attorno a te.",
  };

  return {
    id: `offer-${hashString(`${state.id}|${state.seasonIndex}|${club.name}|${index}`).toString(36)}`,
    clubId: club.id,
    clubName: club.name,
    country: club.country,
    league: club.league,
    crestUrl: club.crestUrl,
    clubRating: club.rating,
    squadRole,
    contractYears,
    annualSalary: salaryFor(state.overall, squadRole, club.prestige),
    transferFee,
    interest,
    message: messageByRole[squadRole],
  };
}

function makeEvent(
  state: Pick<CareerState, "id" | "seasonIndex" | "age">,
  index: number,
  type: CareerEvent["type"],
  title: string,
  description: string,
  tone: EventTone,
  impact: number,
): CareerEvent {
  return {
    id: `event-${hashString(`${state.id}|${state.seasonIndex}|${index}|${type}|${title}`).toString(36)}`,
    seasonIndex: state.seasonIndex,
    age: state.age,
    type,
    title,
    description,
    tone,
    impact,
  };
}

function mergeHonours(current: readonly CareerHonour[], names: readonly string[], season: number): CareerHonour[] {
  const map = new Map(current.map((honour) => [honour.name, { ...honour }]));
  for (const name of names) {
    const existing = map.get(name);
    map.set(name, {
      name,
      count: (existing?.count ?? 0) + 1,
      lastWonSeason: season,
    });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"));
}

function addTotals(totals: CareerTotals, season: CareerSeason): CareerTotals {
  return {
    appearances: totals.appearances + season.appearances,
    starts: totals.starts + season.starts,
    minutes: totals.minutes + season.minutes,
    goals: totals.goals + season.goals,
    assists: totals.assists + season.assists,
    cleanSheets: totals.cleanSheets + season.cleanSheets,
    saves: totals.saves + season.saves,
    tackles: totals.tackles + season.tackles,
    keyPasses: totals.keyPasses + season.keyPasses,
    playerOfTheMatch: totals.playerOfTheMatch + season.playerOfTheMatch,
    yellowCards: totals.yellowCards + season.yellowCards,
    redCards: totals.redCards + season.redCards,
  };
}

function sampleCount(rng: SeededRandom, expected: number, volatility = 0.3): number {
  if (expected <= 0) return 0;
  const spread = Math.max(0.8, expected * volatility);
  const noise = (rng.next() + rng.next() + rng.next() - 1.5) * spread;
  return Math.max(0, Math.round(expected + noise));
}

function roleTrainingFit(role: Role, choice: TrainingChoice): number {
  if (choice === "balanced") return 1;
  if (choice === "recovery") return 0.76;
  return ROLE_PROFILES[role].training.includes(choice) ? 1.18 : 0.7;
}

function roleDepartment(role: Role): RoleOption["department"] {
  return ROLE_OPTIONS.find((option) => option.code === role)?.department ?? "Attacco";
}

export function createInitialCareer(input: CreateCareerInput, seed: string | number): CareerState {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) throw new Error("Inserisci il nome del giocatore.");
  if (firstName.length > 30 || lastName.length > 30) throw new Error("Nome e cognome possono avere al massimo 30 caratteri.");

  findCountry(input.nationality);
  if (!ROLE_OPTIONS.some((role) => role.code === input.role)) throw new Error("Ruolo non valido.");

  const normalizedSeed = String(seed).trim() || `${firstName}-${lastName}`;
  const rng = new SeededRandom(`${normalizedSeed}|create|${firstName}|${lastName}`);
  if (!Number.isInteger(input.shirtNumber) || input.shirtNumber < 1 || input.shirtNumber > 99) {
    throw new Error("Il numero di maglia deve essere compreso tra 1 e 99.");
  }

  const defaultAge = input.startMode === "academy" ? 14 : 18;
  const age = input.startingAge ?? defaultAge;
  if (!Number.isInteger(age) || age < 14 || age > 22) throw new Error("L'eta iniziale deve essere compresa tra 14 e 22 anni.");

  const startBase = input.startMode === "academy" ? 56 : 62;
  const overall = clamp(startBase + rng.int(-3, 4) + (input.gameMode === "legend" ? 2 : 0), 50, 69);
  const potentialBonus = input.gameMode === "legend" ? rng.int(24, 31) : rng.int(18, 28);
  const potential = clamp(overall + potentialBonus, 72, 96);
  const reputation = input.startMode === "academy" ? rng.int(2, 6) : rng.int(5, 10);
  const id = `career-${hashString(`${normalizedSeed}|${firstName}|${lastName}|${input.nationality}|${input.role}`).toString(36)}`;

  const base: CareerState = {
    version: 1,
    id,
    seed: normalizedSeed,
    stage: "choosingClub",
    gameMode: input.gameMode,
    startMode: input.startMode,
    agentEnabled: input.agentEnabled,
    player: {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
      nationality: input.nationality,
      role: input.role,
      preferredFoot: input.preferredFoot,
      shirtNumber: input.shirtNumber,
    },
    currentClub: null,
    age,
    seasonYear: CAREER_START_YEAR,
    seasonIndex: 0,
    overall,
    potential,
    reputation,
    marketValue: calculateMarketValue(overall, age, reputation, 66),
    form: 50,
    seasons: [],
    totals: { ...EMPTY_TOTALS },
    nationalTeam: {
      country: input.nationality,
      caps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      trophies: 0,
      firstCallUpSeason: null,
    },
    trophyCabinet: [],
    awardCabinet: [],
    goatScore: 0,
    pendingOffers: [],
    feed: [],
    retiredAtAge: null,
  };

  if (input.startMode === "freeAgent" && input.startingClubName) {
    const requestedClub = findClub(input.startingClubName);
    if (!requestedClub || requestedClub.country !== input.nationality) {
      throw new Error("Scegli un club disponibile nella nazione selezionata.");
    }
    const selectable = {
      ...base,
      pendingOffers: [offerFromClub(base, requestedClub, 0, true)],
    };
    return chooseStartingClub(selectable, requestedClub.name);
  }

  return { ...base, pendingOffers: generateStartingOffers(base) };
}

export function generateStartingOffers(state: CareerState): CareerOffer[] {
  if (state.stage === "retired") return [];
  const rng = new SeededRandom(`${state.seed}|starting-offers|${state.player.nationality}|${state.overall}`);
  const homeClubs = CLUBS_BY_COUNTRY[state.player.nationality]
    .filter((club) => club.rating <= state.overall + (state.startMode === "academy" ? 18 : 13))
    .map((club) => ({ club, score: Math.abs(club.rating - (state.overall + 7)) + rng.between(0, 7) }))
    .sort((a, b) => a.score - b.score)
    .map(({ club }) => club);

  const foreignCountries = rng.shuffled(COUNTRY_OPTIONS.filter((country) => country.code !== state.player.nationality));
  const foreignClubs = foreignCountries
    .flatMap((country) => CLUBS_BY_COUNTRY[country.code])
    .filter((club) => club.rating <= state.overall + 11 && club.rating >= state.overall - 1)
    .map((club) => ({ club, score: Math.abs(club.rating - (state.overall + 5)) + rng.between(0, 10) }))
    .sort((a, b) => a.score - b.score)
    .map(({ club }) => club);

  const selected: ClubDefinition[] = [];
  const homeTarget = state.startMode === "academy" ? 2 : 1;
  selected.push(...homeClubs.slice(0, homeTarget));
  for (const club of [...foreignClubs, ...homeClubs]) {
    if (selected.length >= 3) break;
    if (!selected.some((item) => item.name === club.name)) selected.push(club);
  }

  if (selected.length < 3) {
    const fallback = rng
      .shuffled(Object.values(CLUBS_BY_COUNTRY).flat())
      .filter((club) => !selected.some((item) => item.name === club.name))
      .sort((a, b) => Math.abs(a.rating - state.overall) - Math.abs(b.rating - state.overall));
    selected.push(...fallback.slice(0, 3 - selected.length));
  }

  return selected.slice(0, 3).map((club, index) => offerFromClub(state, club, index, true));
}

export function chooseStartingClub(state: CareerState, clubName: string): CareerState {
  if (state.stage !== "choosingClub" || state.currentClub) throw new Error("Il club iniziale e gia stato scelto.");
  const offers = state.pendingOffers.length > 0 ? state.pendingOffers : generateStartingOffers(state);
  const offer = offers.find((item) => item.clubName.toLocaleLowerCase("it") === clubName.trim().toLocaleLowerCase("it"));
  if (!offer) throw new Error("Questa squadra non fa parte delle offerte iniziali.");
  const club = findClub(offer.clubName);
  if (!club) throw new Error("Squadra non disponibile.");

  const debutEvent = makeEvent(
    state,
    0,
    "debut",
    "La carriera comincia",
    `${state.player.displayName} firma il primo contratto con ${club.name}.`,
    "special",
    4,
  );

  return {
    ...state,
    stage: "active",
    currentClub: {
      ...club,
      joinedSeason: state.seasonYear,
      contractUntil: state.seasonYear + offer.contractYears,
      squadRole: offer.squadRole,
    },
    marketValue: calculateMarketValue(state.overall, state.age, state.reputation, club.rating),
    pendingOffers: [],
    feed: [debutEvent, ...state.feed].slice(0, 40),
  };
}

function seasonTrophies(
  state: CareerState,
  club: CareerClub,
  leaguePosition: number,
  averageRating: number,
  rng: SeededRandom,
): { trophies: string[]; cupResult: string; continentalResult: string | null } {
  const country = findCountry(club.country);
  const trophies: string[] = [];
  if (leaguePosition === 1) trophies.push(country.league.name);

  const cupChance = clamp(0.04 + (club.rating - 65) / 110 + (averageRating - 6.5) * 0.05, 0.03, 0.38);
  const cupRoll = rng.next();
  let cupResult = "Sedicesimi";
  if (cupRoll < cupChance) {
    cupResult = "Vincitore";
    trophies.push(`Coppa ${country.name}`);
  } else if (cupRoll < cupChance + 0.13) cupResult = "Finale";
  else if (cupRoll < cupChance + 0.31) cupResult = "Semifinale";
  else if (cupRoll < cupChance + 0.58) cupResult = "Quarti";
  else if (cupRoll < cupChance + 0.82) cupResult = "Ottavi";

  let continentalResult: string | null = null;
  if (club.prestige >= 72 || state.reputation >= 55) {
    const continentalChance = clamp((club.rating - 73) / 105 + (averageRating - 7) * 0.035, 0.015, 0.26);
    const roll = rng.next();
    if (roll < continentalChance) {
      continentalResult = "Vincitore";
      trophies.push("Coppa delle Stelle");
    } else if (roll < continentalChance + 0.09) continentalResult = "Finale";
    else if (roll < continentalChance + 0.23) continentalResult = "Semifinale";
    else if (roll < continentalChance + 0.45) continentalResult = "Quarti";
    else continentalResult = "Fase a gironi";
  }

  return { trophies, cupResult, continentalResult };
}

function seasonAwards(
  state: CareerState,
  appearances: number,
  goals: number,
  assists: number,
  cleanSheets: number,
  averageRating: number,
  rng: SeededRandom,
): string[] {
  const awards: string[] = [];
  const department = roleDepartment(state.player.role);
  if (state.age <= 21 && appearances >= 20 && averageRating >= 7.15) awards.push("Talento dell'anno");
  if (department === "Attacco" && goals >= 22) awards.push("Cannoniere della stagione");
  if ((department === "Centrocampo" || department === "Attacco") && assists >= 14) awards.push("Re degli assist");
  if (state.player.role === "GK" && cleanSheets >= 15) awards.push("Guanto di luce");
  if (averageRating >= 7.85 && appearances >= 25 && rng.chance(0.5 + (averageRating - 7.85) * 0.7)) awards.push("Giocatore dell'anno");
  if (averageRating >= 8.35 && state.reputation >= 70 && rng.chance(0.38)) awards.push("Stella mondiale");
  return awards;
}

function makeTransferOffers(state: CareerState, season: CareerSeason): CareerOffer[] {
  if (state.stage === "retired" || !state.currentClub) return [];
  const rng = new SeededRandom(`${state.seed}|transfer-market|${season.index}|${season.averageRating}|${state.overall}`);
  const demand = clamp(
    0.18 + (season.averageRating - 6.5) * 0.22 + state.reputation / 240 + season.awards.length * 0.09,
    0.12,
    0.94,
  );
  if (!rng.chance(demand)) return [];

  const targetMin = Math.max(62, state.overall - 5);
  const targetMax = Math.min(92, state.overall + 9 + Math.floor(state.reputation / 28));
  const allCandidates = Object.values(CLUBS_BY_COUNTRY)
    .flat()
    .filter((club) => club.name !== state.currentClub?.name && club.rating >= targetMin && club.rating <= targetMax)
    .map((club) => ({
      club,
      score:
        Math.abs(club.rating - (state.overall + 3)) * 1.7 -
        club.prestige * (state.reputation / 520) +
        rng.between(0, 20),
    }))
    .sort((a, b) => a.score - b.score);

  const count = clamp(1 + (rng.chance(demand * 0.65) ? 1 : 0) + (rng.chance(demand * 0.3) ? 1 : 0), 1, 3);
  return allCandidates.slice(0, count).map(({ club }, index) => offerFromClub(state, club, index, false));
}

export function simulateNextSeason(
  state: CareerState,
  choice: TrainingChoice,
): { state: CareerState; season: CareerSeason; offers?: CareerOffer[] } {
  if (state.stage === "retired") throw new Error("La carriera e terminata.");
  if (state.stage !== "active" || !state.currentClub) throw new Error("Scegli una squadra prima di simulare la stagione.");
  if (!TRAINING_OPTIONS.some((item) => item.code === choice)) throw new Error("Allenamento non valido.");

  const club = state.currentClub;
  const country = findCountry(club.country);
  const profile = ROLE_PROFILES[state.player.role];
  const mode = MODE_CONFIG[state.gameMode];
  const rng = new SeededRandom(`${state.seed}|season|${state.seasonIndex}|${club.name}|${choice}`);
  const events: CareerEvent[] = [];
  let eventIndex = 0;

  const roleNow = squadRoleFor(state.overall, club.rating);
  const roleMinutes: Record<SquadRole, number> = { prospect: 0.38, rotation: 0.62, starter: 0.82, star: 0.93 };
  const baseMatches = country.league.leagueMatches + rng.int(4, 11);
  const recoveryFactor = choice === "recovery" ? 0.38 : choice === "athleticism" ? 1.12 : 1;
  const injuryProbability = clamp((0.115 + Math.max(0, state.age - 30) * 0.012) * mode.injury * recoveryFactor, 0.025, 0.42);
  const injured = rng.chance(injuryProbability);
  const gamesLost = injured ? rng.int(3, rng.chance(0.16) ? 17 : 10) : 0;

  if (injured) {
    const severe = gamesLost >= 11;
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "injury",
        severe ? "Stop importante" : "Piccolo contrattempo",
        severe
          ? `Un infortunio tiene ${state.player.firstName} lontano dal campo per diverse settimane.`
          : "Un problema fisico interrompe il ritmo, ma il recupero procede bene.",
        "negative",
        severe ? -7 : -3,
      ),
    );
  }

  const availability = Math.max(3, baseMatches - gamesLost);
  const competitionBoost = clamp((state.overall - club.rating + 9) / 34, -0.18, 0.22);
  const appearanceRate = clamp(roleMinutes[roleNow] + competitionBoost + rng.between(-0.06, 0.06), 0.2, 0.98);
  const appearances = clamp(Math.round(availability * appearanceRate), 2, availability);
  const startRate: Record<SquadRole, number> = { prospect: 0.24, rotation: 0.5, starter: 0.78, star: 0.91 };
  const starts = clamp(Math.round(appearances * (startRate[roleNow] + rng.between(-0.06, 0.06))), 0, appearances);
  const minutes = Math.round(starts * rng.between(74, 87) + (appearances - starts) * rng.between(18, 34));

  const trainingFit = roleTrainingFit(state.player.role, choice);
  const formNoise = (rng.next() + rng.next() + rng.next() - 1.5) * 0.75;
  const qualityDelta = (state.overall - club.rating) / 24;
  const baseRating = 6.55 + qualityDelta + (state.form - 50) / 85 + (trainingFit - 1) * 0.32 + formNoise;
  const averageRating = round(clamp(baseRating * mode.performance + (mode.performance - 1) * 2.2, 5.45, 9.42), 2);
  const attackQuality = clamp((state.overall - 48) / 34, 0.35, 1.55) * clamp((averageRating - 5.4) / 1.7, 0.45, 1.7);
  const trainingGoalBoost = choice === "finishing" ? 1.18 : 1;
  const trainingAssistBoost = choice === "playmaking" ? 1.18 : 1;
  const goals = sampleCount(rng, appearances * profile.goalRate * attackQuality * trainingGoalBoost, 0.5);
  const assists = sampleCount(rng, appearances * profile.assistRate * attackQuality * trainingAssistBoost, 0.48);
  const teamCleanSheetRate = clamp(0.16 + (club.rating - 62) / 115, 0.14, 0.44);
  const cleanSheets = sampleCount(rng, appearances * teamCleanSheetRate * profile.cleanSheetWeight, 0.32);
  const saves = state.player.role === "GK" ? sampleCount(rng, appearances * rng.between(2.35, 3.8), 0.16) : 0;
  const tackles = sampleCount(rng, appearances * profile.tackleRate * (0.88 + attackQuality * 0.16), 0.14);
  const keyPasses = sampleCount(rng, appearances * profile.keyPassRate * trainingAssistBoost, 0.18);
  const contribution = goals * 0.55 + assists * 0.42 + cleanSheets * 0.18 + (averageRating - 6.5) * appearances * 0.3;
  const playerOfTheMatch = sampleCount(rng, Math.max(0, contribution / 8.5), 0.38);
  const disciplineBase = roleDepartment(state.player.role) === "Difesa" ? 0.18 : 0.09;
  const yellowCards = sampleCount(rng, appearances * disciplineBase, 0.35);
  const redCards = rng.chance(clamp(appearances * 0.009, 0.01, 0.28)) ? 1 : 0;

  const leagueStrengthPosition = 1 + ((92 - club.rating) / 31) * (country.league.clubs - 1);
  const playerPositionBoost = clamp(contribution / 28 + (averageRating - 6.7) * 1.5, -2.2, 4.8);
  const leaguePosition = clamp(Math.round(leagueStrengthPosition - playerPositionBoost + rng.between(-2.4, 2.4)), 1, country.league.clubs);
  const leaguePoints = clamp(
    Math.round((country.league.clubs - leaguePosition) * 2.15 + country.league.leagueMatches * 0.95 + rng.between(-5, 6)),
    22,
    country.league.leagueMatches * 3,
  );
  const teamHonours = seasonTrophies(state, club, leaguePosition, averageRating, rng);
  const awards = seasonAwards(state, appearances, goals, assists, cleanSheets, averageRating, rng);

  const performanceGrowth = clamp((averageRating - 6.6) * 1.45, -2.2, 3.6);
  const ageGrowth = state.age <= 20 ? 2.2 : state.age <= 23 ? 1.45 : state.age <= 27 ? 0.55 : state.age <= 30 ? 0.05 : -0.65 - (state.age - 31) * 0.36;
  const potentialPull = state.age <= 25 ? Math.max(0, state.potential - state.overall) * 0.075 : 0;
  const injuryPenalty = injured ? gamesLost / 10 : 0;
  const rawGrowth = (ageGrowth + performanceGrowth + potentialPull) * trainingFit * mode.growth - injuryPenalty;
  const overallChange = clamp(Math.round(rawGrowth + rng.between(-0.75, 0.75)), state.age >= 33 ? -4 : -2, state.age <= 23 ? 6 : 4);
  const overallEnd = clamp(state.overall + overallChange, 45, 99);
  const potentialEnd = clamp(
    state.potential + (state.age <= 21 && averageRating >= 7.5 && rng.chance(0.35) ? 1 : 0) - (state.age >= 31 ? 1 : 0),
    overallEnd,
    97,
  );
  const reputationGain = Math.round(
    clamp(
      ((averageRating - 6.5) * 4 + teamHonours.trophies.length * 5 + awards.length * 4 + appearances / 16) * mode.reputation,
      -5,
      18,
    ),
  );
  const reputationEnd = clamp(state.reputation + reputationGain, 0, 100);
  const marketValueEnd = calculateMarketValue(overallEnd, state.age + 1, reputationEnd, club.rating);
  const formEnd = Math.round(clamp(46 + (averageRating - 6.5) * 15 + rng.between(-7, 7), 18, 92));

  if (trainingFit >= 1.18 && overallChange > 0) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "training",
        "Allenamento ripagato",
        "Il lavoro specifico si vede in campo e accelera la crescita.",
        "positive",
        Math.max(2, overallChange),
      ),
    );
  }
  if (averageRating >= 7.65 && appearances >= 20) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "form",
        "Stagione della consacrazione",
        `${state.player.firstName} diventa uno dei protagonisti di ${club.name}.`,
        "positive",
        7,
      ),
    );
  } else if (averageRating < 6.2) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "form",
        "Fiducia da ritrovare",
        "Una stagione complicata mette alla prova carattere e continuita.",
        "negative",
        -4,
      ),
    );
  }

  for (const trophy of teamHonours.trophies) {
    events.push(makeEvent(state, eventIndex++, "trophy", "Trofeo conquistato", `${club.name} alza ${trophy}.`, "special", 9));
  }
  for (const award of awards) {
    events.push(makeEvent(state, eventIndex++, "award", award, "Il rendimento stagionale vale un riconoscimento individuale.", "special", 8));
  }

  const nationalScore = overallEnd + reputationEnd * 0.08 + (averageRating - 6.5) * 2;
  const calledUp = nationalScore >= NATIONAL_THRESHOLDS[state.player.nationality] && appearances >= 12;
  let nationalCaps = 0;
  let nationalGoals = 0;
  let nationalAssists = 0;
  let nationalCleanSheets = 0;
  let nationalTrophies = 0;
  if (calledUp) {
    nationalCaps = rng.int(state.nationalTeam.caps === 0 ? 3 : 2, 11);
    nationalGoals = sampleCount(rng, nationalCaps * profile.nationalGoalRate * attackQuality, 0.55);
    nationalAssists = sampleCount(rng, nationalCaps * profile.assistRate * 0.68 * attackQuality, 0.52);
    nationalCleanSheets = state.player.role === "GK" ? sampleCount(rng, nationalCaps * 0.35, 0.4) : 0;
    const tournamentYear = (state.seasonYear - CAREER_START_YEAR + 1) % 4 === 0;
    if (tournamentYear && nationalCaps >= 5 && rng.chance(clamp(0.035 + nationalScore / 650, 0.04, 0.2))) nationalTrophies = 1;
    if (state.nationalTeam.caps === 0) {
      events.push(
        makeEvent(
          state,
          eventIndex++,
          "nationalTeam",
          "Prima convocazione",
          `${state.player.firstName} riceve la chiamata della nazionale ${findCountry(state.player.nationality).demonym.toLocaleLowerCase("it")}.`,
          "special",
          10,
        ),
      );
    }
    if (nationalTrophies > 0) {
      events.push(makeEvent(state, eventIndex++, "trophy", "Trionfo con la nazionale", "Un'estate indimenticabile si chiude con un trofeo internazionale.", "special", 14));
    }
  }

  const nextAge = state.age + 1;
  const retirementChance = nextAge === 36 ? 0.08 : nextAge === 37 ? 0.22 : nextAge === 38 ? 0.52 : nextAge >= 39 ? 1 : 0;
  const retiredAfterSeason = nextAge >= 36 && rng.chance(retirementChance);
  if (retiredAfterSeason) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "retirement",
        "L'ultima partita",
        `${state.player.displayName} saluta il calcio giocato dopo una carriera da ricordare.`,
        "special",
        12,
      ),
    );
  }

  const seasonGoatPoints = Math.max(
    0,
    Math.round(
      appearances * 0.35 +
        goals * 3.8 +
        assists * 2.7 +
        cleanSheets * 1.25 +
        playerOfTheMatch * 2.5 +
        nationalCaps * 0.9 +
        nationalGoals * 4.5 +
        teamHonours.trophies.length * 32 +
        awards.length * 25 +
        nationalTrophies * 58 +
        Math.max(0, averageRating - 6.5) * appearances * 1.25,
    ),
  );

  const season: CareerSeason = {
    id: `season-${hashString(`${state.id}|${state.seasonIndex}|${club.name}`).toString(36)}`,
    index: state.seasonIndex,
    label: `${state.seasonYear}/${String(state.seasonYear + 1).slice(-2)}`,
    year: state.seasonYear,
    age: state.age,
    clubName: club.name,
    country: club.country,
    league: club.league,
    squadRole: roleNow,
    trainingChoice: choice,
    overallStart: state.overall,
    overallEnd,
    potentialEnd,
    marketValueStart: state.marketValue,
    marketValueEnd,
    appearances,
    starts,
    minutes,
    goals,
    assists,
    cleanSheets,
    saves,
    tackles,
    keyPasses,
    playerOfTheMatch,
    yellowCards,
    redCards,
    averageRating,
    leaguePosition,
    leaguePoints,
    cupResult: teamHonours.cupResult,
    continentalResult: teamHonours.continentalResult,
    trophies: teamHonours.trophies,
    awards,
    nationalCaps,
    nationalGoals,
    nationalAssists,
    nationalCleanSheets,
    events,
    goatPointsEarned: seasonGoatPoints,
    retiredAfterSeason,
  };

  const renewed = state.seasonYear + 1 >= club.contractUntil;
  const nextClub: CareerClub = {
    ...club,
    squadRole: roleNow,
    contractUntil: renewed ? state.seasonYear + 3 : club.contractUntil,
  };
  if (renewed && !retiredAfterSeason) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "contract",
        "Accordo rinnovato",
        `${club.name} prolunga il contratto fino al ${nextClub.contractUntil}.`,
        "positive",
        3,
      ),
    );
  }

  const nationalTeam: NationalTeamCareer = {
    ...state.nationalTeam,
    caps: state.nationalTeam.caps + nationalCaps,
    goals: state.nationalTeam.goals + nationalGoals,
    assists: state.nationalTeam.assists + nationalAssists,
    cleanSheets: state.nationalTeam.cleanSheets + nationalCleanSheets,
    trophies: state.nationalTeam.trophies + nationalTrophies,
    firstCallUpSeason:
      state.nationalTeam.firstCallUpSeason ?? (nationalCaps > 0 ? state.seasonYear : null),
  };

  let nextState: CareerState = {
    ...state,
    stage: retiredAfterSeason ? "retired" : "active",
    currentClub: nextClub,
    age: nextAge,
    seasonYear: state.seasonYear + 1,
    seasonIndex: state.seasonIndex + 1,
    overall: overallEnd,
    potential: potentialEnd,
    reputation: reputationEnd,
    marketValue: retiredAfterSeason ? 0 : marketValueEnd,
    form: formEnd,
    seasons: [...state.seasons, season],
    totals: addTotals(state.totals, season),
    nationalTeam,
    trophyCabinet: mergeHonours(state.trophyCabinet, teamHonours.trophies, state.seasonYear),
    awardCabinet: mergeHonours(state.awardCabinet, awards, state.seasonYear),
    goatScore: state.goatScore + seasonGoatPoints,
    pendingOffers: [],
    feed: [...events].reverse().concat(state.feed).slice(0, 40),
    retiredAtAge: retiredAfterSeason ? nextAge : null,
  };

  const offers = retiredAfterSeason || !state.agentEnabled ? [] : makeTransferOffers(nextState, season);
  nextState = { ...nextState, pendingOffers: offers };
  return offers.length > 0 ? { state: nextState, season, offers } : { state: nextState, season };
}

export function acceptTransfer(state: CareerState, clubName: string): CareerState {
  if (state.stage !== "active" || !state.currentClub) throw new Error("Non puoi accettare trasferimenti in questo momento.");
  const normalized = clubName.trim().toLocaleLowerCase("it");
  const offer = state.pendingOffers.find((item) => item.clubName.toLocaleLowerCase("it") === normalized);
  if (!offer) throw new Error("L'offerta selezionata non e piu disponibile.");
  const club = findClub(offer.clubName);
  if (!club) throw new Error("Squadra non disponibile.");

  const transferEvent = makeEvent(
    state,
    state.feed.length + 1,
    "transfer",
    "Nuova sfida",
    `${state.player.displayName} lascia ${state.currentClub.name} e firma con ${club.name}.`,
    "special",
    6,
  );

  return {
    ...state,
    currentClub: {
      ...club,
      joinedSeason: state.seasonYear,
      contractUntil: state.seasonYear + offer.contractYears,
      squadRole: offer.squadRole,
    },
    reputation: clamp(state.reputation + (club.prestige > state.currentClub.prestige ? 2 : 0), 0, 100),
    marketValue: calculateMarketValue(state.overall, state.age, state.reputation, club.rating),
    pendingOffers: [],
    feed: [transferEvent, ...state.feed].slice(0, 40),
  };
}
