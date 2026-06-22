// Un avatar/logo è un'immagine se è un URL http(s) o un percorso assoluto locale
// (es. "/avatars/admin.svg"). Qualsiasi altra stringa è trattata come emoji/testo.
export function isImageAvatar(src?: string | null): src is string {
  return !!src && (src.startsWith("http") || src.startsWith("/"));
}
