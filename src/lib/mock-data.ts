export type Role = "P" | "D" | "C" | "A";

export interface Player {
  id: number;
  name: string;
  team: string;
  role: Role;
  value: number;
  points: number;
  avgPoints: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  photo?: string;
}

export interface SerieATeam {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface CalendarMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  day: number;
  date: string;
  time: string;
}

export interface StandingEntry {
  position: number;
  teamName: string;
  logoEmoji: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export const SERIE_A_TEAMS: SerieATeam[] = [
  { id: "inter", name: "Internazionale", shortName: "INT", color: "#003399" },
  { id: "milan", name: "Milan", shortName: "MIL", color: "#cc0000" },
  { id: "juve", name: "Juventus", shortName: "JUV", color: "#000000" },
  { id: "napoli", name: "Napoli", shortName: "NAP", color: "#0080ff" },
  { id: "atalanta", name: "Atalanta", shortName: "ATA", color: "#0000cc" },
  { id: "lazio", name: "Lazio", shortName: "LAZ", color: "#87ceeb" },
  { id: "roma", name: "Roma", shortName: "ROM", color: "#8b2500" },
  { id: "fiorentina", name: "Fiorentina", shortName: "FIO", color: "#6600cc" },
  { id: "bologna", name: "Bologna", shortName: "BOL", color: "#cc0000" },
  { id: "torino", name: "Torino", shortName: "TOR", color: "#8b0000" },
  { id: "genoa", name: "Genoa", shortName: "GEN", color: "#cc0000" },
  { id: "udinese", name: "Udinese", shortName: "UDI", color: "#000000" },
  { id: "cagliari", name: "Cagliari", shortName: "CAG", color: "#cc0000" },
  { id: "monza", name: "Monza", shortName: "MON", color: "#cc0000" },
  { id: "lecce", name: "Lecce", shortName: "LEC", color: "#cc0000" },
  { id: "empoli", name: "Empoli", shortName: "EMP", color: "#0055a4" },
  { id: "verona", name: "Verona", shortName: "VER", color: "#002b6e" },
  { id: "venezia", name: "Venezia", shortName: "VEN", color: "#ff6600" },
  { id: "como", name: "Como", shortName: "COM", color: "#004d99" },
  { id: "parma", name: "Parma", shortName: "PAR", color: "#f5c518" },
];

export const MOCK_PLAYERS: Player[] = [
  // Portieri
  { id: 1, name: "Sommer Y.", team: "Internazionale", role: "P", value: 25, points: 68, avgPoints: 5.6, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
  { id: 2, name: "Maignan M.", team: "Milan", role: "P", value: 30, points: 72, avgPoints: 6.0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 3, name: "Di Gregorio M.", team: "Juventus", role: "P", value: 22, points: 65, avgPoints: 5.4, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
  { id: 4, name: "Meret A.", team: "Napoli", role: "P", value: 20, points: 60, avgPoints: 5.0, goals: 0, assists: 0, yellowCards: 2, redCards: 0 },
  { id: 5, name: "Musso J.", team: "Atalanta", role: "P", value: 18, points: 58, avgPoints: 4.8, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 6, name: "Provedel I.", team: "Lazio", role: "P", value: 20, points: 63, avgPoints: 5.3, goals: 1, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 7, name: "Svilar M.", team: "Roma", role: "P", value: 15, points: 55, avgPoints: 4.6, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
  { id: 8, name: "De Gea D.", team: "Fiorentina", role: "P", value: 18, points: 60, avgPoints: 5.0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  { id: 9, name: "Skorupski L.", team: "Bologna", role: "P", value: 14, points: 52, avgPoints: 4.3, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
  { id: 10, name: "Milinkovic-Savic V.", team: "Torino", role: "P", value: 16, points: 58, avgPoints: 4.8, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },

  // Difensori
  { id: 11, name: "Bastoni A.", team: "Internazionale", role: "D", value: 35, points: 75, avgPoints: 6.3, goals: 3, assists: 4, yellowCards: 3, redCards: 0 },
  { id: 12, name: "Dimarco F.", team: "Internazionale", role: "D", value: 28, points: 70, avgPoints: 5.8, goals: 2, assists: 8, yellowCards: 2, redCards: 0 },
  { id: 13, name: "Pavard B.", team: "Internazionale", role: "D", value: 22, points: 62, avgPoints: 5.2, goals: 1, assists: 2, yellowCards: 4, redCards: 0 },
  { id: 14, name: "Theo Hernandez", team: "Milan", role: "D", value: 32, points: 68, avgPoints: 5.7, goals: 4, assists: 5, yellowCards: 5, redCards: 1 },
  { id: 15, name: "Calabria D.", team: "Milan", role: "D", value: 18, points: 55, avgPoints: 4.6, goals: 1, assists: 2, yellowCards: 3, redCards: 0 },
  { id: 16, name: "Gatti F.", team: "Juventus", role: "D", value: 20, points: 60, avgPoints: 5.0, goals: 2, assists: 1, yellowCards: 4, redCards: 0 },
  { id: 17, name: "Bremer", team: "Juventus", role: "D", value: 25, points: 64, avgPoints: 5.3, goals: 1, assists: 0, yellowCards: 3, redCards: 0 },
  { id: 18, name: "Di Lorenzo G.", team: "Napoli", role: "D", value: 28, points: 67, avgPoints: 5.6, goals: 2, assists: 4, yellowCards: 2, redCards: 0 },
  { id: 19, name: "Olivera M.", team: "Napoli", role: "D", value: 20, points: 58, avgPoints: 4.8, goals: 1, assists: 3, yellowCards: 3, redCards: 0 },
  { id: 20, name: "Kolasinac S.", team: "Atalanta", role: "D", value: 16, points: 52, avgPoints: 4.3, goals: 0, assists: 2, yellowCards: 5, redCards: 0 },
  { id: 21, name: "Hysaj E.", team: "Lazio", role: "D", value: 14, points: 48, avgPoints: 4.0, goals: 0, assists: 1, yellowCards: 4, redCards: 0 },
  { id: 22, name: "Romagnoli A.", team: "Lazio", role: "D", value: 18, points: 55, avgPoints: 4.6, goals: 1, assists: 0, yellowCards: 3, redCards: 0 },
  { id: 23, name: "Mancini G.", team: "Roma", role: "D", value: 15, points: 50, avgPoints: 4.2, goals: 0, assists: 1, yellowCards: 6, redCards: 1 },
  { id: 24, name: "Dodo", team: "Fiorentina", role: "D", value: 16, points: 54, avgPoints: 4.5, goals: 1, assists: 4, yellowCards: 2, redCards: 0 },
  { id: 25, name: "Posch S.", team: "Bologna", role: "D", value: 14, points: 50, avgPoints: 4.2, goals: 1, assists: 2, yellowCards: 3, redCards: 0 },

  // Centrocampisti
  { id: 31, name: "Barella N.", team: "Internazionale", role: "C", value: 40, points: 85, avgPoints: 7.1, goals: 5, assists: 8, yellowCards: 5, redCards: 0 },
  { id: 32, name: "Calhanoglu H.", team: "Internazionale", role: "C", value: 35, points: 80, avgPoints: 6.7, goals: 8, assists: 6, yellowCards: 4, redCards: 0 },
  { id: 33, name: "Mkhitaryan H.", team: "Internazionale", role: "C", value: 22, points: 65, avgPoints: 5.4, goals: 4, assists: 5, yellowCards: 2, redCards: 0 },
  { id: 34, name: "Reijnders T.", team: "Milan", role: "C", value: 28, points: 72, avgPoints: 6.0, goals: 6, assists: 4, yellowCards: 3, redCards: 0 },
  { id: 35, name: "Bennacer I.", team: "Milan", role: "C", value: 20, points: 58, avgPoints: 4.8, goals: 1, assists: 3, yellowCards: 4, redCards: 0 },
  { id: 36, name: "Locatelli M.", team: "Juventus", role: "C", value: 22, points: 62, avgPoints: 5.2, goals: 2, assists: 3, yellowCards: 5, redCards: 0 },
  { id: 37, name: "McKennie W.", team: "Juventus", role: "C", value: 18, points: 55, avgPoints: 4.6, goals: 3, assists: 2, yellowCards: 3, redCards: 0 },
  { id: 38, name: "Anguissa A.", team: "Napoli", role: "C", value: 25, points: 68, avgPoints: 5.7, goals: 3, assists: 4, yellowCards: 4, redCards: 0 },
  { id: 39, name: "Lobotka S.", team: "Napoli", role: "C", value: 22, points: 65, avgPoints: 5.4, goals: 1, assists: 3, yellowCards: 3, redCards: 0 },
  { id: 40, name: "De Roon M.", team: "Atalanta", role: "C", value: 16, points: 55, avgPoints: 4.6, goals: 2, assists: 2, yellowCards: 6, redCards: 1 },
  { id: 41, name: "Ederson", team: "Atalanta", role: "C", value: 28, points: 72, avgPoints: 6.0, goals: 5, assists: 6, yellowCards: 3, redCards: 0 },
  { id: 42, name: "Guendouzi M.", team: "Lazio", role: "C", value: 20, points: 60, avgPoints: 5.0, goals: 3, assists: 4, yellowCards: 4, redCards: 0 },
  { id: 43, name: "Luis Alberto", team: "Lazio", role: "C", value: 18, points: 55, avgPoints: 4.6, goals: 2, assists: 5, yellowCards: 2, redCards: 0 },
  { id: 44, name: "Pellegrini L.", team: "Roma", role: "C", value: 25, points: 65, avgPoints: 5.4, goals: 4, assists: 6, yellowCards: 3, redCards: 0 },
  { id: 45, name: "Arthur", team: "Fiorentina", role: "C", value: 16, points: 52, avgPoints: 4.3, goals: 1, assists: 2, yellowCards: 5, redCards: 0 },

  // Attaccanti
  { id: 51, name: "Lautaro Martínez", team: "Internazionale", role: "A", value: 55, points: 98, avgPoints: 8.2, goals: 22, assists: 5, yellowCards: 4, redCards: 0 },
  { id: 52, name: "Thuram M.", team: "Internazionale", role: "A", value: 40, points: 85, avgPoints: 7.1, goals: 13, assists: 6, yellowCards: 3, redCards: 0 },
  { id: 53, name: "Leao R.", team: "Milan", role: "A", value: 42, points: 82, avgPoints: 6.8, goals: 12, assists: 9, yellowCards: 2, redCards: 0 },
  { id: 54, name: "Pulisic C.", team: "Milan", role: "A", value: 30, points: 78, avgPoints: 6.5, goals: 10, assists: 8, yellowCards: 1, redCards: 0 },
  { id: 55, name: "Vlahovic D.", team: "Juventus", role: "A", value: 45, points: 80, avgPoints: 6.7, goals: 16, assists: 2, yellowCards: 3, redCards: 0 },
  { id: 56, name: "Yildiz K.", team: "Juventus", role: "A", value: 28, points: 70, avgPoints: 5.8, goals: 8, assists: 5, yellowCards: 2, redCards: 0 },
  { id: 57, name: "Lukaku R.", team: "Napoli", role: "A", value: 38, points: 78, avgPoints: 6.5, goals: 14, assists: 4, yellowCards: 4, redCards: 0 },
  { id: 58, name: "Politano M.", team: "Napoli", role: "A", value: 22, points: 65, avgPoints: 5.4, goals: 7, assists: 6, yellowCards: 2, redCards: 0 },
  { id: 59, name: "Lookman A.", team: "Atalanta", role: "A", value: 35, points: 82, avgPoints: 6.8, goals: 15, assists: 7, yellowCards: 1, redCards: 0 },
  { id: 60, name: "De Ketelaere C.", team: "Atalanta", role: "A", value: 30, points: 75, avgPoints: 6.3, goals: 10, assists: 8, yellowCards: 2, redCards: 0 },
  { id: 61, name: "Felipe Anderson", team: "Lazio", role: "A", value: 20, points: 60, avgPoints: 5.0, goals: 6, assists: 5, yellowCards: 2, redCards: 0 },
  { id: 62, name: "Zaccagni M.", team: "Lazio", role: "A", value: 25, points: 68, avgPoints: 5.7, goals: 9, assists: 6, yellowCards: 3, redCards: 0 },
  { id: 63, name: "Dybala P.", team: "Roma", role: "A", value: 35, points: 75, avgPoints: 6.3, goals: 8, assists: 7, yellowCards: 2, redCards: 0 },
  { id: 64, name: "El Shaarawy S.", team: "Roma", role: "A", value: 18, points: 58, avgPoints: 4.8, goals: 5, assists: 3, yellowCards: 1, redCards: 0 },
  { id: 65, name: "Kean M.", team: "Fiorentina", role: "A", value: 28, points: 72, avgPoints: 6.0, goals: 13, assists: 2, yellowCards: 3, redCards: 0 },
  { id: 66, name: "Gudmundsson A.", team: "Fiorentina", role: "A", value: 22, points: 65, avgPoints: 5.4, goals: 7, assists: 6, yellowCards: 2, redCards: 0 },
  { id: 67, name: "Castro S.", team: "Bologna", role: "A", value: 18, points: 60, avgPoints: 5.0, goals: 8, assists: 3, yellowCards: 2, redCards: 0 },
  { id: 68, name: "Zapata D.", team: "Torino", role: "A", value: 20, points: 55, avgPoints: 4.6, goals: 6, assists: 1, yellowCards: 3, redCards: 0 },
];

export const MOCK_STANDINGS: StandingEntry[] = [
  { position: 1, teamName: "Squadra dei Campioni", logoEmoji: "🏆", points: 78, played: 12, won: 8, drawn: 3, lost: 1, goalsFor: 42, goalsAgainst: 18 },
  { position: 2, teamName: "Gli Invincibili FC", logoEmoji: "⚡", points: 72, played: 12, won: 7, drawn: 3, lost: 2, goalsFor: 38, goalsAgainst: 22 },
  { position: 3, teamName: "Aquile del Nord", logoEmoji: "🦅", points: 68, played: 12, won: 7, drawn: 1, lost: 4, goalsFor: 35, goalsAgainst: 28 },
  { position: 4, teamName: "La tua Squadra", logoEmoji: "⭐", points: 65, played: 12, won: 6, drawn: 3, lost: 3, goalsFor: 31, goalsAgainst: 25 },
  { position: 5, teamName: "Diavoli Rossi", logoEmoji: "😈", points: 60, played: 12, won: 6, drawn: 2, lost: 4, goalsFor: 28, goalsAgainst: 30 },
  { position: 6, teamName: "Leoni del Sud", logoEmoji: "🦁", points: 55, played: 12, won: 5, drawn: 2, lost: 5, goalsFor: 25, goalsAgainst: 32 },
  { position: 7, teamName: "Falchi d'Argento", logoEmoji: "🦊", points: 50, played: 12, won: 4, drawn: 3, lost: 5, goalsFor: 22, goalsAgainst: 35 },
  { position: 8, teamName: "Guerrieri FC", logoEmoji: "⚔️", points: 45, played: 12, won: 4, drawn: 1, lost: 7, goalsFor: 20, goalsAgainst: 40 },
];

export const MOCK_CALENDAR: CalendarMatch[] = [
  { id: 1, homeTeam: "Internazionale", awayTeam: "Milan", day: 35, date: "2025-05-18", time: "20:45" },
  { id: 2, homeTeam: "Napoli", awayTeam: "Juventus", day: 35, date: "2025-05-18", time: "20:45" },
  { id: 3, homeTeam: "Atalanta", awayTeam: "Lazio", day: 35, date: "2025-05-18", time: "18:00" },
  { id: 4, homeTeam: "Roma", awayTeam: "Fiorentina", day: 35, date: "2025-05-18", time: "18:00" },
  { id: 5, homeTeam: "Bologna", awayTeam: "Torino", day: 35, date: "2025-05-18", time: "15:00" },
  { id: 6, homeTeam: "Udinese", awayTeam: "Genoa", day: 35, date: "2025-05-18", time: "15:00" },
  { id: 7, homeTeam: "Cagliari", awayTeam: "Monza", day: 35, date: "2025-05-18", time: "15:00" },
  { id: 8, homeTeam: "Lecce", awayTeam: "Verona", day: 35, date: "2025-05-18", time: "15:00" },
  { id: 9, homeTeam: "Como", awayTeam: "Parma", day: 35, date: "2025-05-18", time: "15:00" },
  { id: 10, homeTeam: "Empoli", awayTeam: "Venezia", day: 35, date: "2025-05-18", time: "15:00" },
];

export const FORMATIONS = [
  "4-3-3",
  "4-4-2",
  "3-5-2",
  "3-4-3",
  "4-2-3-1",
  "5-3-2",
  "4-5-1",
  "3-4-1-2",
];

export type Formation = typeof FORMATIONS[number];

export interface FormationLayout {
  defenders: number;
  midfielders: number;
  attackers: number;
  extra?: { row: string; count: number };
}

export function parseFormation(formation: string): number[] {
  return formation.split("-").map(Number);
}

export const ROLE_COLORS: Record<Role, string> = {
  P: "bg-yellow-400 text-yellow-900",
  D: "bg-blue-500 text-white",
  C: "bg-green-500 text-white",
  A: "bg-red-500 text-white",
};

export const ROLE_LABELS: Record<Role, string> = {
  P: "P",
  D: "D",
  C: "C",
  A: "A",
};

export const ROLE_FULL_LABELS: Record<Role, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

export const TEAM_LOGO_OPTIONS = [
  "⚽", "🏆", "⭐", "🦅", "🦁", "🐉", "🔥", "⚡", "🌟", "🎯",
  "🦊", "🐺", "🦈", "🦋", "🌈", "💎", "🏅", "🎖️", "⚔️", "🛡️",
];
