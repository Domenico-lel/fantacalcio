import { createHash } from "node:crypto";

export interface StandingsOdds {
  odd1: number;
  oddX: number;
  odd2: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function marketOdd(probability: number): number {
  // Margine complessivo vicino all'8%, con limiti che mantengono le quote
  // utilizzabili anche negli scontri fra prima e ultima in classifica.
  return Number(clamp(1 / (probability * 1.08), 1.15, 9.5).toFixed(2));
}

/** Quote 1/X/2 determinate dalla posizione corrente e dal vantaggio casa. */
export function calculateStandingsOdds(
  homePosition: number,
  awayPosition: number,
  teamCount: number,
): StandingsOdds {
  const count = Math.max(2, Math.trunc(teamCount));
  const home = clamp(Math.trunc(homePosition) || count, 1, count);
  const away = clamp(Math.trunc(awayPosition) || count, 1, count);
  const positionGap = away - home;

  // Una posizione e un quarto di vantaggio alla squadra di casa. La componente
  // pareggio diminuisce gradualmente quando la distanza in classifica cresce.
  const homeWeight = Math.exp((positionGap + 1.25) / 10);
  const awayWeight = Math.exp(-positionGap / 10);
  const drawWeight = 0.9 * Math.exp(-Math.abs(positionGap) / 18);
  const total = homeWeight + drawWeight + awayWeight;

  return {
    odd1: marketOdd(homeWeight / total),
    oddX: marketOdd(drawWeight / total),
    odd2: marketOdd(awayWeight / total),
  };
}

/** UUID stabile: rende idempotente la creazione di bozze e incontri. */
export function stablePredictionUuid(value: string): string {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
