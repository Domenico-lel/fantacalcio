import assert from "node:assert/strict";
import test from "node:test";

import { selectNextCompleteMatchday } from "../src/lib/serie-a-prediction-utils.ts";

function fixture(matchday, eventId, kickoff) {
  return {
    eventId,
    competition: "Serie A",
    homeName: `Casa ${eventId}`,
    awayName: `Ospite ${eventId}`,
    homeLogo: "",
    awayLogo: "",
    kickoff,
    status: "TIMED",
    matchday,
  };
}

test("ignora un recupero isolato e sceglie la prima giornata completa", () => {
  const recovery = fixture(12, "old", "2026-09-01T18:00:00Z");
  const full = Array.from({ length: 10 }, (_, index) =>
    fixture(13, String(index), `2026-09-0${2 + (index % 2)}T18:00:00Z`),
  );
  const selected = selectNextCompleteMatchday([recovery, ...full]);

  assert.equal(selected.length, 10);
  assert.ok(selected.every((match) => match.matchday === 13));
});

test("accetta una giornata con due rinvii", () => {
  const selected = selectNextCompleteMatchday(Array.from({ length: 8 }, (_, index) =>
    fixture(4, String(index), `2026-09-10T${10 + index}:00:00Z`),
  ));
  assert.equal(selected.length, 8);
  assert.ok(selected.every((match) => match.matchday === 4));
});
