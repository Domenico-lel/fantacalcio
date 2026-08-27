export interface CurrentRosterPlayer {
  id: string;
  player_name: string;
  role: string | null;
  photo_url: string | null;
}

export interface SourceRosterPlayer {
  name: string;
  role: "P" | "D" | "C" | "A";
  photoUrl: string;
}

export interface RosterSyncPlan {
  insertions: SourceRosterPlayer[];
  updates: Array<{ id: string; player: SourceRosterPlayer }>;
  staleIds: string[];
}

function normalizedName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

/** Costruisce il piano di riconciliazione applicato dopo ogni scambio. */
export function buildRosterSyncPlan(
  currentPlayers: CurrentRosterPlayer[],
  sourcePlayers: SourceRosterPlayer[],
): RosterSyncPlan {
  const currentByName = new Map<string, CurrentRosterPlayer[]>();
  for (const player of currentPlayers) {
    const key = normalizedName(player.player_name);
    currentByName.set(key, [...(currentByName.get(key) ?? []), player]);
  }

  const insertions: SourceRosterPlayer[] = [];
  const updates: Array<{ id: string; player: SourceRosterPlayer }> = [];
  for (const player of sourcePlayers) {
    const bucket = currentByName.get(normalizedName(player.name));
    const current = bucket?.shift();
    if (!current) {
      insertions.push(player);
      continue;
    }
    if (current.role !== player.role || current.photo_url !== player.photoUrl || current.player_name !== player.name) {
      updates.push({ id: current.id, player });
    }
  }

  return {
    insertions,
    updates,
    staleIds: [...currentByName.values()].flat().map((player) => player.id),
  };
}
