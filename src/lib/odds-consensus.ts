export interface ThreeWayPrice {
  odd1: number;
  oddX: number;
  odd2: number;
}

const APP_MARGIN = 0.08;
const MIN_ODD = 1.05;
const MAX_ODD = 20;

function trimmedMean(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  // Con almeno cinque fonti eliminiamo l'estremo più basso e più alto:
  // una quota anomala non può così spostare da sola il consenso.
  const sample = sorted.length >= 5 ? sorted.slice(1, -1) : sorted;
  return sample.reduce((sum, value) => sum + value, 0) / sample.length;
}

function roundedOdd(probability: number): number {
  return Math.round(Math.min(MAX_ODD, Math.max(MIN_ODD, 1 / probability)) * 100) / 100;
}

/**
 * Crea quote 1/X/2 robuste a partire dalle lavagne di più bookmaker.
 *
 * Ogni lavagna viene prima trasformata in probabilità e normalizzata, così il
 * margine specifico del bookmaker non pesa sul consenso. Le probabilità estreme
 * vengono rimosse quando ci sono abbastanza fonti; infine si applica un margine
 * unico dell'app, uguale per tutti gli incontri.
 */
export function calculateBookmakerConsensus(prices: ThreeWayPrice[]): ThreeWayPrice | null {
  const normalized = prices.flatMap((price) => {
    const odds = [price.odd1, price.oddX, price.odd2];
    if (odds.some((odd) => !Number.isFinite(odd) || odd <= 1)) return [];
    const raw = odds.map((odd) => 1 / odd);
    const total = raw.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 0) return [];
    return [{
      home: raw[0] / total,
      draw: raw[1] / total,
      away: raw[2] / total,
    }];
  });
  if (normalized.length === 0) return null;

  const fair = [
    trimmedMean(normalized.map((row) => row.home)),
    trimmedMean(normalized.map((row) => row.draw)),
    trimmedMean(normalized.map((row) => row.away)),
  ];
  const fairTotal = fair.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(fairTotal) || fairTotal <= 0) return null;

  const marginMultiplier = 1 + APP_MARGIN;
  const final = fair.map((value) => (value / fairTotal) * marginMultiplier);
  return {
    odd1: roundedOdd(final[0]),
    oddX: roundedOdd(final[1]),
    odd2: roundedOdd(final[2]),
  };
}
