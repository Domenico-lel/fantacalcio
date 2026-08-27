import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSlipStatus } from "../src/lib/bet-slip.ts";

const matches = [
  { id: "a", result: "1" },
  { id: "b", result: "X" },
  { id: "c", result: "2" },
];

test("la schedina vince soltanto se tutti i pronostici sono corretti", () => {
  assert.equal(evaluateSlipStatus(matches, { a: "1", b: "X", c: "2" }), "won");
});

test("un solo pronostico errato perde l'intera schedina", () => {
  assert.equal(evaluateSlipStatus(matches, { a: "1", b: "1", c: "2" }), "lost");
});

test("una schedina incompleta o con risultati mancanti resta in gioco", () => {
  assert.equal(evaluateSlipStatus(matches, { a: "1", b: "X" }), "pending");
  assert.equal(evaluateSlipStatus([{ id: "a", result: null }], { a: "1" }), "pending");
});
