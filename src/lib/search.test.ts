import assert from "node:assert/strict";
import { test } from "node:test";
import { omitStoredTags } from "./public-product.ts";
import { filterCatalog, matchesQuery, relevanceScore, withoutTagParam, type CatalogFilterProduct } from "./search.ts";

function item(partial: Partial<CatalogFilterProduct> & Pick<CatalogFilterProduct, "name">): CatalogFilterProduct {
  return {
    brand: "Test",
    description: "",
    tags: [],
    promoCodes: [],
    price: 20,
    discountPercent: 0,
    ...partial,
  };
}

test("private tags match vanilla when the name and description do not", () => {
  const vanilla = item({
    name: "Molecule 01",
    brand: "Escentric Molecules",
    description: "A quiet woody aroma.",
    tags: ["vanilla", "fragrance"],
  });
  const other = item({
    name: "Soft Pinch Liquid",
    brand: "Rare Beauty",
    description: "A weightless cream color for cheeks.",
    tags: ["blush"],
  });
  assert.equal(matchesQuery([vanilla.name, vanilla.brand, vanilla.description], "vanilla"), false);
  const matches = filterCatalog([vanilla, other], { q: "vanilla", dealsOnly: false });
  assert.deepEqual(
    matches.map((product) => product.name),
    ["Molecule 01"],
  );
  assert.ok(relevanceScore(vanilla, "vanilla") >= 3);
});

test("private tags match blush and rank above a passing mention", () => {
  const tagged = item({
    name: "Soft Pinch Liquid",
    brand: "Rare Beauty",
    description: "A weightless cream color for cheeks.",
    tags: ["blush", "makeup"],
  });
  const mention = item({
    name: "Daily Cream",
    brand: "Other",
    description: "A blush of color in the writeup only.",
    tags: ["skincare"],
  });
  const matches = filterCatalog([mention, tagged], { q: "blush", dealsOnly: false });
  assert.deepEqual(
    matches.map((product) => product.name),
    ["Daily Cream", "Soft Pinch Liquid"],
  );
  assert.ok(relevanceScore(tagged, "blush") > relevanceScore(mention, "blush"));
});

test("search URLs drop the tag param and keep the query", () => {
  const next = withoutTagParam(new URLSearchParams("tag=blush&q=red&minPrice=10"));
  assert.equal(next.get("tag"), null);
  assert.equal(next.get("q"), "red");
  assert.equal(next.get("minPrice"), "10");
  assert.equal(next.has("tag"), false);
});

test("public product JSON omits stored tags", () => {
  const pub = omitStoredTags({
    id: "rare-soft-pinch",
    name: "Soft Pinch Liquid",
    tags: ["blush", "vanilla"],
  });
  const json = JSON.stringify(pub);
  assert.equal("tags" in pub, false);
  assert.equal(json.includes("tags"), false);
  assert.equal(json.includes("blush"), false);
  assert.equal(json.includes("vanilla"), false);
  assert.equal(pub.name, "Soft Pinch Liquid");
});
