import assert from "node:assert/strict";
import test from "node:test";

import {
  FANTACALCIO_SYNC_INTERVAL_MS,
  fantacalcioSyncToken,
  withFantacalcioSyncToken,
} from "../src/lib/fantacalcio-sync-utils.ts";

test("condivide lo stesso token per una finestra di due minuti", () => {
  const start = 1_800_000;
  assert.equal(FANTACALCIO_SYNC_INTERVAL_MS, 120_000);
  assert.equal(fantacalcioSyncToken(start), fantacalcioSyncToken(start + 119_999));
  assert.notEqual(fantacalcioSyncToken(start), fantacalcioSyncToken(start + 120_000));
});

test("aggiunge il token mantenendo i parametri esistenti", () => {
  const url = withFantacalcioSyncToken("https://example.com/live?competition=42", "150");
  assert.equal(url, "https://example.com/live?competition=42&_=150");
});
