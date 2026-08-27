import assert from "node:assert/strict";
import test from "node:test";

import {
  BET_CUTOFF_MINUTES,
  FIXED_WIN_MULTIPLIER,
  calculateBetClosesAt,
  calculateFixedPayout,
  countdownTone,
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

test("la schedina chiude 15 minuti prima della prima partita", () => {
  assert.equal(BET_CUTOFF_MINUTES, 15);
  assert.equal(
    calculateBetClosesAt(["2026-08-28T20:45:00.000Z", "2026-08-28T18:45:00.000Z"]),
    "2026-08-28T18:30:00.000Z",
  );
});

test("il countdown passa da normale ad arancione e rosso", () => {
  assert.equal(countdownTone(31 * 60_000), "normal");
  assert.equal(countdownTone(30 * 60_000), "orange");
  assert.equal(countdownTone(5 * 60_000), "red");
  assert.equal(countdownTone(0), "closed");
});
