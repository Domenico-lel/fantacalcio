interface GroupableMatch {
  competition: string | null;
  external: boolean;
}

interface GroupableRound {
  title: string | null;
  matches: GroupableMatch[];
}

export interface PredictionCompetitionGroup<T> {
  key: string;
  label: string;
  icon: string;
  rounds: T[];
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function identity(round: GroupableRound): Omit<PredictionCompetitionGroup<never>, "rounds"> & { priority: number } {
  const title = round.title?.trim() ?? "";
  const normalizedTitle = title.toLocaleLowerCase("it-IT");
  const competitions = Array.from(new Set(
    round.matches.map((match) => match.competition?.trim()).filter((value): value is string => !!value),
  ));

  if (normalizedTitle.includes("serie a") || competitions.some((name) => name.toLocaleLowerCase("it-IT") === "serie a")) {
    return { key: "serie-a", label: "Serie A", icon: "🇮🇹", priority: 1 };
  }
  if (
    normalizedTitle.includes("fantacalcio")
    || (round.matches.length > 0 && round.matches.every((match) => !match.external))
  ) {
    return { key: "fantacalcio", label: "Fantacalcio", icon: "🏆", priority: 0 };
  }

  const label = competitions.length === 1 ? competitions[0] : title || "Altre competizioni";
  return { key: `other-${slug(label) || "competizioni"}`, label, icon: "⚽", priority: 2 };
}

/** Raggruppa le giornate in cartelle stabili, con Fantacalcio e Serie A per prime. */
export function groupPredictionRounds<T extends GroupableRound>(rounds: T[]): PredictionCompetitionGroup<T>[] {
  const groups = new Map<string, PredictionCompetitionGroup<T> & { priority: number }>();
  for (const round of rounds) {
    const group = identity(round);
    const existing = groups.get(group.key);
    if (existing) existing.rounds.push(round);
    else groups.set(group.key, { ...group, rounds: [round] });
  }
  return Array.from(groups.values())
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label, "it-IT"))
    .map(({ priority: _priority, ...group }) => group);
}
