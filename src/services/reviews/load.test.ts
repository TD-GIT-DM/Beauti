import assert from "node:assert/strict";
import { test } from "node:test";
import { HostScheduler, SubrequestBudget } from "../deals/fetch-budget.ts";
import { fetchReviewSnapshot, type ReviewFetchCaches } from "./load.ts";

function outbound(limit = 45) {
  return {
    budget: new SubrequestBudget(limit),
    hosts: new HostScheduler({ gapMs: 0, sleep: async () => {} }),
  };
}

function caches(): ReviewFetchCaches {
  return { bv: new Map(), kv: null };
}

test("a Sephora product stores the Bazaarvoice average and shortens a full name", async () => {
  const calls: string[] = [];
  const result = await fetchReviewSnapshot({
    productUrl: "https://www.sephora.com/product/brow-wiz-P202633",
    brand: "Anastasia Beverly Hills",
    kind: "sephora",
    caches: caches(),
    outbound: outbound(),
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("bvapi.js")) {
        return new Response('passkey:"abc123xyzpasskeyvalue1",displaycode:"8723-en_us"', { status: 200 });
      }
      const body = {
        HasErrors: false,
        BatchedResults: {
          q0: {
            Results: [
              {
                Rating: 4,
                ReviewText: "Great brow pencil, but the spoolie falls off.",
                UserNickname: "lizzybee823",
                SubmissionTime: "2026-10-18T01:02:24.000+00:00",
              },
            ],
            Includes: {
              Products: {
                P202633: { Id: "P202633", ReviewStatistics: { AverageOverallRating: 4.3787, TotalReviewCount: 16457 } },
              },
            },
          },
          q1: {
            Results: [
              {
                Rating: 1,
                ReviewText: "Listen to the 1 star reviews and do not buy.",
                UserNickname: "Jennifer Smith",
                SubmissionTime: "2026-09-02T00:00:00.000Z",
              },
            ],
          },
          q2: { Results: [] },
        },
      };
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.snapshot.source, "Sephora");
  assert.equal(result.snapshot.sourceUrl, "https://www.sephora.com/product/brow-wiz-P202633");
  assert.equal(result.snapshot.rating, 4.3787);
  assert.equal(result.snapshot.count, 16457);
  assert.equal(result.snapshot.positive[0]?.author, "lizzybee823");
  assert.equal(result.snapshot.positive[0]?.text, "Great brow pencil, but the spoolie falls off.");
  assert.equal(result.snapshot.negative[0]?.author, "Jennifer S.");
  assert.equal(result.snapshot.negativeLabel, "negative");
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(result.snapshot).includes("tags"), false);
});

test("the review fetch stops when the subrequest budget is already spent", async () => {
  const result = await fetchReviewSnapshot({
    productUrl: "https://www.sephora.com/product/brow-wiz-P202633",
    brand: "Anastasia Beverly Hills",
    kind: "sephora",
    caches: caches(),
    outbound: outbound(0),
    fetchImpl: async () => new Response("nope", { status: 200 }),
  });
  assert.equal(result.kind, "budget");
});

test("a brand page with no review markup is an honest miss", async () => {
  const result = await fetchReviewSnapshot({
    productUrl: "https://example.com/products/plain",
    brand: "Example",
    kind: "page",
    caches: caches(),
    outbound: outbound(),
    fetchImpl: async () => new Response("<html><title>Plain</title><p>No reviews here.</p></html>", { status: 200 }),
  });
  assert.deepEqual(result, { kind: "none", sourceUrl: "https://example.com/products/plain" });
});

test("Yotpo comments come from the widget JSON, not from invented text", async () => {
  const result = await fetchReviewSnapshot({
    productUrl: "https://summerfridays.com/products/cc-me-serum",
    brand: "Summer Fridays",
    kind: "page",
    caches: caches(),
    outbound: outbound(),
    fetchImpl: async (url) => {
      if (url.includes("summerfridays.com")) {
        const html = `
          <html><script src="https://cdn-widgetsrepository.yotpo.com/v1/loader/hAnCQ8TdC1im1AlyOrM2vMEn3Fdg8zmmdzJ4M32n"></script>
          <div data-yotpo-product-id="3679778209869"></div></html>`;
        return new Response(html, { status: 200 });
      }
      const star = new URL(url).searchParams.get("star");
      if (star === "1") {
        return new Response(
          JSON.stringify({
            response: {
              bottomline: { average_score: 4.57, total_review: 1041, star_distribution: { "1": 63, "5": 863 } },
              reviews: [
                {
                  score: 1,
                  content: "This has cinnamon in it and my skin felt hot.",
                  created_at: "2026-08-01T00:00:00.000Z",
                  user: { display_name: "Stefanie P." },
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          response: {
            bottomline: { average_score: 4.573487, total_review: 1041, star_distribution: { "1": 63, "5": 863 } },
            reviews: [
              {
                score: 5,
                content: "Love the feeling on my skin.",
                created_at: "2026-09-29T13:49:09.000Z",
                user: { display_name: "Lindsay B." },
              },
            ],
          },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.snapshot.source, "Yotpo");
  assert.equal(result.snapshot.count, 1041);
  assert.equal(result.snapshot.positive[0]?.text, "Love the feeling on my skin.");
  assert.equal(result.snapshot.negative[0]?.text, "This has cinnamon in it and my skin felt hot.");
  assert.equal(result.snapshot.negative[0]?.author, "Stefanie P.");
});
