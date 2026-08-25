export type FantacalcioJsonRecord = Record<string, unknown>;

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Legge gli alias nell'ordine dichiarato. L'ordine e importante per i payload
 * legacy di Fantacalcio: `pt` indica i punti, mentre `p` indica le sconfitte.
 */
export function valueForAliases(record: FantacalcioJsonRecord, keys: string[]): unknown {
  const values = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    values.set(normalizedKey(key), value);
  }
  for (const key of keys) {
    const normalized = normalizedKey(key);
    if (values.has(normalized)) return values.get(normalized);
  }
  return undefined;
}

function parsedNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return null;

  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
  } else if (comma >= 0) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Supporta sia i decimali italiani (75,5) sia quelli JSON (75.5). */
export function parseFantacalcioNumber(value: unknown): number {
  return parsedNumber(value) ?? 0;
}

export function parseOptionalFantacalcioNumber(value: unknown): number | null {
  return parsedNumber(value);
}
