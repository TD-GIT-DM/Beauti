import { cleanAverage, cleanCount, reviewDate, type RawQuote } from "../../lib/reviews.ts";

export interface BvConfig {
  passkey: string;
  displayCode: string;
}

export interface ParsedReviews {
  rating: number | null;
  count: number | null;
  quotes: RawQuote[];
}

export interface PageSignals {
  yotpo: { appKey: string; productId: string } | null;
  okendo: { subscriberId: string; productId: string } | null;
  bazaarvoice: { client: string; site: string; productId: string } | null;
  rating: number | null;
  count: number | null;
  quotes: RawQuote[];
  /** Set when JSON-LD is the review source and the page names PowerReviews. */
  jsonLdSource: "PowerReviews" | null;
  unsupported: string | null;
}

export function parseBvApiScript(source: string): BvConfig | null {
  const pass = /passkey:"([A-Za-z0-9]+)"/.exec(source);
  if (!pass) return null;
  const codes = [...source.matchAll(/displaycode:"([^"]+)"/gi)].map((match) => match[1]);
  const displayCode = codes.find((code) => /en/i.test(code)) ?? codes[0];
  if (!displayCode) return null;
  return { passkey: pass[1], displayCode };
}

export function bazaarvoiceBatchUrl(config: BvConfig, productId: string): string {
  const params = new URLSearchParams();
  params.set("apiversion", "5.5");
  params.set("passkey", config.passkey);
  params.set("displaycode", config.displayCode);
  const sides: Array<[string, string]> = [
    ["q0", "rating:gte:4"],
    ["q1", "rating:lte:2"],
    ["q2", "rating:eq:3"],
  ];
  for (const [name, ratingFilter] of sides) {
    params.append(`resource.${name}`, "reviews");
    params.append(`filter.${name}`, `productid:eq:${productId}`);
    params.append(`filter.${name}`, ratingFilter);
    params.append(`filter.${name}`, "isratingsonly:eq:false");
    params.append(`limit.${name}`, "5");
    params.append(`sort.${name}`, "submissiontime:desc");
  }
  params.append("include.q0", "products");
  params.append("stats.q0", "reviews");
  return `https://api.bazaarvoice.com/data/batch.json?${params.toString()}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function quoteFromParts(ratingRaw: unknown, textRaw: unknown, dateRaw: unknown, authorRaw: unknown): RawQuote | null {
  const ratingNumber = typeof ratingRaw === "number" ? ratingRaw : typeof ratingRaw === "string" ? Number(ratingRaw) : NaN;
  if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) return null;
  if (typeof textRaw !== "string" || !textRaw.trim()) return null;
  const author = typeof authorRaw === "string" ? authorRaw : null;
  return {
    rating: ratingNumber,
    text: textRaw,
    date: reviewDate(dateRaw),
    author,
  };
}

function bvQuotes(results: unknown): RawQuote[] {
  if (!Array.isArray(results)) return [];
  const quotes: RawQuote[] = [];
  for (const item of results) {
    const row = asRecord(item);
    if (!row || row.IsRatingsOnly === true) continue;
    const text = typeof row.ReviewText === "string" && row.ReviewText.trim() ? row.ReviewText : row.Title;
    const quote = quoteFromParts(row.Rating, text, row.SubmissionTime, row.UserNickname);
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export function parseBazaarvoiceBatch(data: unknown, productId: string): ParsedReviews | null {
  const root = asRecord(data);
  if (!root) return null;
  const batched = asRecord(root.BatchedResults);
  if (!batched) return null;
  const quotes = [
    ...bvQuotes(asRecord(batched.q0)?.Results),
    ...bvQuotes(asRecord(batched.q1)?.Results),
    ...bvQuotes(asRecord(batched.q2)?.Results),
  ];
  const includes = asRecord(asRecord(batched.q0)?.Includes);
  const products = asRecord(includes?.Products);
  let stats: Record<string, unknown> | null = null;
  if (products) {
    const direct = asRecord(products[productId]);
    const match =
      direct ??
      Object.values(products)
        .map(asRecord)
        .find((product) => product?.Id === productId) ??
      null;
    stats = asRecord(match?.ReviewStatistics);
  }
  const errored = root.HasErrors === true && quotes.length === 0 && !stats;
  if (errored) return null;
  return {
    rating: cleanAverage(stats?.AverageOverallRating),
    count: cleanCount(stats?.TotalReviewCount),
    quotes,
  };
}

export function parseYotpoPayload(data: unknown): ParsedReviews & { distribution: Record<string, number> } | null {
  const response = asRecord(asRecord(data)?.response);
  if (!response) return null;
  const bottom = asRecord(response.bottomline);
  const distribution: Record<string, number> = {};
  const rawDist = asRecord(bottom?.star_distribution);
  if (rawDist) {
    for (const [key, value] of Object.entries(rawDist)) {
      const count = cleanCount(value);
      if (count != null) distribution[key] = count;
    }
  }
  const quotes: RawQuote[] = [];
  if (Array.isArray(response.reviews)) {
    for (const item of response.reviews) {
      const row = asRecord(item);
      if (!row) continue;
      const user = asRecord(row.user);
      const quote = quoteFromParts(row.score, row.content, row.created_at, user?.display_name);
      if (quote) quotes.push(quote);
    }
  }
  return {
    rating: cleanAverage(bottom?.average_score),
    count: cleanCount(bottom?.total_review),
    quotes,
    distribution,
  };
}

export function yotpoReviewsUrl(appKey: string, productId: string, star: number | null): string {
  const params = new URLSearchParams();
  params.set("per_page", "5");
  if (star != null) params.set("star", String(star));
  return `https://api.yotpo.com/v1/widget/${encodeURIComponent(appKey)}/products/${encodeURIComponent(productId)}/reviews.json?${params.toString()}`;
}

export function parseOkendoAggregate(data: unknown): { rating: number | null; count: number | null; levels: Record<number, number> } | null {
  const agg = asRecord(asRecord(data)?.reviewAggregate);
  if (!agg) return null;
  const count = cleanCount(agg.ratingAndReviewCount ?? agg.reviewCount);
  const total = cleanCount(agg.ratingAndReviewValuesTotal ?? agg.reviewRatingValuesTotal);
  const rating = count && total ? cleanAverage(total / count) : null;
  const levels: Record<number, number> = {};
  const byLevel = asRecord(agg.ratingAndReviewCountByLevel);
  if (byLevel) {
    for (let star = 1; star <= 5; star += 1) {
      levels[star] = cleanCount(byLevel[`level${star}Count`]) ?? 0;
    }
  }
  return { rating, count, levels };
}

export function parseOkendoReviews(data: unknown): RawQuote[] {
  const root = asRecord(data);
  if (!root || !Array.isArray(root.reviews)) return [];
  const quotes: RawQuote[] = [];
  for (const item of root.reviews) {
    const row = asRecord(item);
    if (!row) continue;
    const reviewer = asRecord(row.reviewer);
    const quote = quoteFromParts(row.rating, row.body ?? row.title, row.dateCreated, reviewer?.displayName);
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export function okendoAggregateUrl(subscriberId: string, productId: string): string {
  return `https://api.okendo.io/v1/stores/${encodeURIComponent(subscriberId)}/products/shopify-${encodeURIComponent(productId)}/review_aggregate`;
}

export function okendoReviewsUrl(subscriberId: string, productId: string, rating: number): string {
  const params = new URLSearchParams();
  params.set("limit", "5");
  params.set("orderBy", "date desc");
  params.set("ratings", String(rating));
  return `https://api.okendo.io/v1/stores/${encodeURIComponent(subscriberId)}/products/shopify-${encodeURIComponent(productId)}/reviews?${params.toString()}`;
}

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      collectProducts(JSON.parse(block[1]), products);
    } catch {
      // A broken block is ignored. Other blocks on the page can still be real.
    }
  }
  return products;
}

function collectProducts(node: unknown, products: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectProducts(item, products);
    return;
  }
  const record = asRecord(node);
  if (!record) return;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Product")) products.push(record);
  if (record["@graph"]) collectProducts(record["@graph"], products);
}

function productHandle(url: string): string | null {
  const match = /\/products\/([^/?#]+)/i.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

function jsonLdMatches(product: Record<string, unknown>, pageUrl: string): boolean {
  const handle = productHandle(pageUrl);
  if (!handle) return false;
  const values = [product.url, product["@id"], product.sku];
  return values.some((value) => typeof value === "string" && value.toLowerCase().includes(handle));
}

function readJsonLd(html: string, pageUrl: string): { rating: number | null; count: number | null; quotes: RawQuote[] } {
  const products = jsonLdProducts(html);
  const chosen = products.find((product) => jsonLdMatches(product, pageUrl)) ?? products.find((product) => product.aggregateRating) ?? null;
  if (!chosen) return { rating: null, count: null, quotes: [] };
  const agg = asRecord(chosen.aggregateRating);
  const quotes: RawQuote[] = [];
  const reviews = Array.isArray(chosen.review) ? chosen.review : chosen.review ? [chosen.review] : [];
  for (const item of reviews) {
    const row = asRecord(item);
    if (!row) continue;
    const ratingNode = asRecord(row.reviewRating);
    const authorNode = asRecord(row.author);
    const author = typeof row.author === "string" ? row.author : authorNode?.name;
    const quote = quoteFromParts(ratingNode?.ratingValue, row.reviewBody ?? row.description, row.datePublished, author);
    if (quote) quotes.push(quote);
  }
  return {
    rating: cleanAverage(agg?.ratingValue),
    count: cleanCount(agg?.reviewCount ?? agg?.ratingCount),
    quotes,
  };
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html);
  return match?.[1] ?? null;
}

function yotpoKey(html: string): string | null {
  return firstMatch(
    html,
    /(?:cdn-widgetsrepository\.yotpo\.com\/v1\/loader\/|staticw2\.yotpo\.com\/)([A-Za-z0-9_-]{15,80})/i,
  ) ?? firstMatch(html, /yotpoApiKey["']?\s*[:=]\s*["']([A-Za-z0-9_-]{15,80})/i);
}

function yotpoProductId(html: string): string | null {
  const widgetIds = [...html.matchAll(/data-yotpo-product-id="(\d+)"/g)].map((match) => match[1]);
  const gids = [...html.matchAll(/gid:\/\/shopify\/Product\/(\d+)/g)].map((match) => match[1]);
  return widgetIds.find((id) => gids.includes(id)) ?? widgetIds[0] ?? gids[0] ?? null;
}

function okendoSubscriber(html: string): string | null {
  return firstMatch(
    html,
    /subscriberId\\?":\\?"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
}

function okendoProductId(html: string): string | null {
  return (
    firstMatch(html, /productId=shopify-(\d+)/i) ??
    firstMatch(html, /productId\\?":\\?"shopify-(\d+)/i) ??
    firstMatch(html, /gid:\/\/shopify\/Product\/(\d+)/)
  );
}

function bazaarvoiceClient(html: string): { client: string; site: string } | null {
  const client = firstMatch(html, /BAZAARVOICE_CLIENT_NAME\\?",\\?"([A-Za-z0-9_-]+)/);
  if (!client || client.startsWith("BAZAARVOICE")) return null;
  const site = firstMatch(html, /BAZAARVOICE_SITE_ID\\?",\\?"([A-Za-z0-9_-]+)/);
  const cleanSite = site && !site.startsWith("BAZAARVOICE") ? site : "main_site";
  return { client, site: cleanSite };
}

function unsupportedWidget(html: string): string | null {
  const lower = html.toLowerCase();
  if (lower.includes("widgets.juniphq.com") || lower.includes("api.juniphq.com")) return "junip";
  if (lower.includes("stamped.io/api") || lower.includes("cdn1.stamped.io")) return "stamped";
  if (lower.includes("cdn.judge.me") || lower.includes("judge.me/reviews")) return "judge.me";
  return null;
}

export function readProductPage(html: string, pageUrl: string): PageSignals {
  const jsonLd = readJsonLd(html, pageUrl);
  const yotpoApp = yotpoKey(html);
  const yotpoId = yotpoProductId(html);
  const subscriberId = okendoSubscriber(html);
  const okendoId = okendoProductId(html);
  const bv = bazaarvoiceClient(html);
  const bvProduct = firstMatch(html, /gid:\/\/shopify\/Product\/(\d+)/);
  const powerReviews = /powerreviews\.com/i.test(html);
  return {
    yotpo: yotpoApp && yotpoId ? { appKey: yotpoApp, productId: yotpoId } : null,
    okendo: subscriberId && okendoId ? { subscriberId, productId: okendoId } : null,
    bazaarvoice: bv && bvProduct ? { client: bv.client, site: bv.site, productId: bvProduct } : null,
    rating: jsonLd.rating,
    count: jsonLd.count,
    quotes: jsonLd.quotes,
    jsonLdSource: powerReviews ? "PowerReviews" : null,
    unsupported: unsupportedWidget(html),
  };
}
