import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { precache } from "./build-sw.mjs";

test("precache lists every built file except sw.js, under the base path", () => {
  const dir = mkdtempSync(join(tmpdir(), "sw-"));
  mkdirSync(join(dir, "_next/static"), { recursive: true });
  writeFileSync(join(dir, "index.html"), "<html>");
  writeFileSync(join(dir, "_next/static/app.js"), "a");
  writeFileSync(join(dir, "sw.js"), "old");

  const first = precache(dir, "/startklar");
  assert.deepEqual(first.urls, ["/startklar/_next/static/app.js", "/startklar/index.html"]);

  writeFileSync(join(dir, "_next/static/app.js"), "b");
  assert.notEqual(precache(dir, "/startklar").version, first.version, "a changed file makes a new version");
});
