import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveFantacalcioStandingsFromCalendar,
  parseFantacalcioLineupSummary,
  parseFantacalcioTeamName,
} from "../src/lib/fantacalcio-parser.ts";

test("legge il nome compatto n soltanto nel payload squadre", () => {
  assert.equal(parseFantacalcioTeamName({ id: 101, n: "CITY BLINDERS" }), "CITY BLINDERS");
  assert.equal(parseFantacalcioTeamName({ id: 102, name: "Nome esplicito", n: "Alias" }), "Nome esplicito");
  assert.equal(parseFantacalcioTeamName({ team: { id: 103, n: "Nome annidato" } }), "Nome annidato");
});

test("ricostruisce e ordina la prima giornata dai dati calendario reali", () => {
  const teams = new Map([
    ["1", "CITY BLINDERS"],
    ["2", "LELLATETTI FC"],
    ["3", "Paris Saint-Gemelli"],
    ["4", "MASIAMOVERI FC"],
    ["5", "Brigata Fantasma"],
    ["6", "Vinland Salernitana"],
    ["7", "ATLETICO ALOPECIA"],
    ["8", "Doflamengo"],
    ["9", "FC Etta Nera"],
    ["10", "CAZZ-A-THE FC"],
  ]);
  const match = (homeTeamId, awayTeamId, homeGoals, awayGoals, homePoints, awayPoints) => ({
    homeTeamId,
    awayTeamId,
    calculated: true,
    homePoints,
    awayPoints,
    homeGoals,
    awayGoals,
    homeStandingPoints: homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0,
    awayStandingPoints: awayGoals > homeGoals ? 3 : awayGoals === homeGoals ? 1 : 0,
  });
  const standings = deriveFantacalcioStandingsFromCalendar(teams, [
    match("1", "8", 2, 0, 76, 65.5),
    match("2", "9", 2, 0, 75.5, 64),
    match("3", "10", 2, 0, 74, 64),
    match("4", "5", 3, 3, 82, 81.5),
    match("6", "7", 2, 2, 76, 73.5),
  ]);

  assert.deepEqual(standings.map(({ teamName }) => teamName), [
    "CITY BLINDERS",
    "LELLATETTI FC",
    "Paris Saint-Gemelli",
    "MASIAMOVERI FC",
    "Brigata Fantasma",
    "Vinland Salernitana",
    "ATLETICO ALOPECIA",
    "Doflamengo",
    "FC Etta Nera",
    "CAZZ-A-THE FC",
  ]);
  assert.deepEqual(
    standings.map(({ played, won, drawn, lost, points }) => [played, won, drawn, lost, points]),
    [
      [1, 1, 0, 0, 3],
      [1, 1, 0, 0, 3],
      [1, 1, 0, 0, 3],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
    ],
  );
});

test("ignora le giornate non ancora calcolate", () => {
  const teams = new Map([["1", "Casa"], ["2", "Ospite"]]);
  assert.deepEqual(deriveFantacalcioStandingsFromCalendar(teams, [{
    homeTeamId: "1",
    awayTeamId: "2",
    calculated: false,
    homePoints: null,
    awayPoints: null,
    homeGoals: null,
    awayGoals: null,
    homeStandingPoints: null,
    awayStandingPoints: null,
  }]), []);
});

test("calcola il parziale live ignorando gli zero segnaposto", () => {
  assert.deepEqual(parseFantacalcioLineupSummary({
    tot: 0,
    mdl: "343",
    starts: [
      { cscr: 0 },
      { cscr: "6,5" },
      { cscr: 0 },
    ],
  }), {
    total: 6.5,
    formation: "343",
    playersWithVote: 1,
  });
});

test("non presenta come votata una formazione con soli zero", () => {
  assert.deepEqual(parseFantacalcioLineupSummary({
    tot: 0,
    mdl: 532,
    starts: Array.from({ length: 11 }, () => ({ cscr: 0 })),
  }), {
    total: null,
    formation: "532",
    playersWithVote: 0,
  });
});
