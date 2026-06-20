// Tag dei post della bacheca.
// Solo l'admin può assegnarli; gli utenti normali pubblicano senza tag.
// Modulo client/server-safe (niente "use server") così è importabile ovunque.

export const ADMIN_POST_TAGS = ["scoop", "ufficiale", "mercato", "sondaggio"] as const;

export type PostTag = (typeof ADMIN_POST_TAGS)[number];

export function isAdminPostTag(value: unknown): value is PostTag {
  return typeof value === "string" && (ADMIN_POST_TAGS as readonly string[]).includes(value);
}
