export type BetPick = "1" | "X" | "2";
export type BetSlipStatus = "pending" | "won" | "lost";

export interface SlipMatchResult {
  id: string;
  result: BetPick | null;
}

/** Una schedina vince solo quando contiene tutti gli incontri e tutti sono corretti. */
export function evaluateSlipStatus(
  matches: SlipMatchResult[],
  picks: Record<string, BetPick>,
): BetSlipStatus {
  if (matches.length === 0 || matches.some((match) => !picks[match.id])) return "pending";
  if (matches.some((match) => match.result && match.result !== picks[match.id])) return "lost";
  if (matches.every((match) => !!match.result)) return "won";
  return "pending";
}
