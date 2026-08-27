import assert from "node:assert/strict";
import test from "node:test";

import { canAccessCareer } from "../src/lib/career-release.ts";

test("i manager accedono alla Carriera soltanto quando è aperta", () => {
  assert.equal(canAccessCareer(false, false), false);
  assert.equal(canAccessCareer(false, true), true);
});

test("l'admin può collaudare la Carriera anche quando è in lavorazione", () => {
  assert.equal(canAccessCareer(true, false), true);
  assert.equal(canAccessCareer(true, true), true);
});
