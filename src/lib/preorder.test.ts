import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyReading,
  classifyComingSoonPage,
  entryFromReading,
  entryFromRow,
  extractShipWindow,
  formatCountdown,
  interpretShopifyProduct,
  isListed,
  listedDiscount,
  plainText,
  preorderTiming,
  readAnnouncedSale,
  toPublicPreorder,
  type PreorderEntry,
  type ShopifyReadContext,
} from "./preorder.ts";

const NOW = "2026-09-25T05:25:51.000Z";
const NOW_MS = Date.parse(NOW);

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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function ctx(overrides: Partial<ShopifyReadContext> = {}): ShopifyReadContext {
  return {
    host: "example.com",
    productUrl: "https://example.com/products/item",
    sourceUrl: "https://example.com/products/item",
    unit: "dollars",
    pageHtml: null,
    pageLoaded: false,
    now: new Date(NOW),
    ...overrides,
  };
}

test("countdown formats days and a ticking clock", () => {
  const twoDays = 2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5000;
  assert.equal(formatCountdown(twoDays), "2d 03h 04m 05s");
  assert.equal(formatCountdown(90000), "00h 01m 30s");
  assert.equal(formatCountdown(-10), "00h 00m 00s");
});

test("datetime start uses a countdown and drops when that instant passes", () => {
  const future = entry({
    kind: "upcoming_deal",
    datePrecision: "datetime",
    startsAt: "2026-11-06T14:00:00.000Z",
    lastVerifiedAt: "2026-11-06T13:00:00.000Z",
  });
  const timing = preorderTiming(future, NOW_MS);
  assert.equal(timing.mode, "countdown");
  assert.equal(timing.text, "Starts in");
  assert.equal(timing.countdownTo, Date.parse("2026-11-06T14:00:00.000Z"));
  assert.equal(isListed(future, Date.parse("2026-11-06T13:30:00.000Z")), true);
  assert.equal(isListed(future, Date.parse("2026-11-06T14:00:00.000Z")), false);
  assert.equal(preorderTiming(future, Date.parse("2026-11-06T14:00:01.000Z")).ended, true);
});

test("a date without a time is shown as a date, not a countdown", () => {
  const dated = entry({
    kind: "upcoming_deal",
    datePrecision: "date",
    startsAt: "2026-11-06",
  });
  const timing = preorderTiming(dated, NOW_MS);
  assert.equal(timing.mode, "text");
  assert.equal(timing.text, "Starts November 6, 2026");
  assert.equal(timing.countdownTo, null);
  const onTheDay = entry({
    kind: "upcoming_deal",
    datePrecision: "date",
    startsAt: "2026-11-06",
    lastVerifiedAt: "2026-11-06T12:00:00.000Z",
  });
  assert.equal(isListed(onTheDay, Date.parse("2026-11-06T23:00:00.000Z")), true);
  assert.equal(isListed(onTheDay, Date.parse("2026-11-07T00:00:00.000Z")), false);
});

test("month label and unconfirmed copy do not invent a clock", () => {
  const month = entry({ datePrecision: "month", dateLabel: "Ships in October" });
  assert.equal(preorderTiming(month, NOW_MS).text, "Ships in October");
  assert.equal(preorderTiming(entry(), NOW_MS).text, "Release date not announced");
  assert.equal(
    preorderTiming(entry({ kind: "upcoming_deal" }), NOW_MS).text,
    "Start date not announced",
  );
  assert.equal(preorderTiming(month, NOW_MS).text.includes("\u2014"), false);
});

test("stale or unconfirmed checks are hidden", () => {
  assert.equal(isListed(entry(), NOW_MS), true);
  const stale = entry({ lastVerifiedAt: new Date(NOW_MS - 36 * 60 * 60 * 1000 - 1000).toISOString() });
  assert.equal(isListed(stale, NOW_MS), false);
  assert.equal(isListed(entry({ lastVerifiedAt: null }), NOW_MS), false);
  assert.equal(isListed(entry({ status: "live" }), NOW_MS), false);
  assert.equal(isListed(entry({ productUrl: "https://www.google.com/search?q=lipstick" }), NOW_MS), false);
});

test("public preorders omit tags and only confirm a real discount", () => {
  const row = entry({ price: 60, listPrice: 128, discountConfirmed: false });
  const pub = toPublicPreorder(row, true, NOW_MS);
  assert.ok(pub);
  assert.equal(pub.discountPercent, 0);
  assert.equal(pub.wishlisted, true);
  assert.equal(Object.hasOwn(pub, "tags"), false);
  assert.equal(listedDiscount(entry({ price: 60, listPrice: 128, discountConfirmed: true, announcedPercent: null })), 53);
  assert.equal(listedDiscount(entry({ announcedPercent: 20, discountConfirmed: true, price: null })), 20);
  assert.equal(listedDiscount(entry({ price: 0, listPrice: 40, discountConfirmed: true })), 0);
});

test("failed checks do not refresh verification, and a passed start is removed", () => {
  const original = entry({ lastVerifiedAt: "2026-09-24T00:00:00.000Z" });
  const failed = applyReading(original, { ok: false }, NOW);
  assert.equal(failed.lastVerifiedAt, "2026-09-24T00:00:00.000Z");
  assert.equal(failed.status, "upcoming");

  const missing = applyReading(original, { ok: true, found: false, stillPending: false, nowLive: false }, NOW);
  assert.equal(missing.status, "removed");
  assert.equal(missing.lastVerifiedAt, NOW);

  const slipped = applyReading(
    entry({ datePrecision: "datetime", startsAt: "2026-09-01T00:00:00.000Z" }),
    {
      ok: true,
      found: true,
      stillPending: true,
      nowLive: false,
      datePrecision: "datetime",
      startsAt: "2026-09-01T00:00:00.000Z",
    },
    NOW,
  );
  assert.equal(slipped.status, "removed");

  const moved = applyReading(
    entry({ datePrecision: "datetime", startsAt: "2026-09-01T00:00:00.000Z" }),
    {
      ok: true,
      found: true,
      stillPending: true,
      nowLive: false,
      datePrecision: "datetime",
      startsAt: "2026-12-01T15:00:00.000Z",
    },
    NOW,
  );
  assert.equal(moved.status, "upcoming");
  assert.equal(moved.startsAt, "2026-12-01T15:00:00.000Z");

  const live = applyReading(original, { ok: true, found: true, stillPending: false, nowLive: true, price: 37 }, NOW);
  assert.equal(live.status, "live");
  assert.equal(live.price, 37);
});

test("shopify coming soon, preorder, and waitlist pages stay pending", () => {
  const blocked = interpretShopifyProduct(
    {
      title: "The Bounce Besties",
      vendor: "Fenty Hair",
      tags: ["badge|COMING SOON", "hol26"],
      body_html: "<p>Put your best curls on display.</p>",
      variants: [{ available: false, price: "37.00", compare_at_price: null }],
      images: [{ src: "https://cdn.shopify.com/s/files/1/a.jpg?v=123" }],
    },
    ctx({ host: "fentybeauty.com", unit: "dollars" }),
  );
  assert.equal(blocked.ok && blocked.stillPending, true);
  assert.equal(blocked.ok && blocked.price, 37);
  assert.equal(blocked.ok && blocked.imageUrl, "https://cdn.shopify.com/s/files/1/a.jpg");
  assert.equal(blocked.ok && blocked.datePrecision, "unconfirmed");
  assert.equal(blocked.ok && blocked.discountConfirmed, false);

  const brush = interpretShopifyProduct(
    {
      title: "Pro Signature Brush Collection",
      vendor: "Patrick Ta Beauty",
      tags: ["badge_coming soon"],
      variants: [{ available: false, price: "0.00" }],
    },
    ctx({ host: "patrickta.com" }),
  );
  assert.equal(brush.ok && brush.price, null);
  assert.equal(brush.ok && brush.stillPending, true);

  const preorder = interpretShopifyProduct(
    {
      title: "12 Days of Mani Magic - Holiday Calendar",
      vendor: "calendar",
      tags: ["preorder"],
      variants: [{ available: true, price: "60.00", compare_at_price: "128.00" }],
    },
    ctx({
      host: "oliveandjune.com",
      pageLoaded: true,
      pageHtml: "<p>Orders with 12 Days of Mani Magic - Holiday Calendar will ship in October.</p>",
    }),
  );
  assert.equal(preorder.ok && preorder.brand, "Olive & June");
  assert.equal(preorder.ok && preorder.price, 60);
  assert.equal(preorder.ok && preorder.listPrice, 128);
  assert.equal(preorder.ok && preorder.discountConfirmed, false);
  assert.equal(preorder.ok && preorder.dateLabel, "Ships in October");
  assert.equal(preorder.ok && preorder.nowLive, false);

  const waitlist = "<button class=\"js-open-modal-coming-soon\">COMING SOON: JOIN THE WAITLIST</button>";
  const mario = interpretShopifyProduct(
    {
      title: "Mario's Face & Eye Brush Trio",
      vendor: "MAKEUP BY MARIO",
      tags: ["coming-soon", "tag:COMING SOON"],
      description: "Limited-edition set of three brushes.",
      variants: [{ available: true, price: 7900 }],
    },
    ctx({ host: "www.makeupbymario.com", unit: "cents", pageLoaded: true, pageHtml: waitlist }),
  );
  assert.equal(mario.ok && mario.stillPending, true);
  assert.equal(mario.ok && mario.brand, "Makeup by Mario");
  assert.equal(mario.ok && mario.price, 79);

  const unchecked = interpretShopifyProduct(
    {
      title: "Mario's Face & Eye Brush Trio",
      tags: ["coming-soon"],
      variants: [{ available: true, price: "79.00" }],
    },
    ctx({ host: "makeupbymario.com", pageLoaded: false }),
  );
  assert.equal(unchecked.ok, false);
});

test("an available product with a stale coming soon tag is live once add to cart is on the page", () => {
  const live = interpretShopifyProduct(
    {
      title: "Wet Stick",
      vendor: "Kosas",
      tags: ["coming-soon"],
      variants: [{ available: true, price: "25.00", compare_at_price: "24.00" }],
    },
    ctx({
      host: "kosas.com",
      pageLoaded: true,
      pageHtml: "<button aria-label=\"Add to cart\"></button>",
    }),
  );
  assert.equal(live.ok && live.nowLive, true);
  assert.equal(live.ok && live.listPrice, null);
});

test("announced percent and start date become an upcoming deal only while that date is still ahead", () => {
  const upcoming = interpretShopifyProduct(
    {
      title: "Holiday set",
      vendor: "Example",
      tags: [],
      body_html: "<p>Members get 20% off. The sale starts November 6, 2026.</p>",
      variants: [{ available: true, price: "40.00" }],
    },
    ctx(),
  );
  assert.equal(upcoming.ok && upcoming.kind, "upcoming_deal");
  assert.equal(upcoming.ok && upcoming.announcedPercent, 20);
  assert.equal(upcoming.ok && upcoming.startsAt, "2026-11-06");
  assert.equal(upcoming.ok && upcoming.price, null);
  assert.equal(upcoming.ok && upcoming.discountConfirmed, true);

  const past = readAnnouncedSale("Members get 20% off. The sale starts November 6, 2026.", new Date("2026-11-07T00:00:00.000Z"));
  assert.equal(past, null);
  assert.equal(readAnnouncedSale("Save big soon", new Date(NOW)), null);
});

test("ship window and page class follow the source wording", () => {
  assert.deepEqual(extractShipWindow("<p>Orders will ship in October.</p>"), { label: "Ships in October" });
  assert.equal(extractShipWindow("<p>Free shipping in October.</p>"), null);
  assert.equal(classifyComingSoonPage("<button>COMING SOON: JOIN THE WAITLIST</button>"), "pending");
  assert.equal(classifyComingSoonPage("<button data-add-to-cart>Add</button>"), "live");
  assert.equal(classifyComingSoonPage("<p>Hello</p>"), "unknown");
  assert.equal(plainText("<span>L</span>ong-wear &amp; shine"), "Long-wear & shine");
});

test("a new reading is stored only when it is still pending and listable", () => {
  const reading = interpretShopifyProduct(
    {
      title: "The Bounce Besties",
      vendor: "Fenty Hair",
      tags: ["badge|COMING SOON"],
      variants: [{ available: false, price: "37.00" }],
    },
    ctx({ host: "fentybeauty.com", productUrl: "https://fentybeauty.com/products/the-bounce-besties", sourceUrl: "https://fentybeauty.com/products/the-bounce-besties" }),
  );
  const created = entryFromReading("shopify:fentybeauty.com:the-bounce-besties", reading, NOW);
  assert.ok(created);
  assert.equal(created.status, "upcoming");
  assert.equal(isListed(created, NOW_MS), true);

  const gone = entryFromReading("x", { ok: true, found: false, stillPending: false, nowLive: false }, NOW);
  assert.equal(gone, null);
});

test("database rows with a zero price do not become a public price", () => {
  const parsed = entryFromRow({
    id: "shopify:patrickta.com:pro-signature-brush-collection",
    kind: "coming_soon",
    name: "Pro Signature Brush Collection",
    brand: "Patrick Ta Beauty",
    description: "The brand page does not include a description yet.",
    image_url: null,
    product_url: "https://patrickta.com/products/pro-signature-brush-collection",
    source_url: "https://patrickta.com/products/pro-signature-brush-collection",
    price: 0,
    list_price: null,
    announced_percent: null,
    discount_confirmed: 0,
    currency: "USD",
    starts_at: null,
    ends_at: null,
    date_precision: "unconfirmed",
    date_label: null,
    status: "upcoming",
    linked_product_id: null,
    last_verified_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  });
  assert.ok(parsed);
  assert.equal(parsed.price, null);
  const pub = toPublicPreorder(parsed, false, NOW_MS);
  assert.equal(pub?.price, null);
  assert.equal(pub?.discountPercent, 0);
});
