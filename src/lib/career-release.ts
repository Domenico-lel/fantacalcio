export const CAREER_CLOSED_ERROR = "La modalità Carriera è ancora in lavorazione.";

/** L'admin può sempre collaudare la Carriera; i manager solo dopo il rilascio. */
export function canAccessCareer(isAdmin: boolean, isOpen: boolean): boolean {
  return isAdmin || isOpen;
}
