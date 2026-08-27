import assert from "node:assert/strict";
import test from "node:test";

import { calculateBookmakerConsensus } from "../src/lib/odds-consensus.ts";

test("rimuove il margine diverso dei bookmaker prima di creare il consenso", () => {
  const odds = calculateBookmakerConsensus([
    { odd1: 2.0, oddX: 3.4, odd2: 4.0 },
    { odd1: 1.9, oddX: 3.2, odd2: 3.8 },
    { odd1: 2.1, oddX: 3.5, odd2: 4.2 },
  ]);

  assert.ok(odds);
  assert.ok(odds.odd1 < odds.oddX);
  assert.ok(odds.oddX < odds.odd2);
  const overround = 1 / odds.odd1 + 1 / odds.oddX + 1 / odds.odd2;
  assert.ok(overround > 1.06 && overround < 1.1);
});

test("una fonte estrema non sposta il consenso quando ci sono almeno cinque bookmaker", () => {
  const normal = [
    { odd1: 2.0, oddX: 3.3, odd2: 4.0 },
    { odd1: 2.05, oddX: 3.4, odd2: 3.9 },
    { odd1: 1.95, oddX: 3.5, odd2: 4.1 },
    { odd1: 2.02, oddX: 3.35, odd2: 4.05 },
  ];
  const baseline = calculateBookmakerConsensus([...normal, normal[0]]);
  const withOutlier = calculateBookmakerConsensus([...normal, { odd1: 9, oddX: 1.2, odd2: 12 }]);

  assert.ok(baseline && withOutlier);
  assert.ok(Math.abs(baseline.odd1 - withOutlier.odd1) < 0.15);
  assert.ok(Math.abs(baseline.oddX - withOutlier.oddX) < 0.2);
  assert.ok(Math.abs(baseline.odd2 - withOutlier.odd2) < 0.2);
});

test("ignora lavagne incomplete o non valide", () => {
  assert.equal(calculateBookmakerConsensus([{ odd1: 2, oddX: 0, odd2: 4 }]), null);
  assert.equal(calculateBookmakerConsensus([]), null);
});
