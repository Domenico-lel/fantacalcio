import type { ExtMatch } from "@/lib/bet-constants";

/**
 * Seleziona la prossima giornata completa della Serie A.
 * Un recupero isolato di una vecchia giornata non deve diventare la nuova bozza.
 */
export function selectNextCompleteMatchday(matches: ExtMatch[]): ExtMatch[] {
  const groups = new Map<number, ExtMatch[]>();
  for (const match of matches) {
    if (!match.matchday || !match.kickoff) continue;
    const group = groups.get(match.matchday) ?? [];
    group.push(match);
    groups.set(match.matchday, group);
  }

  const ordered = Array.from(groups.values())
    .map((group) => group.sort((a, b) => a.kickoff.localeCompare(b.kickoff)))
    .sort((a, b) => a[0].kickoff.localeCompare(b[0].kickoff));
  if (ordered.length === 0) return [];

  // Una giornata di Serie A normalmente contiene 10 partite. La soglia evita
  // di scegliere un singolo recupero, lasciando però margine per rinvii reali.
  return ordered.find((group) => group.length >= 8) ?? ordered.reduce(
    (largest, group) => group.length > largest.length ? group : largest,
    ordered[0],
  );
}
