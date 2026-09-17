import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCorsHeaders,
  handleCorsPreflight,
  isAllowedCorsOrigin,
  isPrivateIPv4,
  withCors,
} from "./cors.ts";

test("allows Capacitor, Ionic, localhost, and the live Worker origin", () => {
  const allowed = [
    "https://beauti.tristan-morgenthaler.workers.dev",
    "https://localhost",
    "http://localhost",
    "http://localhost:5173",
    "https://127.0.0.1",
    "http://192.168.1.20:5173",
    "http://10.0.0.8:5173",
    "capacitor://localhost",
    "ionic://localhost",
    "https://beauti-preview.tristan-morgenthaler.workers.dev",
  ];
  for (const origin of allowed) {
    assert.equal(isAllowedCorsOrigin(origin), true, origin);
  }
});

test("rejects unrelated public origins", () => {
  const blocked = [
    "",
    "https://evil.example",
    "https://sephora.com",
    "file://localhost",
    "https://example.workers.dev.evil.com",
  ];
  for (const origin of blocked) {
    assert.equal(isAllowedCorsOrigin(origin), false, origin);
  }
});

test("private IPv4 detection", () => {
  assert.equal(isPrivateIPv4("10.1.2.3"), true);
  assert.equal(isPrivateIPv4("192.168.0.1"), true);
  assert.equal(isPrivateIPv4("172.16.0.1"), true);
  assert.equal(isPrivateIPv4("172.31.255.255"), true);
  assert.equal(isPrivateIPv4("172.32.0.1"), false);
  assert.equal(isPrivateIPv4("8.8.8.8"), false);
  assert.equal(isPrivateIPv4("localhost"), false);
});

test("preflight echoes an allowed Origin and credentials", () => {
  const res = handleCorsPreflight(
    new Request("https://beauti.tristan-morgenthaler.workers.dev/api/products", {
      method: "OPTIONS",
      headers: { Origin: "https://localhost" },
    }),
  );
  assert.ok(res);
  if (!res) return;
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://localhost");
  assert.equal(res.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.match(res.headers.get("Access-Control-Allow-Headers") ?? "", /X-Beauti-Session/);
  assert.match(res.headers.get("Access-Control-Allow-Headers") ?? "", /X-Device-Id/);
});

test("withCors does not wildcard a blocked Origin", () => {
  const res = withCors(
    new Request("https://beauti.tristan-morgenthaler.workers.dev/api/health", {
      headers: { Origin: "https://evil.example" },
    }),
    new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
  );
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});

test("applyCorsHeaders sets expose header for the native session token", () => {
  const headers = new Headers();
  assert.equal(applyCorsHeaders(headers, "capacitor://localhost"), true);
  assert.equal(headers.get("Access-Control-Allow-Origin"), "capacitor://localhost");
  assert.equal(headers.get("Access-Control-Expose-Headers"), "X-Beauti-Session");
});
