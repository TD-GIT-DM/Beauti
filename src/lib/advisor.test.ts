import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogShortlist,
  emptyCatalogReply,
  expandAdvisorQuery,
  groundAdvisorPick,
  parseAdvisorJson,
  templateReply,
} from "./advisor.ts";
import type { AdvisorProduct } from "../types.ts";

function product(partial: Partial<AdvisorProduct> & Pick<AdvisorProduct, "id" | "name" | "brand">): AdvisorProduct {
  return {
    description: "",
    imageUrl: "",
    price: 20,
    currency: "USD",
    tags: [],
    availability: "in_stock",
    restockEstimate: null,
    ...partial,
  };
}

const catalog: AdvisorProduct[] = [
  product({
    id: "kayali-vanilla-28",
    name: "Vanilla 28",
    brand: "Kayali",
    price: 88,
    tags: ["fragrance", "perfume", "vanilla"],
    description: "A warm vanilla perfume with brown sugar.",
  }),
  product({
    id: "jhag-vanilla-vibes",
    name: "Vanilla Vibes",
    brand: "Juliette Has a Gun",
    price: 95,
    tags: ["fragrance", "perfume"],
    description: "A salty skin vanilla scent.",
  }),
  product({
    id: "sol-de-janeiro-bum-bum",
    name: "Brazilian Bum Bum Cream",
    brand: "Sol de Janeiro",
    price: 48,
    tags: ["body", "skincare", "fragrance"],
    description: "Pistachio, salted caramel, and warm vanilla body cream.",
  }),
  product({
    id: "nars-radiant-caramel",
    name: "Radiant Creamy Concealer Caramel",
    brand: "NARS",
    price: 32,
    tags: ["concealer", "makeup", "coverage"],
    description: "Full coverage concealer that hides blemishes.",
  }),
  product({
    id: "estee-double-wear-2n1",
    name: "Double Wear Stay-in-Place Foundation 2N1",
    brand: "Estee Lauder",
    price: 52,
    tags: ["foundation", "makeup", "coverage"],
    description: "Full coverage foundation for uneven skin.",
  }),
  product({
    id: "fenty-gloss-bomb",
    name: "Gloss Bomb Universal Lip Luminizer",
    brand: "Fenty Beauty",
    price: 23,
    tags: ["lips", "makeup", "gloss"],
    description: "A high-shine lip gloss.",
  }),
  product({
    id: "ordinary-niacinamide",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    price: 6,
    tags: ["skincare", "serum", "niacinamide"],
    description: "Oil-balancing serum for congested or uneven texture.",
  }),
];

test("vanilla perfume shortlist stays on fragrance catalog items", () => {
  const picks = catalogShortlist(catalog, "what perfume smells like vanilla");
  assert.ok(picks.length >= 2);
  assert.ok(picks.some((p) => p.id === "kayali-vanilla-28"));
  assert.ok(picks.every((p) => /vanilla|fragrance|perfume/i.test(`${p.name} ${p.tags.join(" ")} ${p.description}`)));
  assert.ok(!picks.some((p) => p.id === "fenty-gloss-bomb"));
});

test("coverage questions prefer concealer and foundation", () => {
  const picks = catalogShortlist(catalog, "i need something that covers my bad skin");
  const ids = picks.map((p) => p.id);
  assert.ok(ids.includes("nars-radiant-caramel"));
  assert.ok(ids.includes("estee-double-wear-2n1"));
  assert.ok(!ids.includes("kayali-vanilla-28"));
});

test("out-of-catalog requests yield an empty shortlist", () => {
  const picks = catalogShortlist(catalog, "best iphone case");
  assert.equal(picks.length, 0);
  const query = expandAdvisorQuery("best iphone case");
  assert.match(emptyCatalogReply(query), /Nothing in the Beauti catalog/);
});

test("groundAdvisorPick drops invented SKUs", () => {
  const shortlist = catalogShortlist(catalog, "vanilla perfume");
  const grounded = groundAdvisorPick(
    { reply: "Try Chanel Coco Mademoiselle.", productIds: ["chanel-coco", "kayali-vanilla-28"] },
    shortlist,
    expandAdvisorQuery("vanilla perfume"),
  );
  assert.deepEqual(
    grounded.products.map((p) => p.id),
    ["kayali-vanilla-28"],
  );
  assert.ok(grounded.products.every((p) => shortlist.some((row) => row.id === p.id)));
  assert.doesNotMatch(grounded.reply, /Chanel/);
  assert.match(grounded.reply, /Kayali/);
});

test("parseAdvisorJson reads fenced model output", () => {
  const parsed = parseAdvisorJson({
    response: '```json\n{"reply":"Kayali Vanilla 28 is in stock.","productIds":["kayali-vanilla-28"]}\n```',
  });
  assert.deepEqual(parsed, {
    reply: "Kayali Vanilla 28 is in stock.",
    productIds: ["kayali-vanilla-28"],
  });
});

test("template reply names catalog products only", () => {
  const reply = templateReply([catalog[0]!]);
  assert.match(reply, /Kayali Vanilla 28/);
  assert.match(reply, /\$88\.00/);
  assert.match(reply, /in stock/);
  assert.doesNotMatch(reply, /Chanel/);
});
