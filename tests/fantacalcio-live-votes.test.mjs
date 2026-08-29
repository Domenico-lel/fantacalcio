import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFantacalcioLiveScore,
  fantacalcioSeasonId,
  normalizeFantacalcioLiveVote,
} from "../src/lib/fantacalcio-live-votes.ts";

test("ricava la stagione Fantacalcio dall'anno calcistico", () => {
  assert.equal(fantacalcioSeasonId(new Date("2026-08-29T00:00:00Z")), 21);
  assert.equal(fantacalcioSeasonId(new Date("2027-01-10T00:00:00Z")), 21);
});

test("normalizza i voti decimali codificati senza separatore", () => {
  assert.equal(normalizeFantacalcioLiveVote(55), 5.5);
  assert.equal(normalizeFantacalcioLiveVote(6.5), 6.5);
  assert.equal(normalizeFantacalcioLiveVote(100), null);
});

test("calcola bonus e malus Classic dal feed ufficiale", () => {
  assert.equal(calculateFantacalcioLiveScore({ vote: 7, position: "A", events: [3, 22, 1] }), 10.5);
  assert.equal(calculateFantacalcioLiveScore({ vote: 5, position: "P", events: [4, 4, 4, 1] }), 1.5);
  assert.equal(calculateFantacalcioLiveScore({ vote: 6, position: "ALL" }), null);
});
