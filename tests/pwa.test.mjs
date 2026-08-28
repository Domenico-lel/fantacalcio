import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("il manifest descrive una PWA standalone con icone iOS e maskable", async () => {
  const manifest = JSON.parse(await readFile(new URL("public/manifest.json", root), "utf8"));

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), ["/standings", "/pronostici", "/bacheca"]);
});

test("il service worker non intercetta API, richieste non GET o origini esterne", async () => {
  const worker = await readFile(new URL("public/sw.js", root), "utf8");

  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("la PWA non contiene gestori per notifiche push", async () => {
  const worker = await readFile(new URL("public/sw.js", root), "utf8");

  assert.doesNotMatch(worker, /addEventListener\(["']push["']/);
  assert.doesNotMatch(worker, /showNotification|Notification\.requestPermission|PushManager/);
});

test("la schermata offline contiene un messaggio e un comando di ripristino", async () => {
  const offline = await readFile(new URL("public/offline.html", root), "utf8");

  assert.match(offline, /Sei fuori gioco/);
  assert.match(offline, /location\.reload\(\)/);
  assert.match(offline, /viewport-fit=cover/);
});
