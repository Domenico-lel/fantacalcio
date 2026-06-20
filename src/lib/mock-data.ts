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

export const TEAM_LOGO_OPTIONS = [
  "⚽", "🏆", "⭐", "🦅", "🦁", "🐉", "🔥", "⚡", "🌟", "🎯",
  "🦊", "🐺", "🦈", "🦋", "🌈", "💎", "🏅", "🎖️", "⚔️", "🛡️",
];
