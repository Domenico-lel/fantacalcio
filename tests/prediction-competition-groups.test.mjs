import assert from "node:assert/strict";
import test from "node:test";

import { groupPredictionRounds } from "../src/lib/prediction-competition-groups.ts";

function round(title, competition = null, external = false) {
  return { title, matches: [{ competition, external }] };
}

test("separa Fantacalcio e Serie A anche quando hanno lo stesso numero di giornata", () => {
  const fantasy = { ...round("Lega Fantacalcio"), day: 7 };
  const serieA = { ...round("Serie A", "Serie A", true), day: 7 };
  const groups = groupPredictionRounds([serieA, fantasy]);

  assert.deepEqual(groups.map((group) => group.key), ["fantacalcio", "serie-a"]);
  assert.equal(groups[0].rounds[0], fantasy);
  assert.equal(groups[1].rounds[0], serieA);
});

test("raccoglie le altre competizioni in cartelle dedicate", () => {
  const champions1 = round(null, "Champions League", true);
  const champions2 = round(null, "Champions League", true);
  const groups = groupPredictionRounds([champions1, champions2]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "Champions League");
  assert.equal(groups[0].rounds.length, 2);
});
