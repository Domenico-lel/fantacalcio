// Catalogo badge assegnabili dall'admin ai manager.
// Modulo client/server-safe (niente "use server") così è importabile ovunque.

export interface BadgeDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  { id: "admin",      label: "Admin",      emoji: "🛡️", color: "#ef4444", description: "Staff / amministratore della lega" },
  { id: "verified",   label: "Verificato", emoji: "✔️", color: "#3b8eea", description: "Profilo verificato" },
  { id: "streak",     label: "On Fire",    emoji: "🔥", color: "#f0a43a", description: "Serie di vittorie in corso" },
  { id: "champion",   label: "Campione",   emoji: "🏆", color: "#f5a623", description: "Vincitore del campionato" },
  { id: "bomber",     label: "Bomber",     emoji: "⚽", color: "#34d399", description: "Miglior attacco della lega" },
  { id: "mvp",        label: "MVP",        emoji: "⭐", color: "#857cf0", description: "Giocatore del mese" },
  { id: "veteran",    label: "Veterano",   emoji: "🎖️", color: "#b08d57", description: "Storico della lega" },
  { id: "founder",    label: "Founder",    emoji: "👑", color: "#b86cf0", description: "Membro fondatore" },
];

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export function isBadgeId(value: unknown): value is string {
  return typeof value === "string" && value in BADGE_MAP;
}

// Filtra/deduplica una lista di id badge tenendo solo quelli validi e nell'ordine del catalogo.
export function normalizeBadges(value: unknown): string[] {
  const set = new Set<string>();
  if (Array.isArray(value)) {
    for (const v of value) if (isBadgeId(v)) set.add(v);
  }
  return BADGES.map((b) => b.id).filter((id) => set.has(id));
}
