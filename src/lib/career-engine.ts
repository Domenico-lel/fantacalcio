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
export type CareerDecisionPhase = "preSeason" | "postSeason";
export type CareerDecisionOutcome = "greatSuccess" | "success" | "neutral" | "failure";
export type NationalRankingTrend = "up" | "down" | "stable";
export type RetirementPlan = "undecided" | "retireAt40" | "continueTo42";
export type CareerArcType =
  | "breakthrough"
  | "comeback"
  | "wonderkid"
  | "lateBloomer"
  | "clubIcon"
  | "nationalHero"
  | "journeyman"
  | "crisis";
export type CareerArcStatus = "active" | "completed" | "failed";

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

/** Metadati separati dal paese: necessari per una piramide italiana credibile. */
export const LEAGUE_METADATA_BY_NAME: Readonly<Record<string, LeagueMetadata>> = {
  "Serie A": { name: "Serie A", shortName: "Serie A", strength: 88, clubs: 20, leagueMatches: 38, style: "Tattica e tecnica" },
  "Serie B": { name: "Serie B", shortName: "Serie B", strength: 69, clubs: 20, leagueMatches: 38, style: "Equilibrio e intensita" },
  "Serie C": { name: "Serie C", shortName: "Serie C", strength: 56, clubs: 20, leagueMatches: 38, style: "Duelli, giovani e trasferte difficili" },
  "Serie D": { name: "Serie D", shortName: "Serie D", strength: 45, clubs: 18, leagueMatches: 34, style: "Territorio, fisicita e campi caldi" },
} as const;

export function getLeagueMetadata(country: CountryCode, leagueName?: string): LeagueMetadata {
  return (leagueName ? LEAGUE_METADATA_BY_NAME[leagueName] : undefined) ?? findCountry(country).league;
}

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
  IT: [
    ...makeClubs("IT", "Serie A", "football-data", [
      [108, "Inter", "Torri Milano", 88, 87, 94, "#111827", "#38bdf8"],
      [109, "Juventus", "Reale Torino", 84, 84, 88, "#111827", "#f8fafc"],
      [100, "Roma", "Lupi Capitolini", 83, 82, 87, "#991b1b", "#f59e0b"],
      [113, "Napoli", "Partenope Azzurra", 82, 85, 85, "#0369a1", "#e0f2fe"],
      [99, "Fiorentina", "Giglio Firenze", 78, 81, 76, "#581c87", "#f5d0fe"],
      [107, "Genoa", "Grifoni Genova", 73, 77, 67, "#1e3a8a", "#dc2626"],
      [103, "Bologna", "Emilia Calcio", 69, 79, 58, "#be123c", "#1e3a8a"],
      [5890, "Lecce", "Salento United", 65, 74, 50, "#facc15", "#dc2626"],
    ]),
    // Una selezione trasversale dei tre gironi: club reali, valori da vivaio e
    // calendario da Serie C. Gli id sono soltanto chiavi interne stabili; URL
    // vuoto forza il fallback grafico ed evita di mostrare stemmi non verificati.
    ...makeClubs("IT", "Serie C", "espn", [
      [12001, "Vicenza", "Vicenza", 59, 72, 55, "#ef4444", "#f8fafc", ""],
      [12002, "Cittadella", "Cittadella", 55, 70, 47, "#b91c1c", "#facc15", ""],
      [12003, "Triestina", "Triestina", 53, 69, 48, "#dc2626", "#f8fafc", ""],
      [12004, "Pro Vercelli", "Pro Vercelli", 52, 70, 46, "#f8fafc", "#111827", ""],
      [12005, "Arezzo", "Arezzo", 56, 72, 50, "#facc15", "#b91c1c", ""],
      [12006, "Ascoli", "Ascoli", 57, 71, 54, "#111827", "#f8fafc", ""],
      [12007, "Perugia", "Perugia", 56, 73, 55, "#dc2626", "#f8fafc", ""],
      [12008, "Ternana", "Ternana", 58, 72, 57, "#dc2626", "#16a34a", ""],
      [12009, "Benevento", "Benevento", 59, 74, 58, "#facc15", "#dc2626", ""],
      [12010, "Catania", "Catania", 58, 75, 60, "#2563eb", "#dc2626", ""],
      [12011, "Crotone", "Crotone", 55, 72, 52, "#1d4ed8", "#dc2626", ""],
      [12012, "Foggia", "Foggia", 54, 71, 55, "#dc2626", "#111827", ""],
    ]),
    ...makeClubs("IT", "Serie D", "espn", [
      [12101, "Piacenza", "Piacenza", 48, 68, 45, "#dc2626", "#f8fafc", ""],
      [12102, "Pistoiese", "Pistoiese", 45, 66, 40, "#f97316", "#2563eb", ""],
      [12103, "Prato", "Prato", 44, 67, 39, "#2563eb", "#f8fafc", ""],
      [12104, "Siena", "Siena", 49, 69, 48, "#111827", "#f8fafc", ""],
      [12105, "Grosseto", "Grosseto", 46, 67, 41, "#dc2626", "#f8fafc", ""],
      [12106, "Ancona", "Ancona", 47, 68, 44, "#dc2626", "#f8fafc", ""],
      [12107, "Chieti", "Chieti", 44, 65, 38, "#111827", "#16a34a", ""],
      [12108, "Nocerina", "Nocerina", 46, 67, 43, "#111827", "#dc2626", ""],
      [12109, "Reggina", "Reggina", 49, 70, 52, "#7c3aed", "#f8fafc", ""],
      [12110, "Varese", "Varese", 45, 68, 43, "#dc2626", "#f8fafc", ""],
      [12111, "Martina", "Martina", 43, 66, 36, "#38bdf8", "#f8fafc", ""],
      [12112, "Vigor Senigallia", "Vigor Senigallia", 42, 65, 34, "#dc2626", "#2563eb", ""],
    ]),
  ],
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
    | "decision"
    | "turningPoint"
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

/**
 * Effetti numerici di un singolo ramo decisionale.
 *
 * I delta percentuali sono relativi (es. -20 riduce il rischio del 20%).
 * I modificatori stagionali vengono consumati dalla simulazione successiva;
 * tutti gli altri effetti sono applicati subito allo stato persistito.
 */
export interface CareerDecisionEffects {
  overall: number;
  potential: number;
  reputation: number;
  form: number;
  marketValuePercent: number;
  squadRoleSteps: number;
  seasonPerformance: number;
  seasonGrowth: number;
  injuryRiskPercent: number;
  offerInterest: number;
  contractYears: number;
}

export interface CareerDecisionProbability {
  outcome: CareerDecisionOutcome;
  label: string;
  percentage: number;
  tone: EventTone;
  title: string;
  description: string;
  effects: CareerDecisionEffects;
  /** Testo pronto per una card mobile, derivato dagli stessi delta applicati. */
  effectSummary: string;
}

export interface CareerDecisionOption {
  id: string;
  label: string;
  description: string;
  hint: string;
  trainingChoice?: TrainingChoice;
  probabilities: CareerDecisionProbability[];
}

export interface CareerDecision {
  id: string;
  phase: CareerDecisionPhase;
  seasonIndex: number;
  seasonYear: number;
  title: string;
  description: string;
  context: string;
  options: CareerDecisionOption[];
  /** Le decisioni ritiro usano lo stesso flusso persistente delle altre scelte. */
  kind?: "standard" | "retirement";
}

export interface CareerDecisionResult {
  id: string;
  decisionId: string;
  phase: CareerDecisionPhase;
  seasonIndex: number;
  seasonYear: number;
  optionId: string;
  optionLabel: string;
  outcome: CareerDecisionOutcome;
  outcomeLabel: string;
  probability: number;
  /** Numero intero deterministico compreso fra 1 e 100. */
  roll: number;
  title: string;
  description: string;
  effects: CareerDecisionEffects;
  effectSummary: string;
}

/** Modificatori guadagnati nella PRE e consumati da una sola stagione. */
export interface CareerSeasonPreparation {
  decisionId: string;
  optionId: string;
  outcome: CareerDecisionOutcome;
  seasonIndex: number;
  trainingChoice: TrainingChoice;
  performance: number;
  growth: number;
  injuryRiskPercent: number;
  squadRoleSteps: number;
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
  /** Campi opzionali: i salvataggi creati prima del mondo nazionali restano validi. */
  currentRanking?: number;
  bestRanking?: number;
  captaincyCaps?: number;
  tournamentAppearances?: number;
}

export interface NationalRankingEntry {
  country: CountryCode;
  name: string;
  flag: string;
  rank: number;
  previousRank: number;
  points: number;
  trend: NationalRankingTrend;
  /** Ultimi cinque risultati: 1 vittoria, 0 pareggio, -1 sconfitta. */
  form: number[];
  trophies: number;
}

export interface NationalRankingSnapshot {
  seasonYear: number;
  entries: NationalRankingEntry[];
}

export interface CareerArcImpact {
  overall: number;
  reputation: number;
  form: number;
}

export interface CareerArc {
  id: string;
  type: CareerArcType;
  title: string;
  description: string;
  startedSeason: number;
  lastUpdatedSeason: number;
  status: CareerArcStatus;
  progress: number;
  target: number;
  impact: CareerArcImpact;
}

export interface CareerArchiveSummary {
  id: string;
  playerName: string;
  nationality: CountryCode;
  role: Role;
  startedSeason: number;
  lastSeason: number;
  retiredAtAge: number | null;
  seasons: number;
  clubs: string[];
  overallPeak: number;
  goatScore: number;
  appearances: number;
  goals: number;
  assists: number;
  trophies: number;
  nationalCaps: number;
  archivedAt: string;
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
  nationalTeamRank?: number;
  nationalTeamRankChange?: number;
  nationalCompetition?: string | null;
  nationalResult?: string | null;
  careerArcId?: string | null;
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
  /** Campi opzionali per leggere senza migrazione distruttiva i salvataggi v1. */
  pendingDecision?: CareerDecision | null;
  queuedDecision?: CareerDecision | null;
  lastDecisionResult?: CareerDecisionResult | null;
  decisionHistory?: CareerDecisionResult[];
  seasonPreparation?: CareerSeasonPreparation | null;
  /** Blocca la POST finche il riepilogo della stagione non e stato visto. */
  pendingSeasonReportId?: string | null;
  /** Offerte generate a fine stagione ma nascoste finche la POST non termina. */
  queuedOffers?: CareerOffer[];
  /** Stato vivo del calcio internazionale, aggiunto senza cambiare la versione v1. */
  nationalRanking?: NationalRankingEntry[];
  nationalRankingHistory?: NationalRankingSnapshot[];
  activeCareerArc?: CareerArc | null;
  careerArcHistory?: CareerArc[];
  retirementPlan?: RetirementPlan;
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

const INITIAL_NATIONAL_POINTS: Readonly<Record<CountryCode, number>> = {
  AR: 1875,
  ES: 1870,
  FR: 1860,
  GB: 1815,
  BR: 1800,
  PT: 1775,
  NL: 1755,
  DE: 1745,
  IT: 1725,
};

/** Crea la graduatoria base. Da qui in poi ogni stagione muove tutte le nazionali. */
export function createInitialNationalRanking(): NationalRankingEntry[] {
  return COUNTRY_OPTIONS
    .map((country) => ({
      country: country.code,
      name: country.name,
      flag: country.flag,
      rank: 0,
      previousRank: 0,
      points: INITIAL_NATIONAL_POINTS[country.code],
      trend: "stable" as const,
      form: [] as number[],
      trophies: 0,
    }))
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({ ...entry, rank: index + 1, previousRank: index + 1 }));
}

function normalizeNationalRanking(entries?: readonly NationalRankingEntry[]): NationalRankingEntry[] {
  if (!entries || entries.length === 0) return createInitialNationalRanking();
  const byCountry = new Map(entries.map((entry) => [entry.country, entry]));
  return COUNTRY_OPTIONS
    .map((country) => {
      const saved = byCountry.get(country.code);
      return {
        country: country.code,
        name: country.name,
        flag: country.flag,
        rank: saved?.rank ?? 99,
        previousRank: saved?.previousRank ?? saved?.rank ?? 99,
        points: Math.round(saved?.points ?? INITIAL_NATIONAL_POINTS[country.code]),
        trend: saved?.trend ?? "stable",
        form: (saved?.form ?? []).slice(-5).map((result) => clamp(Math.trunc(result), -1, 1)),
        trophies: Math.max(0, Math.trunc(saved?.trophies ?? 0)),
      } satisfies NationalRankingEntry;
    })
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      previousRank: clamp(entry.previousRank, 1, COUNTRY_OPTIONS.length),
      trend: entry.previousRank > index + 1 ? "up" as const : entry.previousRank < index + 1 ? "down" as const : "stable" as const,
    }));
}

function evolveNationalRanking(
  state: CareerState,
  rng: SeededRandom,
  playerCaps: number,
  playerCompetition: string | null,
  playerResult: string | null,
): { ranking: NationalRankingEntry[]; rank: number; rankChange: number } {
  const previous = normalizeNationalRanking(state.nationalRanking);
  const tournamentSeason = playerCompetition !== null && playerCompetition !== "Qualificazioni internazionali";
  const evolved = previous.map((entry) => {
    const strength = clamp((entry.points - 1660) / 250, 0.18, 0.92);
    const matches = tournamentSeason ? 7 : 5;
    const results = Array.from({ length: matches }, () => {
      const roll = rng.next();
      const winChance = clamp(0.31 + strength * 0.42 + rng.between(-0.08, 0.08), 0.2, 0.82);
      if (roll < winChance) return 1;
      if (roll < winChance + 0.23) return 0;
      return -1;
    });
    const wins = results.filter((result) => result === 1).length;
    const losses = results.filter((result) => result === -1).length;
    const playerBonus = entry.country === state.player.nationality
      ? Math.min(9, playerCaps) + (playerResult === "Vincitore" ? 28 : playerResult === "Finale" ? 12 : 0)
      : 0;
    const worldShock = rng.chance(0.11) ? rng.int(-18, 19) : rng.int(-7, 8);
    const pointsDelta = (wins - losses) * 6 + playerBonus + worldShock;
    return {
      ...entry,
      previousRank: entry.rank,
      points: clamp(Math.round(entry.points + pointsDelta), 1450, 2050),
      form: [...entry.form, ...results].slice(-5),
      trophies: entry.trophies,
    };
  });
  const winners = new Set<CountryCode>();
  if (tournamentSeason) {
    if (playerResult === "Vincitore") winners.add(state.player.nationality);
    const playerWasEliminated = playerResult !== null && playerResult !== "Non convocato" && playerResult !== "Vincitore";
    const topCandidate = (entries: NationalRankingEntry[]): CountryCode => {
      const eligible = playerWasEliminated
        ? entries.filter((entry) => entry.country !== state.player.nationality)
        : entries;
      const pool = eligible.length > 0 ? eligible : entries;
      return rng.pick([...pool].sort((left, right) => right.points - left.points).slice(0, Math.min(4, pool.length))).country;
    };
    if (playerCompetition === "Coppa del Mondo") {
      if (winners.size === 0) winners.add(topCandidate(evolved));
    } else {
      const southAmerica = evolved.filter((entry) => entry.country === "BR" || entry.country === "AR");
      const europe = evolved.filter((entry) => entry.country !== "BR" && entry.country !== "AR");
      if (![...winners].some((country) => country === "BR" || country === "AR")) winners.add(topCandidate(southAmerica));
      if (![...winners].some((country) => country !== "BR" && country !== "AR")) winners.add(topCandidate(europe));
    }
  }
  const ranking = evolved
    .map((entry) => ({ ...entry, trophies: entry.trophies + (winners.has(entry.country) ? 1 : 0) }))
    .sort((left, right) => right.points - left.points || left.country.localeCompare(right.country))
    .map((entry, index): NationalRankingEntry => ({
      ...entry,
      rank: index + 1,
      trend: entry.previousRank > index + 1 ? "up" : entry.previousRank < index + 1 ? "down" : "stable",
    }));
  const playerEntry = ranking.find((entry) => entry.country === state.player.nationality) ?? ranking[ranking.length - 1];
  return {
    ranking,
    rank: playerEntry.rank,
    rankChange: playerEntry.previousRank - playerEntry.rank,
  };
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
          // Una promozione o retrocessione e parte del salvataggio e non deve
          // essere annullata quando aggiorniamo stemma e metadati catalogo.
          league: LEAGUE_METADATA_BY_NAME[state.currentClub.league]
            ? state.currentClub.league
            : currentClubDefinition.league,
          rating: state.currentClub.rating ?? currentClubDefinition.rating,
          prestige: state.currentClub.prestige ?? currentClubDefinition.prestige,
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

  const upgradeOffer = (offer: CareerOffer): CareerOffer => {
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
  };
  const pendingOffers = state.pendingOffers.map(upgradeOffer);
  const queuedOffers = (state.queuedOffers ?? []).map(upgradeOffer);

  const seasons = state.seasons.map((season): CareerSeason => {
    const club = findClub(season.clubName);
    return {
      ...season,
      clubName: club?.name ?? upgradeCatalogText(season.clubName),
      country: club?.country ?? season.country,
      league: LEGACY_LEAGUE_NAMES[season.league] ?? season.league ?? club?.league ?? currentLeague(season.country, season.league),
      trophies: season.trophies.map(upgradeCatalogText),
      awards: season.awards.map(upgradeCatalogText),
      events: season.events.map(upgradeEvent),
    };
  });

  return normalizeCareerDecisionState({
    ...state,
    currentClub,
    pendingOffers,
    queuedOffers,
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
  });
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
  const raw = Math.max(90_000, Math.max(1, overall - 38) ** 2.25 * 2_500);
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

function tournamentSeasonCaps(tournament: boolean, firstCallUp: boolean, rng: SeededRandom): number {
  if (tournament) return rng.int(firstCallUp ? 3 : 4, 9);
  return rng.int(firstCallUp ? 2 : 1, 7);
}

function roleTrainingFit(role: Role, choice: TrainingChoice): number {
  if (choice === "balanced") return 1;
  if (choice === "recovery") return 0.76;
  return ROLE_PROFILES[role].training.includes(choice) ? 1.18 : 0.7;
}

function roleDepartment(role: Role): RoleOption["department"] {
  return ROLE_OPTIONS.find((option) => option.code === role)?.department ?? "Attacco";
}

interface CareerArcSeasonContext {
  averageRating: number;
  overallChange: number;
  injured: boolean;
  appearances: number;
  trophies: number;
}

interface CareerArcEvolution {
  active: CareerArc | null;
  history: CareerArc[];
  impact: CareerArcImpact;
  event: CareerEvent | null;
  arcId: string | null;
}

const EMPTY_ARC_IMPACT: CareerArcImpact = { overall: 0, reputation: 0, form: 0 };

const ARC_COPY: Record<CareerArcType, Omit<CareerArc, "id" | "type" | "startedSeason" | "lastUpdatedSeason" | "status" | "progress">> = {
  breakthrough: { title: "La svolta", description: "Due stagioni solide possono cambiare il livello della carriera.", target: 2, impact: { overall: 1, reputation: 4, form: 6 } },
  comeback: { title: "La risalita", description: "Dopo il momento difficile, ogni buona prestazione pesa il doppio.", target: 2, impact: { overall: 1, reputation: 3, form: 9 } },
  wonderkid: { title: "Predestinato", description: "Il talento attira aspettative: servono prestazioni, non solo promesse.", target: 3, impact: { overall: 1, reputation: 5, form: 5 } },
  lateBloomer: { title: "Esplosione tardiva", description: "La maturita apre una finestra inattesa per salire di livello.", target: 2, impact: { overall: 2, reputation: 3, form: 4 } },
  clubIcon: { title: "Bandiera del club", description: "Continuita e risultati possono trasformarti nel volto della squadra.", target: 3, impact: { overall: 0, reputation: 7, form: 5 } },
  nationalHero: { title: "Sogno azzurro", description: "La nazionale puo diventare il capitolo piu importante della carriera.", target: 2, impact: { overall: 1, reputation: 7, form: 6 } },
  journeyman: { title: "Globetrotter", description: "Ogni nuova maglia aggiunge esperienza, ma rende piu difficile lasciare un segno.", target: 3, impact: { overall: 1, reputation: 5, form: 4 } },
  crisis: { title: "Bivio di carriera", description: "Forma, fiducia e posto in squadra sono in bilico.", target: 2, impact: { overall: 1, reputation: 2, form: 10 } },
};

function createCareerArc(state: CareerState, type: CareerArcType): CareerArc {
  const copy = ARC_COPY[type];
  return {
    id: `arc-${hashString(`${state.id}|${state.seasonIndex}|${type}`).toString(36)}`,
    type,
    ...copy,
    startedSeason: state.seasonIndex,
    lastUpdatedSeason: state.seasonIndex,
    status: "active",
    progress: 0,
  };
}

function chooseCareerArc(state: CareerState, context: CareerArcSeasonContext, rng: SeededRandom): CareerArcType | null {
  const previousClubs = new Set(state.seasons.map((season) => season.clubName));
  const distinctClubs = previousClubs.size + (state.currentClub && !previousClubs.has(state.currentClub.name) ? 1 : 0);
  const clubSeasons = state.currentClub
    ? state.seasons.filter((season) => season.clubName === state.currentClub?.name).length + 1
    : 0;
  if (context.averageRating < 6.2 || (context.injured && context.appearances < 15)) return "crisis";
  if ((state.careerArcHistory ?? []).some((arc) => arc.type === "crisis" && arc.status === "failed")) return "comeback";
  if (state.nationalTeam.caps > 0 && rng.chance(0.42)) return "nationalHero";
  if (clubSeasons >= 4 && rng.chance(0.48)) return "clubIcon";
  if (distinctClubs >= 3 && rng.chance(0.48)) return "journeyman";
  if (state.age <= 20 && context.overallChange >= 2 && rng.chance(0.58)) return "wonderkid";
  if (state.age >= 27 && context.averageRating >= 7.15 && rng.chance(0.5)) return "lateBloomer";
  if (context.averageRating >= 7.25 && rng.chance(0.52)) return "breakthrough";
  return rng.chance(0.16) ? (rng.chance(0.28) ? "crisis" : "breakthrough") : null;
}

function evolveCareerArc(
  state: CareerState,
  context: CareerArcSeasonContext,
  rng: SeededRandom,
  eventIndex: number,
): CareerArcEvolution {
  const history = [...(state.careerArcHistory ?? [])];
  const current = state.activeCareerArc ?? null;
  if (!current) {
    const type = chooseCareerArc(state, context, rng);
    if (!type) return { active: null, history, impact: EMPTY_ARC_IMPACT, event: null, arcId: null };
    const active = createCareerArc(state, type);
    const negative = type === "crisis";
    return {
      active,
      history,
      impact: EMPTY_ARC_IMPACT,
      arcId: active.id,
      event: makeEvent(
        state,
        eventIndex,
        "turningPoint",
        active.title,
        active.description,
        negative ? "negative" : "special",
        negative ? -6 : 5,
      ),
    };
  }

  const positiveStep = current.type === "crisis"
    ? context.averageRating >= 6.75 && !context.injured
    : context.averageRating >= 6.95 || context.trophies > 0 || context.overallChange >= 2;
  const hardSetback = context.averageRating < 6.15 || (context.injured && context.appearances < 12);
  if (hardSetback && rng.chance(current.type === "crisis" ? 0.58 : 0.36)) {
    const failed: CareerArc = {
      ...current,
      lastUpdatedSeason: state.seasonIndex,
      status: "failed",
      impact: { overall: -1, reputation: -2, form: -8 },
    };
    return {
      active: null,
      history: [...history, failed].slice(-20),
      impact: failed.impact,
      arcId: failed.id,
      event: makeEvent(state, eventIndex, "turningPoint", "Una porta si chiude", `${current.title}: la svolta non arriva e serve ripartire.`, "negative", -8),
    };
  }

  const progress = clamp(current.progress + (positiveStep ? 1 : 0), 0, current.target);
  if (progress >= current.target) {
    const completed: CareerArc = {
      ...current,
      lastUpdatedSeason: state.seasonIndex,
      status: "completed",
      progress,
    };
    return {
      active: null,
      history: [...history, completed].slice(-20),
      impact: completed.impact,
      arcId: completed.id,
      event: makeEvent(state, eventIndex, "turningPoint", `${current.title}: compiuta`, "Il percorso cambia davvero la traiettoria della carriera.", "special", 10),
    };
  }

  const active: CareerArc = { ...current, progress, lastUpdatedSeason: state.seasonIndex };
  return {
    active,
    history,
    impact: EMPTY_ARC_IMPACT,
    arcId: active.id,
    event: positiveStep
      ? makeEvent(state, eventIndex, "turningPoint", `${current.title}: un passo avanti`, `${progress}/${current.target} tappe completate.`, "positive", 4)
      : makeEvent(state, eventIndex, "turningPoint", `${current.title}: tutto fermo`, "La stagione non basta per avanzare in questo capitolo.", "neutral", 0),
  };
}

interface SeasonTwist {
  impact: CareerArcImpact;
  event: CareerEvent | null;
}

function rollSeasonTwist(state: CareerState, rng: SeededRandom, eventIndex: number): SeasonTwist {
  if (!rng.chance(0.24)) return { impact: EMPTY_ARC_IMPACT, event: null };
  const twists = [
    { title: "Un mentore inatteso", description: "Un veterano ti prende sotto la sua ala e accelera la crescita.", tone: "positive" as const, impact: { overall: 1, reputation: 1, form: 5 } },
    { title: "Cambio in panchina", description: "Il nuovo allenatore azzera le gerarchie e ti costringe a riconquistare fiducia.", tone: "negative" as const, impact: { overall: 0, reputation: -1, form: -8 } },
    { title: "Occasione all'ultimo minuto", description: "Un'assenza apre spazio: sfrutti una chance che sembrava impossibile.", tone: "special" as const, impact: { overall: 0, reputation: 3, form: 7 } },
    { title: "Pressione fuori campo", description: "Una vicenda esterna rompe il ritmo nel momento peggiore.", tone: "negative" as const, impact: { overall: -1, reputation: -2, form: -6 } },
    { title: "Nuovo ruolo", description: "Lo staff scopre una posizione che valorizza qualita rimaste nascoste.", tone: "positive" as const, impact: { overall: 1, reputation: 2, form: 3 } },
  ];
  const chosen = rng.pick(twists);
  return {
    impact: chosen.impact,
    event: makeEvent(state, eventIndex, "turningPoint", chosen.title, chosen.description, chosen.tone, chosen.impact.overall * 4 + chosen.impact.reputation + Math.round(chosen.impact.form / 3)),
  };
}

const EMPTY_DECISION_EFFECTS: CareerDecisionEffects = {
  overall: 0,
  potential: 0,
  reputation: 0,
  form: 0,
  marketValuePercent: 0,
  squadRoleSteps: 0,
  seasonPerformance: 0,
  seasonGrowth: 0,
  injuryRiskPercent: 0,
  offerInterest: 0,
  contractYears: 0,
};

const DECISION_OUTCOME_META: Record<CareerDecisionOutcome, { label: string; tone: EventTone }> = {
  greatSuccess: { label: "Grande riuscita", tone: "special" },
  success: { label: "Riuscita", tone: "positive" },
  neutral: { label: "Esito neutro", tone: "neutral" },
  failure: { label: "Fallimento", tone: "negative" },
};

const SQUAD_ROLE_ORDER: readonly SquadRole[] = ["prospect", "rotation", "starter", "star"];

function decisionEffects(overrides: Partial<CareerDecisionEffects> = {}): CareerDecisionEffects {
  return { ...EMPTY_DECISION_EFFECTS, ...overrides };
}

function signed(value: number, suffix: string): string {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

/** Restituisce la descrizione compatta degli stessi delta applicati dal motore. */
export function describeCareerDecisionEffects(effects: CareerDecisionEffects): string {
  const parts: string[] = [];
  if (effects.overall) parts.push(signed(effects.overall, " OVR"));
  if (effects.potential) parts.push(signed(effects.potential, " POT"));
  if (effects.reputation) parts.push(signed(effects.reputation, " reputazione"));
  if (effects.form) parts.push(signed(effects.form, " forma"));
  if (effects.marketValuePercent) parts.push(signed(effects.marketValuePercent, "% valore"));
  if (effects.squadRoleSteps) {
    parts.push(effects.squadRoleSteps > 0 ? "+1 livello titolarità" : "-1 livello titolarità");
  }
  if (effects.seasonPerformance) parts.push(signed(round(effects.seasonPerformance, 2), " rendimento"));
  if (effects.seasonGrowth) parts.push(signed(round(effects.seasonGrowth, 2), " crescita"));
  if (effects.injuryRiskPercent) parts.push(signed(effects.injuryRiskPercent, "% rischio infortunio"));
  if (effects.offerInterest) parts.push(signed(effects.offerInterest, " interesse mercato"));
  if (effects.contractYears) parts.push(signed(effects.contractYears, " anno contratto"));
  return parts.length > 0 ? parts.join(" · ") : "Nessuna variazione";
}

function probabilityBranch(
  outcome: CareerDecisionOutcome,
  percentage: number,
  title: string,
  description: string,
  effects: CareerDecisionEffects,
): CareerDecisionProbability {
  const meta = DECISION_OUTCOME_META[outcome];
  return {
    outcome,
    label: percentage === 100 ? "Conseguenza certa" : meta.label,
    percentage,
    tone: meta.tone,
    title,
    description,
    effects,
    effectSummary: describeCareerDecisionEffects(effects),
  };
}

function validateDecisionOptions(options: readonly CareerDecisionOption[]): void {
  for (const option of options) {
    const total = option.probabilities.reduce((sum, item) => sum + item.percentage, 0);
    if (total !== 100 || option.probabilities.some((item) => !Number.isInteger(item.percentage) || item.percentage < 0)) {
      throw new Error(`Le probabilità di ${option.id} devono essere interi non negativi con somma 100.`);
    }
  }
}

function shiftSquadRole(role: SquadRole, steps: number): SquadRole {
  const index = SQUAD_ROLE_ORDER.indexOf(role);
  return SQUAD_ROLE_ORDER[clamp(index + Math.trunc(steps), 0, SQUAD_ROLE_ORDER.length - 1)] as SquadRole;
}

export function getProjectedSquadRole(
  state: Pick<CareerState, "overall" | "currentClub">,
  preparationSteps = 0,
): SquadRole | null {
  if (!state.currentClub) return null;
  return shiftSquadRole(squadRoleFor(state.overall, state.currentClub.rating), preparationSteps);
}

function specialistTrainingFor(role: Role): TrainingChoice {
  return ROLE_PROFILES[role].training[0] ?? "balanced";
}

function createPreSeasonDecision(state: CareerState): CareerDecision {
  if (!state.currentClub) throw new Error("Serve un club per creare la scelta di inizio stagione.");
  const readiness = clamp(Math.round((state.form - 50) / 12) - Math.max(0, state.age - 31), -10, 10);
  const campSuccess = clamp(60 + readiness, 45, 75);
  const individualGreat = clamp(22 + Math.round((state.potential - state.overall) / 7), 20, 30);
  const individualFailure = clamp(15 + Math.max(0, state.age - 30) * 2 - Math.round((state.form - 50) / 15), 8, 28);
  const individualNeutral = 15;
  const individualSuccess = 100 - individualGreat - individualNeutral - individualFailure;
  const specialist = specialistTrainingFor(state.player.role);
  const id = `decision-pre-${hashString(`${state.id}|${state.seasonIndex}|${state.currentClub.id}`).toString(36)}`;

  const options: CareerDecisionOption[] = [
    {
      id: `${id}-ritiro`,
      label: "Partecipa al ritiro",
      description: "Affronta il ritiro con la nuova rosa e prova a convincere subito lo staff.",
      hint: "Scelta diretta: puoi guadagnare o perdere un punto OVR.",
      trainingChoice: "balanced",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "Ritiro perfetto", "Superi ogni aspettativa dello staff.", decisionEffects({ overall: 2, form: 12, squadRoleSteps: 1, seasonPerformance: 0.14, seasonGrowth: 0.7, injuryRiskPercent: -10 })),
        probabilityBranch("success", campSuccess, "Ritiro riuscito", "Il lavoro estivo ti fa partire un passo avanti.", decisionEffects({ overall: 1, form: 8, seasonPerformance: 0.08, seasonGrowth: 0.4, injuryRiskPercent: -5 })),
        probabilityBranch("neutral", 0, "Ritiro regolare", "Il ritiro non cambia le gerarchie.", decisionEffects()),
        probabilityBranch("failure", 100 - campSuccess, "Ritiro complicato", "Carichi e pressione ti fanno perdere terreno.", decisionEffects({ overall: -1, form: -8, squadRoleSteps: -1, seasonPerformance: -0.08, seasonGrowth: -0.35, injuryRiskPercent: 20 })),
      ],
    },
    {
      id: `${id}-personale`,
      label: "Preparazione personale",
      description: "Segui un programma specifico per il tuo ruolo, con un tetto più alto ma più rischio.",
      hint: "Quattro esiti possibili, dal salto di qualità al sovraccarico.",
      trainingChoice: specialist,
      probabilities: [
        probabilityBranch("greatSuccess", individualGreat, "Salto di qualità", "Il programma su misura trasforma un tuo punto debole in un'arma.", decisionEffects({ overall: 2, potential: 1, reputation: 2, form: 12, marketValuePercent: 10, seasonPerformance: 0.2, seasonGrowth: 1.1, injuryRiskPercent: 5 })),
        probabilityBranch("success", individualSuccess, "Lavoro ripagato", "Arrivi alla prima giornata più pronto e sicuro.", decisionEffects({ overall: 1, reputation: 1, form: 7, marketValuePercent: 5, seasonPerformance: 0.12, seasonGrowth: 0.65, injuryRiskPercent: 8 })),
        probabilityBranch("neutral", individualNeutral, "Progressi limitati", "Il lavoro è utile, ma non cambia ancora il tuo livello.", decisionEffects({ form: 2, seasonPerformance: 0.03, seasonGrowth: 0.15, injuryRiskPercent: 10 })),
        probabilityBranch("failure", individualFailure, "Carico eccessivo", "Il programma è troppo intenso e lascia scorie.", decisionEffects({ overall: -1, reputation: -1, form: -10, marketValuePercent: -6, seasonPerformance: -0.12, seasonGrowth: -0.55, injuryRiskPercent: 30 })),
      ],
    },
    {
      id: `${id}-salta`,
      label: "Salta il ritiro",
      description: "Recuperi energie, ma perdi inevitabilmente terreno nelle gerarchie.",
      hint: "Esito certo: nessun tiro nascosto.",
      trainingChoice: "recovery",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "Nessun bonus", "Saltare il ritiro non può produrre una grande riuscita.", decisionEffects()),
        probabilityBranch("success", 0, "Nessun bonus", "Saltare il ritiro non migliora la posizione in squadra.", decisionEffects()),
        probabilityBranch("neutral", 100, "Gerarchie perse", "Lo staff premia chi ha lavorato con il gruppo.", decisionEffects({ form: 4, squadRoleSteps: -1, seasonPerformance: -0.08, injuryRiskPercent: -25 })),
        probabilityBranch("failure", 0, "Nessun rischio casuale", "La conseguenza è già nota prima della scelta.", decisionEffects()),
      ],
    },
  ];
  validateDecisionOptions(options);
  return {
    id,
    phase: "preSeason",
    seasonIndex: state.seasonIndex,
    seasonYear: state.seasonYear,
    title: `Ritiro con ${state.currentClub.name}`,
    description: "Come vuoi preparare la nuova stagione? Ogni conseguenza è visibile prima della scelta.",
    context: `${state.seasonYear}/${String(state.seasonYear + 1).slice(-2)} · ${state.age} anni`,
    options,
  };
}

function createPostSeasonDecision(state: CareerState, season: CareerSeason): CareerDecision {
  if (!state.currentClub) throw new Error("Serve un club per creare la scelta di fine stagione.");
  const highRiskSuccess = clamp(50 + Math.round((season.averageRating - 7) * 6) - Math.max(0, state.age - 31), 38, 62);
  const mediaSuccess = clamp(48 + Math.round((season.averageRating - 6.8) * 5), 38, 62);
  const agentGreat = clamp(18 + Math.round(state.reputation / 20), 18, 23);
  const agentFailure = clamp(16 - Math.round(state.reputation / 25), 12, 16);
  const agentNeutral = 20;
  const agentSuccess = 100 - agentGreat - agentNeutral - agentFailure;
  const id = `decision-post-${hashString(`${state.id}|${season.id}|${state.currentClub.id}`).toString(36)}`;

  const options: CareerDecisionOption[] = [
    {
      id: `${id}-extra`,
      label: "Allenamento extra",
      description: "Rinunci alle vacanze per tentare un salto immediato di livello.",
      hint: "Alto rischio: il premio è +3 OVR, l'insuccesso costa -1 OVR.",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "Nessun esito nascosto", "Questa scelta ha due soli risultati possibili.", decisionEffects()),
        probabilityBranch("success", highRiskSuccess, "Estate straordinaria", "Il lavoro extra produce un miglioramento fuori scala.", decisionEffects({ overall: 3, potential: 1, reputation: 2, form: 5, marketValuePercent: 12 })),
        probabilityBranch("neutral", 0, "Nessun pareggio", "Questa scelta ha due soli risultati possibili.", decisionEffects()),
        probabilityBranch("failure", 100 - highRiskSuccess, "Sovraccarico", "Senza recupero il fisico presenta il conto.", decisionEffects({ overall: -1, form: -12, reputation: -1, marketValuePercent: -7 })),
      ],
    },
    {
      id: `${id}-recupero`,
      label: "Stacca e recupera",
      description: "Scegli un'estate controllata per ritrovare energie senza rischiare.",
      hint: "Esito certo e contenuto.",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "Nessun bonus casuale", "Il recupero ha un effetto noto.", decisionEffects()),
        probabilityBranch("success", 100, "Batterie ricaricate", "Il riposo programmato restituisce lucidità e forma.", decisionEffects({ form: 8, marketValuePercent: 2 })),
        probabilityBranch("neutral", 0, "Nessun esito neutro", "Il recupero produce sempre il beneficio dichiarato.", decisionEffects()),
        probabilityBranch("failure", 0, "Nessun rischio", "Questa opzione non può fallire.", decisionEffects()),
      ],
    },
    {
      id: `${id}-media`,
      label: "Spingi la tua immagine",
      description: "Usa il momento per aumentare reputazione e valore commerciale.",
      hint: "Più visibilità, ma una campagna sbagliata può distrarti.",
      probabilities: [
        probabilityBranch("greatSuccess", 12, "Volto della stagione", "La campagna diventa virale e ti porta in una nuova dimensione.", decisionEffects({ reputation: 6, form: 3, marketValuePercent: 16 })),
        probabilityBranch("success", mediaSuccess, "Immagine in crescita", "Sponsor e tifosi rispondono bene.", decisionEffects({ reputation: 3, marketValuePercent: 8 })),
        probabilityBranch("neutral", Math.max(0, 100 - 12 - mediaSuccess - 14), "Campagna tiepida", "La visibilità cresce senza cambiare davvero la carriera.", decisionEffects({ reputation: 1, form: -1, marketValuePercent: 2 })),
        probabilityBranch("failure", 14, "Distrazione mediatica", "Le iniziative fuori campo irritano staff e tifosi.", decisionEffects({ reputation: -3, form: -6, marketValuePercent: -6 })),
      ],
    },
    state.agentEnabled
      ? {
          id: `${id}-agente`,
          label: "Chiama il tuo agente",
          description: "Muovi il mercato e prova ad alzare l'interesse dei club.",
          hint: "L'esito modifica concretamente le offerte accodate.",
          probabilities: [
            probabilityBranch("greatSuccess", agentGreat, "Asta internazionale", "Più club entrano in corsa e l'interesse sale.", decisionEffects({ reputation: 3, marketValuePercent: 8, offerInterest: 24 })),
            probabilityBranch("success", agentSuccess, "Contatti utili", "Il tuo agente apre porte interessanti.", decisionEffects({ reputation: 1, marketValuePercent: 4, offerInterest: 14 })),
            probabilityBranch("neutral", agentNeutral, "Sondaggi senza offerta", "I contatti non cambiano il mercato.", decisionEffects({ offerInterest: 3 })),
            probabilityBranch("failure", agentFailure, "Mossa controproducente", "Il rumore di mercato indebolisce la tua posizione.", decisionEffects({ reputation: -2, form: -4, marketValuePercent: -5, offerInterest: -12 })),
          ],
        }
      : {
          id: `${id}-fedelta`,
          label: "Conferma la fiducia al club",
          description: "Senza agente, scegli stabilità e continuità con la società.",
          hint: "Esito certo: rinnovo e piccolo bonus reputazione.",
          probabilities: [
            probabilityBranch("greatSuccess", 0, "Nessun bonus casuale", "La conseguenza è già nota.", decisionEffects()),
            probabilityBranch("success", 100, "Patto rinnovato", "Club e tifosi apprezzano la scelta di continuità.", decisionEffects({ reputation: 1, form: 3, contractYears: 1 })),
            probabilityBranch("neutral", 0, "Nessun esito neutro", "La scelta produce sempre l'effetto dichiarato.", decisionEffects()),
            probabilityBranch("failure", 0, "Nessun rischio", "Questa scelta non può fallire.", decisionEffects()),
          ],
        },
  ];
  validateDecisionOptions(options);
  return {
    id,
    phase: "postSeason",
    seasonIndex: season.index,
    seasonYear: season.year,
    title: "Come chiudi la stagione?",
    description: "Scegli come usare l'estate. Percentuali ed effetti sono dichiarati prima del tiro.",
    context: `${season.clubName} · voto ${season.averageRating.toFixed(2)} · ${season.appearances} presenze`,
    options,
    kind: "standard",
  };
}

function createRetirementDecision(state: CareerState, season: CareerSeason): CareerDecision {
  const id = `decision-retirement-${hashString(`${state.id}|${season.id}|40`).toString(36)}`;
  const options: CareerDecisionOption[] = [
    {
      id: `${id}-ritirati`,
      label: "Chiudi a 40 anni",
      description: "Saluta ora il calcio giocato e consegna questa carriera all'archivio.",
      hint: "Scelta definitiva: la carriera termina adesso.",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "", "", decisionEffects()),
        probabilityBranch("success", 100, "L'ultima partita", "Hai scelto il momento giusto per salutare.", decisionEffects({ reputation: 2 })),
        probabilityBranch("neutral", 0, "", "", decisionEffects()),
        probabilityBranch("failure", 0, "", "", decisionEffects()),
      ],
    },
    {
      id: `${id}-continua`,
      label: "Continua fino a 42",
      description: "Accetta altre due stagioni: il ritiro arrivera obbligatoriamente a 42 anni.",
      hint: "Nessun ritiro casuale: giocherai al massimo altre due stagioni.",
      probabilities: [
        probabilityBranch("greatSuccess", 0, "", "", decisionEffects()),
        probabilityBranch("success", 100, "La storia continua", "Hai ancora due stagioni per lasciare il segno.", decisionEffects({ form: 5 })),
        probabilityBranch("neutral", 0, "", "", decisionEffects()),
        probabilityBranch("failure", 0, "", "", decisionEffects()),
      ],
    },
  ];
  validateDecisionOptions(options);
  return {
    id,
    phase: "postSeason",
    kind: "retirement",
    seasonIndex: season.index,
    seasonYear: season.year,
    title: "Il momento della scelta",
    description: "A 40 anni decidi tu: chiudere ora oppure continuare fino a 42.",
    context: `${state.player.displayName} · ${state.seasons.length} stagioni`,
    options,
  };
}

/**
 * Inizializza i nuovi campi e crea la PRE mancante nei salvataggi precedenti.
 * La funzione e pura e idempotente: non risolve scelte e non consuma casualita.
 */
export function normalizeCareerDecisionState(state: CareerState): CareerState {
  const nationalRanking = normalizeNationalRanking(state.nationalRanking);
  const playerNation = nationalRanking.find((entry) => entry.country === state.player.nationality);
  const retirementPlan: RetirementPlan = state.retirementPlan
    ?? (state.stage === "retired"
      ? (state.retiredAtAge !== null && state.retiredAtAge > 40 ? "continueTo42" : "retireAt40")
      : "undecided");
  const normalized: CareerState = {
    ...state,
    nationalTeam: {
      ...state.nationalTeam,
      currentRanking: state.nationalTeam.currentRanking ?? playerNation?.rank ?? COUNTRY_OPTIONS.length,
      bestRanking: state.nationalTeam.bestRanking ?? playerNation?.rank ?? COUNTRY_OPTIONS.length,
      captaincyCaps: state.nationalTeam.captaincyCaps ?? 0,
      tournamentAppearances: state.nationalTeam.tournamentAppearances ?? 0,
    },
    pendingDecision: state.pendingDecision ?? null,
    queuedDecision: state.queuedDecision ?? null,
    lastDecisionResult: state.lastDecisionResult ?? null,
    decisionHistory: state.decisionHistory ?? [],
    seasonPreparation: state.seasonPreparation ?? null,
    pendingSeasonReportId: state.pendingSeasonReportId ?? null,
    queuedOffers: state.queuedOffers ?? [],
    nationalRanking,
    nationalRankingHistory: (state.nationalRankingHistory ?? []).slice(-20),
    activeCareerArc: state.activeCareerArc ?? null,
    careerArcHistory: (state.careerArcHistory ?? []).slice(-20),
    retirementPlan,
  };

  if (
    normalized.stage === "active" &&
    normalized.age === 40 &&
    normalized.retirementPlan === "undecided" &&
    !normalized.pendingDecision &&
    !normalized.queuedDecision &&
    !normalized.lastDecisionResult &&
    !normalized.pendingSeasonReportId &&
    normalized.pendingOffers.length === 0 &&
    normalized.seasons.length > 0
  ) {
    const lastSeason = normalized.seasons[normalized.seasons.length - 1];
    if (lastSeason) return { ...normalized, pendingDecision: createRetirementDecision(normalized, lastSeason) };
  }

  if (
    normalized.stage === "active" &&
    normalized.currentClub &&
    !normalized.pendingDecision &&
    !normalized.queuedDecision &&
    !normalized.lastDecisionResult &&
    !normalized.pendingSeasonReportId &&
    normalized.pendingOffers.length === 0 &&
    (normalized.queuedOffers?.length ?? 0) === 0 &&
    normalized.seasonPreparation?.seasonIndex !== normalized.seasonIndex
  ) {
    return { ...normalized, pendingDecision: createPreSeasonDecision(normalized) };
  }
  return normalized;
}

function applyImmediateDecisionEffects(state: CareerState, effects: CareerDecisionEffects): CareerState {
  const overall = clamp(state.overall + effects.overall, 35, 99);
  const potential = clamp(state.potential + effects.potential, overall, 99);
  const reputation = clamp(state.reputation + effects.reputation, 0, 100);
  const form = clamp(state.form + effects.form, 0, 100);
  const clubRating = state.currentClub?.rating ?? 66;
  const calculatedValue = calculateMarketValue(overall, state.age, reputation, clubRating);
  const marketValue = state.stage === "retired"
    ? 0
    : roundMoney(calculatedValue * (1 + effects.marketValuePercent / 100));
  const currentClub = state.currentClub
    ? {
        ...state.currentClub,
        squadRole: shiftSquadRole(state.currentClub.squadRole, effects.squadRoleSteps),
        contractUntil: effects.contractYears > 0
          ? Math.max(state.currentClub.contractUntil, state.seasonYear) + effects.contractYears
          : state.currentClub.contractUntil,
      }
    : null;
  const queuedOffers = (state.queuedOffers ?? []).map((offer) => ({
    ...offer,
    interest: clamp(offer.interest + effects.offerInterest, 1, 99),
  }));
  return { ...state, overall, potential, reputation, form, marketValue, currentClub, queuedOffers };
}

function makeDecisionMarketOffers(state: CareerState, decisionId: string, count: number): CareerOffer[] {
  if (!state.currentClub || state.stage === "retired" || count <= 0) return [];
  const rng = new SeededRandom(`${state.seed}|decision-market|${decisionId}|${state.overall}|${state.reputation}`);
  const alreadyOffered = new Set((state.queuedOffers ?? []).map((offer) => offer.clubName.toLocaleLowerCase("it")));
  return ALL_CLUBS
    .filter((club) => club.name !== state.currentClub?.name)
    .filter((club) => !alreadyOffered.has(club.name.toLocaleLowerCase("it")))
    .filter((club) => club.rating >= Math.max(40, state.overall - 5) && club.rating <= Math.min(92, state.overall + 10))
    .map((club) => ({ club, score: Math.abs(club.rating - (state.overall + 3)) + rng.between(0, 12) }))
    .sort((left, right) => left.score - right.score)
    .slice(0, count)
    .map(({ club }, index) => offerFromClub(state, club, 70 + index, false));
}

function applyDecisionMarketOutcome(
  state: CareerState,
  decisionId: string,
  offerInterest: number,
): CareerState {
  const existing = [...(state.queuedOffers ?? [])];
  const additions = offerInterest >= 14
    ? makeDecisionMarketOffers(state, decisionId, offerInterest >= 20 ? 2 : 1).map((offer) => ({
        ...offer,
        interest: clamp(offer.interest + offerInterest, 1, 99),
      }))
    : [];
  const uniqueByClub = new Map<string, CareerOffer>();
  for (const offer of [...existing, ...additions]) {
    const key = offer.clubName.trim().toLocaleLowerCase("it");
    const previous = uniqueByClub.get(key);
    if (!previous || offer.interest > previous.interest) uniqueByClub.set(key, offer);
  }

  let offers = [...uniqueByClub.values()].sort((left, right) => right.interest - left.interest);
  if (offerInterest < 0 && offers.length > 0) {
    // Un contatto andato male fa ritirare la proposta meno convinta.
    offers = offers.slice(0, offers.length - 1);
  }
  return { ...state, queuedOffers: offers.slice(0, 4) };
}

function selectDecisionBranch(
  state: CareerState,
  decision: CareerDecision,
  option: CareerDecisionOption,
): { branch: CareerDecisionProbability; roll: number } {
  const rng = new SeededRandom(`${state.seed}|decision-roll|${decision.id}|${option.id}`);
  const roll = rng.int(1, 100);
  let cumulative = 0;
  for (const branch of option.probabilities) {
    cumulative += branch.percentage;
    if (roll <= cumulative) return { branch, roll };
  }
  throw new Error("Le probabilità della scelta non coprono il tiro.");
}

/** Risolve una scelta una sola volta; ripetere gli stessi input restituisce lo stesso risultato. */
export function resolveCareerDecision(
  rawState: CareerState,
  decisionId: string,
  optionId: string,
): { state: CareerState; result: CareerDecisionResult } {
  const state = normalizeCareerDecisionState(rawState);
  const previous = (state.decisionHistory ?? []).find((item) => item.decisionId === decisionId);
  if (previous) {
    if (previous.optionId !== optionId) throw new Error("Questa scelta è già stata risolta con un'altra opzione.");
    return { state, result: previous };
  }
  const decision = state.pendingDecision;
  if (!decision || decision.id !== decisionId) throw new Error("Questa decisione non è più disponibile.");
  const option = decision.options.find((item) => item.id === optionId);
  if (!option) throw new Error("Opzione non valida.");
  const { branch, roll } = selectDecisionBranch(state, decision, option);
  const result: CareerDecisionResult = {
    id: `result-${hashString(`${decision.id}|${option.id}|${branch.outcome}`).toString(36)}`,
    decisionId: decision.id,
    phase: decision.phase,
    seasonIndex: decision.seasonIndex,
    seasonYear: decision.seasonYear,
    optionId: option.id,
    optionLabel: option.label,
    outcome: branch.outcome,
    outcomeLabel: branch.label,
    probability: branch.percentage,
    roll,
    title: branch.title,
    description: branch.description,
    effects: branch.effects,
    effectSummary: branch.effectSummary,
  };

  let next = applyImmediateDecisionEffects(state, branch.effects);
  if (decision.kind === "retirement") {
    const retiresNow = option.id.endsWith("-ritirati");
    next = retiresNow
      ? {
          ...next,
          stage: "retired",
          retirementPlan: "retireAt40",
          retiredAtAge: state.age,
          marketValue: 0,
          seasons: state.seasons.map((season) => season.index === decision.seasonIndex
            ? { ...season, retiredAfterSeason: true }
            : season),
          pendingOffers: [],
          queuedOffers: [],
          queuedDecision: null,
        }
      : {
          ...next,
          retirementPlan: "continueTo42",
        };
  } else if (decision.phase === "preSeason") {
    next = {
      ...next,
      seasonPreparation: {
        decisionId: decision.id,
        optionId: option.id,
        outcome: branch.outcome,
        seasonIndex: state.seasonIndex,
        trainingChoice: option.trainingChoice ?? "balanced",
        performance: branch.effects.seasonPerformance,
        growth: branch.effects.seasonGrowth,
        injuryRiskPercent: branch.effects.injuryRiskPercent,
        squadRoleSteps: branch.effects.squadRoleSteps,
      },
    };
  } else if (state.agentEnabled && branch.effects.offerInterest !== 0) {
    next = applyDecisionMarketOutcome(next, decision.id, branch.effects.offerInterest);
  }

  const decisionEvent = makeEvent(
    {
      id: state.id,
      seasonIndex: decision.seasonIndex,
      age: decision.phase === "postSeason" ? Math.max(14, state.age - 1) : state.age,
    },
    state.feed.length + (state.decisionHistory?.length ?? 0) + 1,
    decision.kind === "retirement" && option.id.endsWith("-ritirati") ? "retirement" : "decision",
    result.title,
    `${result.description} ${result.effectSummary}.`,
    branch.tone,
    branch.effects.overall + branch.effects.reputation + Math.round(branch.effects.form / 4),
  );
  next = {
    ...next,
    pendingDecision: null,
    lastDecisionResult: result,
    decisionHistory: [...(state.decisionHistory ?? []), result].slice(-80),
    feed: [decisionEvent, ...state.feed].slice(0, 40),
  };
  return { state: next, result };
}

/**
 * Conferma la schermata esito. La PRE abilita la simulazione; la POST sblocca
 * il mercato oppure crea immediatamente la PRE dell'anno successivo.
 */
export function continueCareerDecision(rawState: CareerState, decisionId: string): CareerState {
  const state = normalizeCareerDecisionState(rawState);
  const result = state.lastDecisionResult;
  if (!result) {
    if ((state.decisionHistory ?? []).some((item) => item.decisionId === decisionId)) return state;
    throw new Error("Non c'è un esito da confermare.");
  }
  if (result.decisionId !== decisionId) throw new Error("L'esito non appartiene a questa decisione.");
  let next: CareerState = { ...state, lastDecisionResult: null };
  if (result.phase === "preSeason") return next;
  if (next.stage === "retired") {
    return { ...next, pendingOffers: [], queuedOffers: [], pendingDecision: null, queuedDecision: null };
  }
  const offers = next.queuedOffers ?? [];
  next = { ...next, queuedOffers: [], pendingOffers: offers };
  return offers.length > 0 ? next : normalizeCareerDecisionState(next);
}

/** Rende visibile la POST soltanto dopo che il report stagionale e stato letto. */
export function acknowledgeSeasonReport(rawState: CareerState, seasonId: string): CareerState {
  const state = normalizeCareerDecisionState(rawState);
  if (!state.pendingSeasonReportId) {
    if (state.seasons.some((season) => season.id === seasonId)) return state;
    throw new Error("Report stagionale non disponibile.");
  }
  if (state.pendingSeasonReportId !== seasonId) throw new Error("Questo non è il report in attesa.");
  if (state.stage === "retired" && !state.queuedDecision) {
    return { ...state, pendingSeasonReportId: null };
  }
  if (!state.queuedDecision || state.queuedDecision.phase !== "postSeason") {
    throw new Error("La decisione di fine stagione non è disponibile.");
  }
  return {
    ...state,
    pendingSeasonReportId: null,
    pendingDecision: state.queuedDecision,
    queuedDecision: null,
  };
}

/** Rifiuta tutte le offerte e apre la PRE della nuova stagione. */
export function declineTransferOffers(rawState: CareerState): CareerState {
  const state = normalizeCareerDecisionState(rawState);
  if (state.stage !== "active" || !state.currentClub) throw new Error("Non puoi gestire offerte in questo momento.");
  if (state.pendingDecision || state.lastDecisionResult || state.pendingSeasonReportId) {
    throw new Error("Completa prima la decisione di fine stagione.");
  }
  if (state.pendingOffers.length === 0) return normalizeCareerDecisionState(state);
  return normalizeCareerDecisionState({ ...state, pendingOffers: [] });
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

  // Tutte le storie partono dallo stesso livello: la differenza la fanno
  // potenziale, scelte e svolte successive, non un tiro nascosto iniziale.
  const overall = 40;
  const potentialBonus = input.gameMode === "legend" ? rng.int(47, 56) : rng.int(38, 52);
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
      currentRanking: createInitialNationalRanking().find((entry) => entry.country === input.nationality)?.rank ?? COUNTRY_OPTIONS.length,
      bestRanking: createInitialNationalRanking().find((entry) => entry.country === input.nationality)?.rank ?? COUNTRY_OPTIONS.length,
      captaincyCaps: 0,
      tournamentAppearances: 0,
    },
    trophyCabinet: [],
    awardCabinet: [],
    goatScore: 0,
    pendingOffers: [],
    feed: [],
    retiredAtAge: null,
    pendingDecision: null,
    queuedDecision: null,
    lastDecisionResult: null,
    decisionHistory: [],
    seasonPreparation: null,
    pendingSeasonReportId: null,
    queuedOffers: [],
    nationalRanking: createInitialNationalRanking(),
    nationalRankingHistory: [],
    activeCareerArc: null,
    careerArcHistory: [],
    retirementPlan: "undecided",
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
  const homeTargetRating = state.player.nationality === "IT" ? 47 : Math.max(58, state.overall + 20);
  const homeClubs = CLUBS_BY_COUNTRY[state.player.nationality]
    .map((club) => ({ club, score: Math.abs(club.rating - homeTargetRating) + rng.between(0, 7) }))
    .sort((a, b) => a.score - b.score)
    .map(({ club }) => club);

  const foreignCountries = rng.shuffled(COUNTRY_OPTIONS.filter((country) => country.code !== state.player.nationality));
  const foreignClubs = foreignCountries
    .flatMap((country) => CLUBS_BY_COUNTRY[country.code])
    .filter((club) => club.rating <= state.overall + 34)
    .map((club) => ({ club, score: Math.abs(club.rating - (state.overall + 22)) + rng.between(0, 10) }))
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

  return normalizeCareerDecisionState({
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
  });
}

function seasonTrophies(
  state: CareerState,
  club: CareerClub,
  leaguePosition: number,
  averageRating: number,
  rng: SeededRandom,
): { trophies: string[]; cupResult: string; continentalResult: string | null } {
  const country = findCountry(club.country);
  const league = getLeagueMetadata(club.country, club.league);
  const trophies: string[] = [];
  if (leaguePosition === 1) trophies.push(league.name);

  const cupChance = clamp(0.06 + (club.rating - league.strength) / 85 + (averageRating - 6.5) * 0.05, 0.03, 0.38);
  const cupRoll = rng.next();
  let cupResult = "Sedicesimi";
  if (cupRoll < cupChance) {
    cupResult = "Vincitore";
    trophies.push(
      club.league === "Serie C"
        ? "Coppa Italia Serie C"
        : club.league === "Serie D"
          ? "Coppa Italia Serie D"
          : club.country === "IT"
            ? "Coppa Italia"
            : `Coppa ${country.name}`,
    );
  } else if (cupRoll < cupChance + 0.13) cupResult = "Finale";
  else if (cupRoll < cupChance + 0.31) cupResult = "Semifinale";
  else if (cupRoll < cupChance + 0.58) cupResult = "Quarti";
  else if (cupRoll < cupChance + 0.82) cupResult = "Ottavi";

  let continentalResult: string | null = null;
  const topDivision = club.country !== "IT" || club.league === "Serie A";
  if (topDivision && (club.prestige >= 72 || state.reputation >= 55)) {
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

  const targetMin = Math.max(40, state.overall - 5);
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

function italianLeagueMovement(
  club: CareerClub,
  leaguePosition: number,
  leagueClubs: number,
  rng: SeededRandom,
): { club: CareerClub; event: "promotion" | "relegation" | null } {
  if (club.country !== "IT") return { club, event: null };
  const promotion: Readonly<Record<string, string>> = { "Serie D": "Serie C", "Serie C": "Serie B", "Serie B": "Serie A" };
  const relegation: Readonly<Record<string, string>> = { "Serie A": "Serie B", "Serie B": "Serie C", "Serie C": "Serie D" };
  const automaticPromotion = leaguePosition === 1 || (club.league === "Serie B" && leaguePosition <= 2);
  const playoffPromotion = leaguePosition <= (club.league === "Serie D" ? 2 : 5) && rng.chance(club.league === "Serie D" ? 0.38 : 0.24);
  const relegated = leaguePosition > leagueClubs - (club.league === "Serie A" ? 3 : 4);
  if (promotion[club.league] && (automaticPromotion || playoffPromotion)) {
    return {
      club: { ...club, league: promotion[club.league] as string, rating: clamp(club.rating + 3, 40, 92), prestige: clamp(club.prestige + 3, 20, 97) },
      event: "promotion",
    };
  }
  if (relegation[club.league] && relegated) {
    return {
      club: { ...club, league: relegation[club.league] as string, rating: clamp(club.rating - 2, 40, 92), prestige: clamp(club.prestige - 2, 20, 97) },
      event: "relegation",
    };
  }
  return { club, event: null };
}

export function simulateNextSeason(
  rawState: CareerState,
  choice?: TrainingChoice,
): { state: CareerState; season: CareerSeason; offers?: CareerOffer[] } {
  const state = normalizeCareerDecisionState(rawState);
  if (state.stage === "retired") throw new Error("La carriera è terminata.");
  if (state.stage !== "active" || !state.currentClub) throw new Error("Scegli una squadra prima di simulare la stagione.");
  if (state.pendingSeasonReportId) throw new Error("Leggi prima il report della stagione appena conclusa.");
  if (state.pendingDecision) throw new Error("Completa prima la scelta di inizio stagione.");
  if (state.lastDecisionResult) throw new Error("Conferma prima l'esito della scelta.");
  if (state.pendingOffers.length > 0 || (state.queuedOffers?.length ?? 0) > 0) {
    throw new Error("Gestisci prima le offerte di mercato.");
  }
  const preparation = state.seasonPreparation;
  if (!preparation || preparation.seasonIndex !== state.seasonIndex) {
    throw new Error("Completa la preparazione prima di simulare la stagione.");
  }
  const trainingChoice = preparation.trainingChoice;
  if (choice && choice !== trainingChoice) throw new Error("L'allenamento è già determinato dalla scelta di inizio stagione.");
  if (!TRAINING_OPTIONS.some((item) => item.code === trainingChoice)) throw new Error("Allenamento non valido.");

  const club = state.currentClub;
  const country = findCountry(club.country);
  const league = getLeagueMetadata(club.country, club.league);
  const profile = ROLE_PROFILES[state.player.role];
  const mode = MODE_CONFIG[state.gameMode];
  const rng = new SeededRandom(`${state.seed}|season|${state.seasonIndex}|${club.name}|${trainingChoice}`);
  const events: CareerEvent[] = [];
  let eventIndex = 0;

  const roleNow = shiftSquadRole(squadRoleFor(state.overall, club.rating), preparation.squadRoleSteps);
  if (roleNow !== club.squadRole) {
    const improved = SQUAD_ROLE_ORDER.indexOf(roleNow) > SQUAD_ROLE_ORDER.indexOf(club.squadRole);
    const labels: Record<SquadRole, string> = { prospect: "prospetto", rotation: "riserva", starter: "titolare", star: "stella" };
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "milestone",
        improved ? "Gerarchie scalate" : "Posto da riconquistare",
        `Lo staff ti considera ora ${labels[roleNow]}: da qui derivano presenze e partenze dal primo minuto.`,
        improved ? "positive" : "negative",
        improved ? 4 : -4,
      ),
    );
  }
  const roleMinutes: Record<SquadRole, number> = { prospect: 0.38, rotation: 0.62, starter: 0.82, star: 0.93 };
  const baseMatches = league.leagueMatches + rng.int(3, club.league === "Serie D" ? 7 : 11);
  const recoveryFactor = trainingChoice === "recovery" ? 0.38 : trainingChoice === "athleticism" ? 1.12 : 1;
  const preparationInjuryFactor = Math.max(0.2, 1 + preparation.injuryRiskPercent / 100);
  const injuryProbability = clamp((0.115 + Math.max(0, state.age - 30) * 0.012) * mode.injury * recoveryFactor * preparationInjuryFactor, 0.015, 0.5);
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
  const hierarchyShock = rng.chance(0.14) ? rng.between(-0.14, 0.14) : 0;
  const appearanceRate = clamp(roleMinutes[roleNow] + competitionBoost + rng.between(-0.09, 0.09) + hierarchyShock, 0.16, 0.98);
  const appearances = clamp(Math.round(availability * appearanceRate), 2, availability);
  const startRate: Record<SquadRole, number> = { prospect: 0.24, rotation: 0.5, starter: 0.78, star: 0.91 };
  const starts = clamp(Math.round(appearances * (startRate[roleNow] + rng.between(-0.1, 0.1))), 0, appearances);
  const minutes = Math.round(starts * rng.between(74, 87) + (appearances - starts) * rng.between(18, 34));

  const trainingFit = roleTrainingFit(state.player.role, trainingChoice);
  const rareFormShock = rng.chance(0.13) ? rng.between(-1.05, 1.05) : 0;
  const formNoise = (rng.next() + rng.next() + rng.next() - 1.5) * 0.85 + rareFormShock;
  const qualityDelta = (state.overall - club.rating) / 24;
  const baseRating = 6.55 + qualityDelta + (state.form - 50) / 85 + (trainingFit - 1) * 0.32 + preparation.performance + formNoise;
  const averageRating = round(clamp(baseRating * mode.performance + (mode.performance - 1) * 2.2, 5.45, 9.42), 2);
  const attackQuality = clamp((state.overall - 48) / 34, 0.35, 1.55) * clamp((averageRating - 5.4) / 1.7, 0.45, 1.7);
  const trainingGoalBoost = trainingChoice === "finishing" ? 1.18 : 1;
  const trainingAssistBoost = trainingChoice === "playmaking" ? 1.18 : 1;
  const goals = sampleCount(rng, appearances * profile.goalRate * attackQuality * trainingGoalBoost, 0.5);
  const assists = sampleCount(rng, appearances * profile.assistRate * attackQuality * trainingAssistBoost, 0.48);
  const teamCleanSheetRate = clamp(0.2 + (club.rating - league.strength) / 95, 0.12, 0.46);
  const cleanSheets = sampleCount(rng, appearances * teamCleanSheetRate * profile.cleanSheetWeight, 0.32);
  const saves = state.player.role === "GK" ? sampleCount(rng, appearances * rng.between(2.35, 3.8), 0.16) : 0;
  const tackles = sampleCount(rng, appearances * profile.tackleRate * (0.88 + attackQuality * 0.16), 0.14);
  const keyPasses = sampleCount(rng, appearances * profile.keyPassRate * trainingAssistBoost, 0.18);
  const contribution = goals * 0.55 + assists * 0.42 + cleanSheets * 0.18 + (averageRating - 6.5) * appearances * 0.3;
  const playerOfTheMatch = sampleCount(rng, Math.max(0, contribution / 8.5), 0.38);
  const disciplineBase = roleDepartment(state.player.role) === "Difesa" ? 0.18 : 0.09;
  const yellowCards = sampleCount(rng, appearances * disciplineBase, 0.35);
  const redCards = rng.chance(clamp(appearances * 0.009, 0.01, 0.28)) ? 1 : 0;

  const leagueRatingSpan = Math.max(14, league.strength - 57);
  const leagueStrengthPosition = 1 + ((league.strength + 4 - club.rating) / leagueRatingSpan) * (league.clubs - 1);
  const playerPositionBoost = clamp(contribution / 28 + (averageRating - 6.7) * 1.5, -2.2, 4.8);
  const leaguePosition = clamp(Math.round(leagueStrengthPosition - playerPositionBoost + rng.between(-3.2, 3.2)), 1, league.clubs);
  const leaguePoints = clamp(
    Math.round((league.clubs - leaguePosition) * 2.15 + league.leagueMatches * 0.95 + rng.between(-7, 8)),
    22,
    league.leagueMatches * 3,
  );
  const teamHonours = seasonTrophies(state, club, leaguePosition, averageRating, rng);
  const awards = seasonAwards(state, appearances, goals, assists, cleanSheets, averageRating, rng);

  const performanceGrowth = clamp((averageRating - 6.6) * 1.45, -2.2, 3.6);
  const ageGrowth = state.age <= 20 ? 2.2 : state.age <= 23 ? 1.45 : state.age <= 27 ? 0.55 : state.age <= 30 ? 0.05 : -0.65 - (state.age - 31) * 0.36;
  const potentialPull = state.age <= 25 ? Math.max(0, state.potential - state.overall) * 0.075 : 0;
  const injuryPenalty = injured ? gamesLost / 10 : 0;
  const rawGrowth = (ageGrowth + performanceGrowth + potentialPull) * trainingFit * mode.growth + preparation.growth - injuryPenalty;
  let overallChange = clamp(Math.round(rawGrowth + rng.between(-1.35, 1.35)), state.age >= 33 ? -5 : -3, state.age <= 23 ? 7 : 5);
  let overallEnd = clamp(state.overall + overallChange, 35, 99);
  let potentialEnd = clamp(
    state.potential + (state.age <= 21 && averageRating >= 7.5 && rng.chance(0.35) ? 1 : 0) - (state.age >= 31 ? 1 : 0),
    overallEnd,
    99,
  );
  const reputationGain = Math.round(
    clamp(
      ((averageRating - 6.5) * 4 + teamHonours.trophies.length * 5 + awards.length * 4 + appearances / 16) * mode.reputation,
      -5,
      18,
    ),
  );
  let reputationEnd = clamp(state.reputation + reputationGain, 0, 100);
  let formEnd = Math.round(clamp(46 + (averageRating - 6.5) * 15 + rng.between(-10, 10), 12, 95));

  const twist = rollSeasonTwist(state, rng, eventIndex);
  if (twist.event) {
    events.push(twist.event);
    eventIndex += 1;
  }
  const arcEvolution = evolveCareerArc(
    state,
    { averageRating, overallChange, injured, appearances, trophies: teamHonours.trophies.length },
    rng,
    eventIndex,
  );
  if (arcEvolution.event) {
    events.push(arcEvolution.event);
    eventIndex += 1;
  }
  const storyImpact: CareerArcImpact = {
    overall: twist.impact.overall + arcEvolution.impact.overall,
    reputation: twist.impact.reputation + arcEvolution.impact.reputation,
    form: twist.impact.form + arcEvolution.impact.form,
  };
  overallEnd = clamp(overallEnd + storyImpact.overall, 35, 99);
  overallChange = overallEnd - state.overall;
  potentialEnd = clamp(potentialEnd, overallEnd, 99);
  reputationEnd = clamp(reputationEnd + storyImpact.reputation, 0, 100);
  formEnd = clamp(formEnd + storyImpact.form, 0, 100);
  const marketValueEnd = calculateMarketValue(overallEnd, state.age + 1, reputationEnd, club.rating);

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

  const currentNationalEntry = normalizeNationalRanking(state.nationalRanking)
    .find((entry) => entry.country === state.player.nationality);
  const currentNationalRank = currentNationalEntry?.rank ?? COUNTRY_OPTIONS.length;
  const selectionThreshold = NATIONAL_THRESHOLDS[state.player.nationality] + Math.round((COUNTRY_OPTIONS.length - currentNationalRank) * 0.42);
  const nationalScore = overallEnd + reputationEnd * 0.08 + (averageRating - 6.5) * 2.4;
  const callUpChance = clamp(0.12 + (nationalScore - selectionThreshold) * 0.13 + (averageRating - 6.8) * 0.08, 0.02, 0.98);
  const calledUp = appearances >= 10 && (nationalScore >= selectionThreshold + 5 || rng.chance(callUpChance));
  const endingYear = state.seasonYear + 1;
  const worldCupYear = (endingYear - 2026) % 4 === 0;
  const continentalYear = !worldCupYear && (endingYear - 2026) % 2 === 0;
  const isSouthAmerican = state.player.nationality === "BR" || state.player.nationality === "AR";
  const nationalCompetition = worldCupYear
    ? "Coppa del Mondo"
    : continentalYear
      ? (isSouthAmerican ? "Copa America" : "Campionato Europeo")
      : "Qualificazioni internazionali";
  let nationalCaps = 0;
  let nationalGoals = 0;
  let nationalAssists = 0;
  let nationalCleanSheets = 0;
  let nationalTrophies = 0;
  let nationalResult: string | null = calledUp ? "Convocato" : "Non convocato";
  let captaincyCaps = 0;
  if (calledUp) {
    nationalCaps = tournamentSeasonCaps(worldCupYear || continentalYear, state.nationalTeam.caps === 0, rng);
    nationalGoals = sampleCount(rng, nationalCaps * profile.nationalGoalRate * attackQuality, 0.55);
    nationalAssists = sampleCount(rng, nationalCaps * profile.assistRate * 0.68 * attackQuality, 0.52);
    nationalCleanSheets = state.player.role === "GK" ? sampleCount(rng, nationalCaps * 0.35, 0.4) : 0;
    if (worldCupYear || continentalYear) {
      const tournamentPower = clamp(0.18 + (10 - currentNationalRank) * 0.035 + (nationalScore - 72) / 180, 0.12, 0.68);
      const roll = rng.next();
      if (roll < tournamentPower * 0.08) {
        nationalResult = "Vincitore";
        nationalTrophies = 1;
      } else if (roll < tournamentPower * 0.18) nationalResult = "Finale";
      else if (roll < tournamentPower * 0.38) nationalResult = "Semifinale";
      else if (roll < tournamentPower * 0.64) nationalResult = "Quarti";
      else nationalResult = worldCupYear ? "Ottavi" : "Fase a gironi";
    } else {
      nationalResult = rng.chance(clamp(0.45 + (10 - currentNationalRank) * 0.045, 0.42, 0.88)) ? "Qualificata" : "Spareggi";
    }
    const captain = state.nationalTeam.caps >= 24 && reputationEnd >= 62 && rng.chance(clamp(0.16 + reputationEnd / 250, 0.16, 0.56));
    captaincyCaps = captain ? rng.int(1, Math.max(1, nationalCaps)) : 0;
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
    if (captaincyCaps > 0 && (state.nationalTeam.captaincyCaps ?? 0) === 0) {
      events.push(makeEvent(state, eventIndex++, "captaincy", "Fascia della nazionale", "Per la prima volta guidi la nazionale da capitano.", "special", 9));
    }
    if (nationalTrophies > 0) {
      events.push(makeEvent(state, eventIndex++, "trophy", "Trionfo con la nazionale", "Un'estate indimenticabile si chiude con un trofeo internazionale.", "special", 14));
    }
  }

  const nationalWorld = evolveNationalRanking(state, rng, nationalCaps, nationalCompetition, nationalResult);
  if (Math.abs(nationalWorld.rankChange) >= 2) {
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "nationalTeam",
        nationalWorld.rankChange > 0 ? "Nazionale in ascesa" : "Nazionale in calo",
        `${findCountry(state.player.nationality).name}: ${nationalWorld.rank}° nel ranking (${nationalWorld.rankChange > 0 ? "+" : ""}${nationalWorld.rankChange}).`,
        nationalWorld.rankChange > 0 ? "positive" : "negative",
        nationalWorld.rankChange,
      ),
    );
  }

  const nextAge = state.age + 1;
  // Nessun ritiro casuale: a 40 anni arriva la scelta, a 42 il ritiro e definitivo.
  const retiredAfterSeason = nextAge >= 42;
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
    trainingChoice,
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
    nationalTeamRank: nationalWorld.rank,
    nationalTeamRankChange: nationalWorld.rankChange,
    nationalCompetition,
    nationalResult,
    careerArcId: arcEvolution.arcId,
    events,
    goatPointsEarned: seasonGoatPoints,
    retiredAfterSeason,
  };

  const renewed = state.seasonYear + 1 >= club.contractUntil;
  const movement = italianLeagueMovement(
    {
      ...club,
      squadRole: roleNow,
      contractUntil: renewed ? state.seasonYear + 3 : club.contractUntil,
    },
    leaguePosition,
    league.clubs,
    rng,
  );
  const nextClub: CareerClub = {
    ...movement.club,
    ...club,
    squadRole: roleNow,
    contractUntil: renewed ? state.seasonYear + 3 : club.contractUntil,
    league: movement.club.league,
    rating: movement.club.rating,
    prestige: movement.club.prestige,
  };
  if (movement.event) {
    const promoted = movement.event === "promotion";
    events.push(
      makeEvent(
        state,
        eventIndex++,
        "milestone",
        promoted ? "Promozione conquistata" : "Retrocessione amara",
        `${club.name} ${promoted ? "sale" : "scende"} in ${nextClub.league}.`,
        promoted ? "special" : "negative",
        promoted ? 10 : -8,
      ),
    );
  }
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
    currentRanking: nationalWorld.rank,
    bestRanking: Math.min(state.nationalTeam.bestRanking ?? currentNationalRank, nationalWorld.rank),
    captaincyCaps: (state.nationalTeam.captaincyCaps ?? 0) + captaincyCaps,
    tournamentAppearances: (state.nationalTeam.tournamentAppearances ?? 0) + ((calledUp && (worldCupYear || continentalYear)) ? 1 : 0),
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
    pendingDecision: null,
    queuedDecision: null,
    lastDecisionResult: null,
    seasonPreparation: null,
    pendingSeasonReportId: season.id,
    queuedOffers: [],
    nationalRanking: nationalWorld.ranking,
    nationalRankingHistory: [
      ...(state.nationalRankingHistory ?? []),
      { seasonYear: endingYear, entries: nationalWorld.ranking },
    ].slice(-20),
    activeCareerArc: arcEvolution.active,
    careerArcHistory: arcEvolution.history,
    feed: [...events].reverse().concat(state.feed).slice(0, 40),
    retiredAtAge: retiredAfterSeason ? nextAge : null,
  };

  const queuedOffers = retiredAfterSeason || !state.agentEnabled ? [] : makeTransferOffers(nextState, season);
  nextState = {
    ...nextState,
    queuedOffers,
    queuedDecision: retiredAfterSeason
      ? null
      : nextAge === 40 && nextState.retirementPlan === "undecided"
        ? createRetirementDecision(nextState, season)
        : createPostSeasonDecision(nextState, season),
  };
  return { state: nextState, season };
}

export function acceptTransfer(rawState: CareerState, clubName: string): CareerState {
  const state = normalizeCareerDecisionState(rawState);
  if (state.stage !== "active" || !state.currentClub) throw new Error("Non puoi accettare trasferimenti in questo momento.");
  if (state.pendingDecision || state.lastDecisionResult || state.pendingSeasonReportId) {
    throw new Error("Completa prima la decisione di fine stagione.");
  }
  const normalized = clubName.trim().toLocaleLowerCase("it");
  const offer = state.pendingOffers.find((item) => item.clubName.toLocaleLowerCase("it") === normalized);
  if (!offer) throw new Error("L'offerta selezionata non è più disponibile.");
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

  const reputation = clamp(state.reputation + (club.prestige > state.currentClub.prestige ? 2 : 0), 0, 100);
  return normalizeCareerDecisionState({
    ...state,
    currentClub: {
      ...club,
      joinedSeason: state.seasonYear,
      contractUntil: state.seasonYear + offer.contractYears,
      squadRole: offer.squadRole,
    },
    reputation,
    marketValue: calculateMarketValue(state.overall, state.age, reputation, club.rating),
    pendingOffers: [],
    feed: [transferEvent, ...state.feed].slice(0, 40),
  });
}

/** Snapshot leggero pensato per conservare piu carriere senza duplicare tutto lo stato. */
export function createCareerArchiveSummary(
  rawState: CareerState,
  archivedAt = new Date().toISOString(),
): CareerArchiveSummary {
  const state = normalizeCareerDecisionState(rawState);
  const clubs = [...new Set(state.seasons.map((season) => season.clubName))];
  if (state.currentClub && !clubs.includes(state.currentClub.name)) clubs.push(state.currentClub.name);
  return {
    id: state.id,
    playerName: state.player.displayName,
    nationality: state.player.nationality,
    role: state.player.role,
    startedSeason: CAREER_START_YEAR,
    lastSeason: state.seasons.at(-1)?.year ?? state.seasonYear,
    retiredAtAge: state.retiredAtAge,
    seasons: state.seasons.length,
    clubs,
    overallPeak: Math.max(state.overall, 40, ...state.seasons.map((season) => season.overallEnd)),
    goatScore: state.goatScore,
    appearances: state.totals.appearances,
    goals: state.totals.goals,
    assists: state.totals.assists,
    trophies: state.trophyCabinet.reduce((sum, honour) => sum + honour.count, 0) + state.nationalTeam.trophies,
    nationalCaps: state.nationalTeam.caps,
    archivedAt,
  };
}
