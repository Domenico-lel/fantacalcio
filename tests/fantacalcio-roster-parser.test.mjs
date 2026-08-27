import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFantacalcioPlayerCatalog,
  parseFantacalcioRosterTeams,
} from "../src/lib/fantacalcio-roster-parser.ts";
import { buildRosterSyncPlan } from "../src/lib/roster-sync-plan.ts";

test("estrae le rose dal payload compatto di Leghe Fantacalcio", () => {
  const teams = parseFantacalcioRosterTeams({
    data: {
      items: [
        { id: 10, n: "LELLATETTI FC", cal: "5585;2764;5585;" },
        { id: 11, n: "MASIAMOVERI FC", cal: "100;200" },
        { id: 12, n: "RIGA NON AUTOREVOLE" },
      ],
    },
  });

  assert.deepEqual(teams, [
    { teamId: "10", teamName: "LELLATETTI FC", playerIds: ["5585", "2764"] },
    { teamId: "11", teamName: "MASIAMOVERI FC", playerIds: ["100", "200"] },
  ]);
});

test("legge nome, ruolo Classic e ID dal listone ufficiale", () => {
  const catalog = parseFantacalcioPlayerCatalog(`
    <table><tbody>
      <tr class="player-row" data-filter-role-classic="a">
        <th class="player-name"><a class="player-name player-link" href="https://www.fantacalcio.it/serie-a/squadre/roma/malen/5585"><span>Malen</span></a></th>
      </tr>
      <tr class="player-row featured" data-filter-role-classic="d">
        <th class="player-name"><a class="player-name player-link" href="/serie-a/squadre/inter/dambrosio/2764"><span>D&#39;Ambrosio</span></a></th>
      </tr>
    </tbody></table>
  `);

  assert.deepEqual(catalog.get("5585"), { sourceId: "5585", name: "Malen", role: "A" });
  assert.deepEqual(catalog.get("2764"), { sourceId: "2764", name: "D'Ambrosio", role: "D" });
});

test("riconcilia uno scambio inserendo il nuovo giocatore e rimuovendo il ceduto", () => {
  const plan = buildRosterSyncPlan(
    [
      { id: "keep", player_name: "Malen", role: "A", photo_url: "old.png" },
      { id: "sold", player_name: "Lautaro", role: "A", photo_url: "lautaro.png" },
    ],
    [
      { name: "Malen", role: "A", photoUrl: "new.png" },
      { name: "D'Ambrosio", role: "D", photoUrl: "dambrosio.png" },
    ],
  );

  assert.deepEqual(plan.insertions.map((player) => player.name), ["D'Ambrosio"]);
  assert.deepEqual(plan.updates, [{
    id: "keep",
    player: { name: "Malen", role: "A", photoUrl: "new.png" },
  }]);
  assert.deepEqual(plan.staleIds, ["sold"]);
});

test("rimuove anche eventuali duplicati storici della stessa rosa", () => {
  const plan = buildRosterSyncPlan(
    [
      { id: "first", player_name: "Malen", role: "A", photo_url: "malen.png" },
      { id: "duplicate", player_name: " Malen ", role: "A", photo_url: "malen.png" },
    ],
    [{ name: "Malen", role: "A", photoUrl: "malen.png" }],
  );

  assert.deepEqual(plan.insertions, []);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.staleIds, ["duplicate"]);
});
