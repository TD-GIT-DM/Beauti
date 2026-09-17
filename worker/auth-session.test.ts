import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionCookie, sessionIdFrom, SESSION_HEADER } from "./session.ts";

test("sessionIdFrom prefers the native header over the cookie", () => {
  const request = new Request("https://beauti.tristan-morgenthaler.workers.dev/api/auth/me", {
    headers: {
      Cookie: "beauti_session=cookie-id",
      [SESSION_HEADER]: "header-id",
    },
  });
  assert.equal(sessionIdFrom(request), "header-id");
});

test("sessionIdFrom falls back to the HttpOnly cookie", () => {
  const request = new Request("https://beauti.tristan-morgenthaler.workers.dev/api/auth/me", {
    headers: { Cookie: "beauti_device=d1; beauti_session=cookie-id" },
  });
  assert.equal(sessionIdFrom(request), "cookie-id");
});

test("cross-site session cookie uses SameSite=None and Secure", () => {
  const value = sessionCookie("abc", true, true);
  assert.match(value, /SameSite=None/);
  assert.match(value, /Secure/);
  assert.match(value, /HttpOnly/);
});

test("same-site session cookie stays Lax", () => {
  const value = sessionCookie("abc", true, false);
  assert.match(value, /SameSite=Lax/);
});
