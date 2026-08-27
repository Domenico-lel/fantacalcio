import assert from "node:assert/strict";
import test from "node:test";

import { stablePredictionUuid } from "../src/lib/prediction-draft-utils.ts";

test("gli UUID stabili evitano doppie bozze per la stessa giornata", () => {
  const first = stablePredictionUuid("lega:123:giornata:4");
  const second = stablePredictionUuid("lega:123:giornata:4");
  const next = stablePredictionUuid("lega:123:giornata:5");

  assert.equal(first, second);
  assert.notEqual(first, next);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
