import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseBazaarvoiceBatch,
  parseBvApiScript,
  parseOkendoAggregate,
  parseYotpoPayload,
  readProductPage,
} from "./parse.ts";

const BV_SCRIPT = `
apiconfig:{limit:10,passkey:"qc3y6yhnlrv2qar7y4vc90kbs",baseUrl:"//api.bazaarvoice.com/data/"}
contentLocales:["en_US"],displaycode:"8723-en_us"}
displaycode:"8723"
`;

test("a Bazaarvoice loader script yields the public display passkey", () => {
  assert.deepEqual(parseBvApiScript(BV_SCRIPT), {
    passkey: "qc3y6yhnlrv2qar7y4vc90kbs",
    displayCode: "8723-en_us",
  });
});

test("a Sephora batch keeps the overall average and both high and low comments", () => {
  const parsed = parseBazaarvoiceBatch(
    {
      HasErrors: false,
      BatchedResults: {
        q0: {
          Results: [
            {
              Rating: 5,
              ReviewText: "The pencil is precise.",
              UserNickname: "lizzybee823",
              SubmissionTime: "2026-10-18T01:02:24.000+00:00",
              IsRatingsOnly: false,
            },
            { Rating: 5, ReviewText: "", Title: "Nice", UserNickname: "A", IsRatingsOnly: true },
          ],
          Includes: {
            Products: {
              P202633: {
                Id: "P202633",
                ReviewStatistics: { AverageOverallRating: 4.3787, TotalReviewCount: 16457 },
              },
            },
          },
        },
        q1: {
          Results: [
            {
              Rating: 1,
              ReviewText: "It snapped in the tube.",
              UserNickname: "Jennifer Smith",
              SubmissionTime: "2026-09-01T00:00:00.000Z",
            },
          ],
        },
        q2: {
          Results: [
            {
              Rating: 3,
              ReviewText: "Fine, not great.",
              UserNickname: "Pat",
              SubmissionTime: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      },
    },
    "P202633",
  );
  assert.equal(parsed?.rating, 4.3787);
  assert.equal(parsed?.count, 16457);
  assert.equal(parsed?.quotes.map((quote) => quote.rating).join(","), "5,1,3");
  assert.equal(parsed?.quotes[1]?.author, "Jennifer Smith");
});

test("three star comments stay available when the low bucket is empty", () => {
  const parsed = parseBazaarvoiceBatch(
    {
      HasErrors: false,
      BatchedResults: {
        q0: { Results: [], Includes: { Products: {} } },
        q1: { Results: [] },
        q2: {
          Results: [
            {
              Rating: 3,
              ReviewText: "It is just okay.",
              UserNickname: "sam",
              SubmissionTime: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      },
    },
    "P1",
  );
  assert.equal(parsed?.quotes[0]?.rating, 3);
});

test("Yotpo bottom line and Okendo totals are read as the source wrote them", () => {
  const yotpo = parseYotpoPayload({
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
  });
  assert.equal(yotpo?.rating, 4.573487);
  assert.equal(yotpo?.count, 1041);
  assert.equal(yotpo?.distribution["1"], 63);
  assert.equal(yotpo?.quotes[0]?.text, "Love the feeling on my skin.");

  const okendo = parseOkendoAggregate({
    reviewAggregate: {
      ratingAndReviewCount: 688,
      ratingAndReviewValuesTotal: 3402,
      ratingAndReviewCountByLevel: { level1Count: 2, level5Count: 663 },
    },
  });
  assert.equal(okendo?.count, 688);
  assert.ok(okendo?.rating && Math.abs(okendo.rating - 3402 / 688) < 0.000001);
  assert.equal(okendo?.levels[1], 2);
  assert.equal(okendo?.levels[5], 663);
});

test("a product page points at the review app that is actually embedded", () => {
  const html = `
    <script type="application/ld+json">
      {"@type":"Product","url":"https://summerfridays.com/products/cc-me-serum","aggregateRating":{"ratingValue":"4.6","reviewCount":"1070"}}
    </script>
    <script src="https://cdn-widgetsrepository.yotpo.com/v1/loader/hAnCQ8TdC1im1AlyOrM2vMEn3Fdg8zmmdzJ4M32n"></script>
    <div data-yotpo-product-id="3679778209869"></div>
    <span>okendo</span>
  `;
  const page = readProductPage(html, "https://summerfridays.com/products/cc-me-serum");
  assert.equal(page.yotpo?.appKey, "hAnCQ8TdC1im1AlyOrM2vMEn3Fdg8zmmdzJ4M32n");
  assert.equal(page.yotpo?.productId, "3679778209869");
  assert.equal(page.rating, 4.6);
  assert.equal(page.count, 1070);
  assert.equal(page.okendo, null);
});

test("JSON-LD review text is kept and PowerReviews is named when that script is present", () => {
  const html = `
    <script src="https://ui.powerreviews.com/stable/4.1/ui.js"></script>
    <script type="application/ld+json">
      {"@type":"Product","name":"Sponge","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.96","reviewCount":"27"},
       "review":[{"@type":"Review","author":{"@type":"Person","name":"Clare Smith"},"reviewBody":"Soft and easy to clean.","reviewRating":{"ratingValue":"5"},"datePublished":"2026-04-02"}]}
    </script>
  `;
  const page = readProductPage(html, "https://realtechniques.com/products/miracle-complexion-sponge");
  assert.equal(page.jsonLdSource, "PowerReviews");
  assert.equal(page.quotes[0]?.text, "Soft and easy to clean.");
  assert.equal(page.quotes[0]?.author, "Clare Smith");
  assert.equal(page.yotpo, null);
});
