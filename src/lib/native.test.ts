import assert from "node:assert/strict";
import { test } from "node:test";
import { apiBase, isNativeBuild, LIVE_WORKER_ORIGIN } from "./native.ts";

test("web builds keep relative API paths", () => {
  assert.equal(isNativeBuild(), false);
  assert.equal(apiBase(), "");
});

test("live Worker origin is the production API", () => {
  assert.equal(LIVE_WORKER_ORIGIN, "https://beauti.tristan-morgenthaler.workers.dev");
});
