import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { applyReading, classifyProductFetch, type PreorderEntry } from "../../lib/preorder.ts";
import {
  advanceCatalogCursor,
  budgetedFetch,
  CATALOG_CRON,
  fetchFailedError,
  HostScheduler,
  planCatalogIds,
  PREORDER_CRON,
  scheduledJob,
  spreadByHost,
  SUBREQUEST_BUDGET,
  SubrequestBudget,
  type BudgetedResponse,
} from "./fetch-budget.ts";

const NOW = "2026-09-25T05:25:51.000Z";

function entry(overrides: Partial<PreorderEntry> = {}): PreorderEntry {
  return {
    id: "shopify:example.com:item",
    kind: "coming_soon",
    name: "Sample",
    brand: "Sample Brand",
    description: "A real product description.",
    imageUrl: "https://cdn.example.com/a.jpg",
    productUrl: "https://example.com/products/item",
    sourceUrl: "https://example.com/products/item",
    price: 37,
    listPrice: null,
    announcedPercent: null,
    discountConfirmed: false,
    currency: "USD",
    startsAt: null,
    endsAt: null,
    datePrecision: "unconfirmed",
    dateLabel: null,
    status: "upcoming",
    linkedProductId: null,
    lastVerifiedAt: NOW,
    lastCheckedAt: null,
    lastCheckError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function quietHosts(gapMs = 0): HostScheduler {
  return new HostScheduler({ gapMs, sleep: async () => {} });
}

test("the outbound budget stops at 45 and counts every redirect hop", async () => {
  const budget = new SubrequestBudget();
  assert.equal(budget.limit, SUBREQUEST_BUDGET);
  assert.equal(SUBREQUEST_BUDGET, 45);
  for (let i = 0; i < 45; i++) assert.equal(budget.take(), true);
  assert.equal(budget.take(), false);
  assert.equal(budget.used, 45);
  assert.equal(budget.remaining(), 0);

  const limited = new SubrequestBudget(2);
  const calls: string[] = [];
  const redirected = await budgetedFetch({
    url: "https://shop.example/products/old",
    budget: limited,
    hosts: quietHosts(),
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.endsWith("/old")) {
        return new Response(null, { status: 302, headers: { location: "https://shop.example/products/new" } });
      }
      return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(redirected.error, null);
  assert.equal(redirected.text, '{"ok":true}');
  assert.equal(limited.used, 2);
  assert.deepEqual(calls, ["https://shop.example/products/old", "https://shop.example/products/new"]);

  const blocked = await budgetedFetch({
    url: "https://shop.example/products/again",
    budget: limited,
    hosts: quietHosts(),
    fetchImpl: async () => {
      throw new Error("should not fetch");
    },
  });
  assert.equal(blocked.error, "subrequest_budget_exhausted");
  assert.equal(limited.used, 2);
});

test("a thrown fetch keeps the message, and the platform subrequest error is named", () => {
  assert.equal(fetchFailedError(new Error("connect ECONNRESET")), "fetch_failed: connect ECONNRESET");
  assert.equal(fetchFailedError(new Error("Too many subrequests by worker.")), "subrequest_budget_exhausted");
  const long = fetchFailedError(new Error("x".repeat(500)));
  assert.ok(long.startsWith("fetch_failed: "));
  assert.ok(long.length <= 180);
});

test("429 respects Retry-After, skips the host, and is not a removal", async () => {
  let calls = 0;
  const budget = new SubrequestBudget();
  const hosts = quietHosts();
  const fetchImpl = async () => {
    calls += 1;
    return new Response("", { status: 429, headers: { "retry-after": "30" } });
  };
  const first = await budgetedFetch({
    url: "https://fentybeauty.com/products/a.js",
    budget,
    hosts,
    fetchImpl,
  });
  assert.equal(first.error, "http_429 retry_after=30");
  assert.equal(first.status, 429);
  assert.equal(budget.used, 1);

  const second = await budgetedFetch({
    url: "https://fentybeauty.com/products/b.js",
    budget,
    hosts,
    fetchImpl,
  });
  assert.equal(calls, 1);
  assert.match(second.error ?? "", /^http_429 retry_after=/);
  assert.equal(budget.used, 1);

  const reading = classifyProductFetch(first);
  assert.equal(reading?.ok, false);
  if (reading && !reading.ok) {
    const next = applyReading(entry({ lastVerifiedAt: NOW }), reading, "2026-09-29T16:00:00.000Z");
    assert.equal(next.status, "upcoming");
    assert.equal(next.lastVerifiedAt, NOW);
    assert.equal(next.lastCheckError, "http_429 retry_after=30");
  }

  const gone = classifyProductFetch({ status: 404, text: null, contentType: null, error: "http_404" });
  assert.equal(gone?.ok, true);
  if (gone?.ok) assert.equal(gone.found, false);

  const missingHeader = await budgetedFetch({
    url: "https://oliveandjune.com/products/c.js",
    budget: new SubrequestBudget(),
    hosts: quietHosts(),
    fetchImpl: async () => new Response("", { status: 429 }),
  });
  assert.equal(missingHeader.error, "http_429 retry_after=15");
});

test("a short Retry-After is waited once, then the next response is kept", async () => {
  const slept: number[] = [];
  let n = 0;
  const hosts = new HostScheduler({
    gapMs: 0,
    sleep: async (ms) => {
      slept.push(ms);
    },
  });
  const result = await budgetedFetch({
    url: "https://www.makeupbymario.com/products/trio",
    budget: new SubrequestBudget(),
    hosts,
    init: {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    },
    fetchImpl: async (_url, init) => {
      n += 1;
      const ua = new Headers(init?.headers).get("user-agent") ?? "";
      assert.match(ua, /Mozilla\/5.0/);
      if (n === 1) return new Response("", { status: 429, headers: { "retry-after": "1" } });
      return new Response("<p>COMING SOON: JOIN THE WAITLIST</p>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    },
  });
  assert.equal(n, 2);
  assert.deepEqual(slept, [1000]);
  assert.equal(result.error, null);
  assert.match(result.text ?? "", /JOIN THE WAITLIST/);
});

test("thrown fetches surface fetch_failed and do not remove the row", async () => {
  const result = await budgetedFetch({
    url: "https://fentybeauty.com/products/a.js",
    budget: new SubrequestBudget(),
    hosts: quietHosts(),
    fetchImpl: async () => {
      throw new Error("Network connection lost.");
    },
  });
  assert.equal(result.error, "fetch_failed: Network connection lost.");
  const reading = classifyProductFetch(result as BudgetedResponse);
  assert.equal(reading?.ok, false);
  if (reading && !reading.ok) {
    const next = applyReading(entry(), reading, "2026-09-29T16:00:00.000Z");
    assert.equal(next.status, "upcoming");
    assert.equal(next.lastVerifiedAt, NOW);
    assert.equal(next.lastCheckError, "fetch_failed: Network connection lost.");
  }
});

test("catalog rotation covers every id and does not skip rows the budget did not start", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  let cursor = 0;
  const seen = new Set<string>();
  for (let turn = 0; turn < 3; turn++) {
    const planned = planCatalogIds(ids, cursor, [], { cap: 2, priorityCap: 0 });
    assert.equal(planned.length, 2);
    for (const id of planned) seen.add(id);
    cursor = advanceCatalogCursor(ids.length, cursor, planned, new Set());
  }
  assert.equal(seen.size, ids.length);

  const partial = planCatalogIds(ids, 0, [], { cap: 4, priorityCap: 0 });
  const started = partial.slice(0, 1);
  assert.equal(advanceCatalogCursor(ids.length, 0, started, new Set()), 1);
  assert.equal(planCatalogIds(ids, 1, [], { cap: 4, priorityCap: 0 })[0], "b");

  const withPriority = planCatalogIds(["a", "b", "c", "d"], 0, ["a", "a"], { cap: 3, priorityCap: 1 });
  assert.deepEqual(withPriority, ["a", "b", "c"]);
  assert.equal(advanceCatalogCursor(4, 0, ["a"], new Set(["a"])), 0);
});

test("same-host requests wait, and a batch is interleaved across hosts", async () => {
  let now = 1_000;
  const slept: number[] = [];
  const hosts = new HostScheduler({
    gapMs: 400,
    now: () => now,
    sleep: async (ms) => {
      slept.push(ms);
      now += ms;
    },
  });
  assert.deepEqual(await hosts.beforeRequest("sephora.com"), { skipped: false });
  assert.deepEqual(await hosts.beforeRequest("fentybeauty.com"), { skipped: false });
  assert.deepEqual(await hosts.beforeRequest("sephora.com"), { skipped: false });
  assert.deepEqual(slept, [400]);

  const items = [
    { host: "makeupbymario.com", id: "m1" },
    { host: "makeupbymario.com", id: "m2" },
    { host: "fentybeauty.com", id: "f1" },
    { host: "oliveandjune.com", id: "o1" },
  ];
  assert.deepEqual(
    spreadByHost(items, (item) => item.host).map((item) => item.id),
    ["m1", "f1", "o1", "m2"],
  );
});

test("crons dispatch pre-orders and catalog onto separate invocations", () => {
  assert.equal(scheduledJob(PREORDER_CRON), "preorders");
  assert.equal(scheduledJob(CATALOG_CRON), "catalog");
  assert.equal(scheduledJob(undefined), "both");
  assert.equal(scheduledJob(""), "both");
  const toml = readFileSync(new URL("../../../wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /crons = \["\*\/15 \* \* \* \*", "8,23,38,53 \* \* \* \*"\]/);
  const scheduled = readFileSync(new URL("../../../worker/scheduled.ts", import.meta.url), "utf8");
  assert.match(scheduled, /scheduledJob\(cron\)/);
  assert.match(scheduled, /job/);
  const scan = readFileSync(new URL("./preorder-scan.ts", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("./catalog-sources.ts", import.meta.url), "utf8");
  assert.match(scan, /CATALOG_UA/);
  assert.match(catalog, /CATALOG_UA/);
  assert.match(scan, /subrequest_budget_exhausted/);
});
