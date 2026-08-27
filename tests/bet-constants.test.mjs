import assert from "node:assert/strict";
import test from "node:test";

import {
  FIXED_WIN_MULTIPLIER,
  calculateFixedPayout,
} from "../src/lib/bet-constants.ts";

test("una vincita restituisce sempre il doppio della puntata", () => {
  assert.equal(FIXED_WIN_MULTIPLIER, 2);
  assert.equal(calculateFixedPayout(1), 2);
  assert.equal(calculateFixedPayout(25), 50);
  assert.equal(calculateFixedPayout(100), 200);
});

test("puntate non valide non producono vincite", () => {
  assert.equal(calculateFixedPayout(0), 0);
  assert.equal(calculateFixedPayout(-10), 0);
  assert.equal(calculateFixedPayout(Number.NaN), 0);
});
