import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateStandingsOdds,
  stablePredictionUuid,
} from "../src/lib/prediction-draft-utils.ts";

test("favorisce leggermente la squadra di casa a parità di posizione", () => {
  const odds = calculateStandingsOdds(5, 5, 10);
  assert.ok(odds.odd1 < odds.odd2);
  assert.ok(odds.odd1 >= 1.15);
  assert.ok(odds.odd2 <= 9.5);
});

test("la squadra più alta in classifica riceve la quota più bassa", () => {
  const homeFavorite = calculateStandingsOdds(1, 10, 10);
  const awayFavorite = calculateStandingsOdds(10, 1, 10);

  assert.ok(homeFavorite.odd1 < homeFavorite.oddX);
  assert.ok(homeFavorite.odd1 < homeFavorite.odd2);
  assert.ok(awayFavorite.odd2 < awayFavorite.oddX);
  assert.ok(awayFavorite.odd2 < awayFavorite.odd1);
});

test("le quote sono decimali finite con due cifre al massimo", () => {
  for (const value of Object.values(calculateStandingsOdds(2, 7, 10))) {
    assert.ok(Number.isFinite(value));
    assert.equal(Number(value.toFixed(2)), value);
  }
});

test("gli UUID stabili evitano doppie bozze per la stessa giornata", () => {
  const first = stablePredictionUuid("lega:123:giornata:4");
  const second = stablePredictionUuid("lega:123:giornata:4");
  const next = stablePredictionUuid("lega:123:giornata:5");

  assert.equal(first, second);
  assert.notEqual(first, next);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
