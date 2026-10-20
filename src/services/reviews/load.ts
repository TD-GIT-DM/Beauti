import { budgetedFetch, type FetchImpl, type OutboundFetch } from "../deals/fetch-budget.ts";

/** Same browser UA as the catalog quotes. Kept local so this module can load in node tests. */
const REVIEW_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function sephoraProductId(url: string): string | null {
  const match = /[-/]P(\d+)/i.exec(url || "");
  return match ? `P${match[1]}` : null;
}
import { pickReviewSides, type RawQuote } from "../../lib/reviews.ts";
import {
  bazaarvoiceBatchUrl,
  okendoAggregateUrl,
  okendoReviewsUrl,
  parseBazaarvoiceBatch,
  parseBvApiScript,
  parseOkendoAggregate,
  parseOkendoReviews,
  parseYotpoPayload,
  readProductPage,
  yotpoReviewsUrl,
  type BvConfig,
  type PageSignals,
  type ParsedReviews,
} from "./parse.ts";

export interface ReviewSnapshot {
  rating: number | null;
  count: number | null;
  source: string;
  sourceUrl: string;
  positive: ReturnType<typeof pickReviewSides>["positive"];
  negative: ReturnType<typeof pickReviewSides>["negative"];
  negativeLabel: ReturnType<typeof pickReviewSides>["negativeLabel"];
}

export type ReviewFetchResult =
  | { kind: "ok"; snapshot: ReviewSnapshot }
  | { kind: "none"; sourceUrl: string }
  | { kind: "error"; error: string }
  | { kind: "budget" };

export interface ReviewKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface ReviewFetchCaches {
  bv: Map<string, BvConfig>;
  kv: ReviewKv | null;
}

const BV_TTL_SECONDS = 7 * 24 * 60 * 60;
const PAGE_API_CALLS = 3;

function headers(accept: string, referer: string): HeadersInit {
  return {
    "User-Agent": REVIEW_UA,
    Accept: accept,
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
  };
}

async function getText(args: {
  url: string;
  accept: string;
  referer: string;
  outbound: OutboundFetch;
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
}): Promise<{ text: string | null; error: string | null; budget: boolean }> {
  const result = await budgetedFetch({
    url: args.url,
    budget: args.outbound.budget,
    hosts: args.outbound.hosts,
    timeoutMs: args.timeoutMs ?? 12_000,
    fetchImpl: args.fetchImpl,
    init: { method: "GET", headers: headers(args.accept, args.referer) },
  });
  if (result.error === "subrequest_budget_exhausted") {
    return { text: null, error: result.error, budget: true };
  }
  if (result.error || !result.text) {
    return { text: null, error: result.error ?? `http_${result.status || 0}`, budget: false };
  }
  return { text: result.text, error: null, budget: false };
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function blocked(text: string): boolean {
  const head = text.slice(0, 400).toLowerCase();
  return head.includes("access denied") || head.includes("just a moment") || head.includes("<title>captcha");
}

function finish(source: string, sourceUrl: string, parsed: ParsedReviews): ReviewFetchResult {
  const sides = pickReviewSides(parsed.quotes);
  const rated = parsed.rating != null && parsed.count != null && parsed.count > 0;
  if (!rated && sides.positive.length === 0 && sides.negative.length === 0) {
    return { kind: "none", sourceUrl };
  }
  return {
    kind: "ok",
    snapshot: {
      rating: rated ? parsed.rating : null,
      count: rated ? parsed.count : null,
      source,
      sourceUrl,
      positive: sides.positive,
      negative: sides.negative,
      negativeLabel: sides.negativeLabel,
    },
  };
}

function bvScriptUrl(client: string, site: string): string {
  return `https://display.ugc.bazaarvoice.com/static/${encodeURIComponent(client)}/${encodeURIComponent(site)}/en_US/bvapi.js`;
}

async function loadBvConfig(
  client: string,
  site: string,
  caches: ReviewFetchCaches,
  outbound: OutboundFetch,
  fetchImpl: FetchImpl | undefined,
  referer: string,
): Promise<{ config: BvConfig | null; error: string | null; budget: boolean }> {
  const cacheKey = `${client}/${site}`;
  const memory = caches.bv.get(cacheKey);
  if (memory) return { config: memory, error: null, budget: false };
  const kvKey = `reviews:bv:${client}:${site}`;
  if (caches.kv) {
    try {
      const saved = await caches.kv.get(kvKey);
      if (saved) {
        const parsed = JSON.parse(saved) as BvConfig;
        if (parsed.passkey && parsed.displayCode) {
          caches.bv.set(cacheKey, parsed);
          return { config: parsed, error: null, budget: false };
        }
      }
    } catch {
      // A bad cache entry falls through to a fresh fetch.
    }
  }
  const script = await getText({
    url: bvScriptUrl(client, site),
    accept: "application/javascript,*/*",
    referer,
    outbound,
    fetchImpl,
    timeoutMs: 8_000,
  });
  if (script.budget) return { config: null, error: script.error, budget: true };
  if (script.error || !script.text) return { config: null, error: script.error ?? "bv_config_missing", budget: false };
  const config = parseBvApiScript(script.text);
  if (!config) return { config: null, error: "bv_config_unreadable", budget: false };
  caches.bv.set(cacheKey, config);
  if (caches.kv) {
    try {
      await caches.kv.put(kvKey, JSON.stringify(config), { expirationTtl: BV_TTL_SECONDS });
    } catch {
      // The in-memory config still covers this run.
    }
  }
  return { config, error: null, budget: false };
}

async function fetchBazaarvoice(args: {
  client: string;
  site: string;
  productId: string;
  source: string;
  sourceUrl: string;
  caches: ReviewFetchCaches;
  outbound: OutboundFetch;
  fetchImpl?: FetchImpl;
}): Promise<ReviewFetchResult> {
  const config = await loadBvConfig(args.client, args.site, args.caches, args.outbound, args.fetchImpl, args.sourceUrl);
  if (config.budget) return { kind: "budget" };
  if (!config.config) return { kind: "error", error: config.error ?? "bv_config_missing" };
  const body = await getText({
    url: bazaarvoiceBatchUrl(config.config, args.productId),
    accept: "application/json",
    referer: args.sourceUrl,
    outbound: args.outbound,
    fetchImpl: args.fetchImpl,
    timeoutMs: 8_000,
  });
  if (body.budget) return { kind: "budget" };
  if (body.error || !body.text) return { kind: "error", error: body.error ?? "bv_reviews_failed" };
  const parsed = parseBazaarvoiceBatch(parseJson(body.text), args.productId);
  if (!parsed) return { kind: "error", error: "bv_reviews_unreadable" };
  return finish(args.source, args.sourceUrl, parsed);
}

function bucket(dist: Record<string, number> | Record<number, number>, star: number): number {
  const record = dist as Record<string, number>;
  const value = record[String(star)];
  return typeof value === "number" ? value : 0;
}

async function fetchYotpo(args: {
  appKey: string;
  productId: string;
  sourceUrl: string;
  outbound: OutboundFetch;
  fetchImpl?: FetchImpl;
}): Promise<ReviewFetchResult> {
  const quotes: RawQuote[] = [];
  let rating: number | null = null;
  let count: number | null = null;
  let distribution: Record<string, number> = {};
  let calls = PAGE_API_CALLS;

  const pull = async (star: number | null): Promise<ReviewFetchResult | null> => {
    if (calls <= 0) return { kind: "budget" };
    calls -= 1;
    const body = await getText({
      url: yotpoReviewsUrl(args.appKey, args.productId, star),
      accept: "application/json",
      referer: args.sourceUrl,
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
      timeoutMs: 8_000,
    });
    if (body.budget) return { kind: "budget" };
    if (body.error || !body.text) return { kind: "error", error: body.error ?? "yotpo_failed" };
    const parsed = parseYotpoPayload(parseJson(body.text));
    if (!parsed) return { kind: "error", error: "yotpo_unreadable" };
    rating = parsed.rating ?? rating;
    count = parsed.count ?? count;
    if (Object.keys(parsed.distribution).length) distribution = parsed.distribution;
    quotes.push(...parsed.quotes);
    return null;
  };

  const first = await pull(null);
  if (first) return first;
  const positive = quotes.filter((quote) => quote.rating >= 4).length;
  if (positive < 4 && calls > 0) {
    const star = bucket(distribution, 5) > 0 ? 5 : bucket(distribution, 4) > 0 ? 4 : 0;
    if (star) {
      const next = await pull(star);
      if (next?.kind === "budget") return next;
      if (next?.kind === "error" && quotes.length === 0 && rating == null) return next;
    }
  }
  const low = quotes.filter((quote) => quote.rating <= 2).length;
  if (low < 4 && calls > 0) {
    const star = bucket(distribution, 1) > 0 ? 1 : bucket(distribution, 2) > 0 ? 2 : 0;
    if (star) {
      const next = await pull(star);
      if (next?.kind === "budget" && quotes.length === 0 && rating == null) return next;
    } else if (bucket(distribution, 3) > 0) {
      const next = await pull(3);
      if (next?.kind === "budget" && quotes.length === 0 && rating == null) return next;
    }
  } else if (low === 0 && bucket(distribution, 3) > 0 && calls > 0) {
    await pull(3);
  }
  return finish("Yotpo", args.sourceUrl, { rating, count, quotes });
}

async function fetchOkendo(args: {
  subscriberId: string;
  productId: string;
  sourceUrl: string;
  fallback: ParsedReviews;
  outbound: OutboundFetch;
  fetchImpl?: FetchImpl;
}): Promise<ReviewFetchResult> {
  let rating = args.fallback.rating;
  let count = args.fallback.count;
  const quotes: RawQuote[] = [];
  let calls = PAGE_API_CALLS;
  const pullJson = async (url: string): Promise<{ kind: "budget" } | { kind: "error"; error: string } | { kind: "data"; data: unknown }> => {
    if (calls <= 0) return { kind: "budget" };
    calls -= 1;
    const body = await getText({
      url,
      accept: "application/json",
      referer: args.sourceUrl,
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
      timeoutMs: 8_000,
    });
    if (body.budget) return { kind: "budget" };
    if (body.error || !body.text) return { kind: "error", error: body.error ?? "okendo_failed" };
    const data = parseJson(body.text);
    if (!data) return { kind: "error", error: "okendo_unreadable" };
    return { kind: "data", data };
  };

  const aggregate = await pullJson(okendoAggregateUrl(args.subscriberId, args.productId));
  if (aggregate.kind === "budget") return { kind: "budget" };
  let levels: Record<number, number> = {};
  if (aggregate.kind === "data") {
    const parsed = parseOkendoAggregate(aggregate.data);
    if (parsed) {
      rating = parsed.rating ?? rating;
      count = parsed.count ?? count;
      levels = parsed.levels;
    }
  }
  const posStar = bucket(levels, 5) > 0 ? 5 : bucket(levels, 4) > 0 ? 4 : bucket(levels, 5) + bucket(levels, 4) === 0 && Object.keys(levels).length === 0 ? 5 : 0;
  if (posStar) {
    const pos = await pullJson(okendoReviewsUrl(args.subscriberId, args.productId, posStar));
    if (pos.kind === "budget") return { kind: "budget" };
    if (pos.kind === "data") quotes.push(...parseOkendoReviews(pos.data));
  }
  const lowStar = bucket(levels, 1) > 0 ? 1 : bucket(levels, 2) > 0 ? 2 : bucket(levels, 3) > 0 ? 3 : Object.keys(levels).length === 0 ? 1 : 0;
  if (lowStar && calls > 0) {
    const low = await pullJson(okendoReviewsUrl(args.subscriberId, args.productId, lowStar));
    if (low.kind === "data") quotes.push(...parseOkendoReviews(low.data));
    if (low.kind === "budget" && quotes.length === 0 && rating == null) return { kind: "budget" };
  }
  return finish("Okendo", args.sourceUrl, { rating, count, quotes });
}

function fromJsonLd(signals: PageSignals, brand: string, sourceUrl: string): ReviewFetchResult {
  const source = signals.jsonLdSource ?? (brand.trim() || "product page");
  return finish(source, sourceUrl, { rating: signals.rating, count: signals.count, quotes: signals.quotes });
}

export async function fetchReviewSnapshot(args: {
  productUrl: string;
  brand: string;
  kind: "sephora" | "page";
  caches: ReviewFetchCaches;
  outbound: OutboundFetch;
  fetchImpl?: FetchImpl;
}): Promise<ReviewFetchResult> {
  const sourceUrl = args.productUrl;
  if (args.kind === "sephora") {
    const productId = sephoraProductId(sourceUrl);
    if (!productId) return { kind: "error", error: "missing_sephora_id" };
    return fetchBazaarvoice({
      client: "Sephora",
      site: "main_site",
      productId,
      source: "Sephora",
      sourceUrl,
      caches: args.caches,
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
    });
  }

  const page = await getText({
    url: sourceUrl,
    accept: "text/html,application/xhtml+xml",
    referer: sourceUrl,
    outbound: args.outbound,
    fetchImpl: args.fetchImpl,
    timeoutMs: 12_000,
  });
  if (page.budget) return { kind: "budget" };
  if (page.error || !page.text) return { kind: "error", error: page.error ?? "page_failed" };
  if (blocked(page.text)) return { kind: "error", error: "page_blocked" };
  const signals = readProductPage(page.text, sourceUrl);
  if (signals.yotpo) {
    return fetchYotpo({
      appKey: signals.yotpo.appKey,
      productId: signals.yotpo.productId,
      sourceUrl,
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
    });
  }
  if (signals.okendo) {
    return fetchOkendo({
      subscriberId: signals.okendo.subscriberId,
      productId: signals.okendo.productId,
      sourceUrl,
      fallback: { rating: signals.rating, count: signals.count, quotes: signals.quotes },
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
    });
  }
  if (signals.bazaarvoice) {
    return fetchBazaarvoice({
      client: signals.bazaarvoice.client,
      site: signals.bazaarvoice.site,
      productId: signals.bazaarvoice.productId,
      source: "Bazaarvoice",
      sourceUrl,
      caches: args.caches,
      outbound: args.outbound,
      fetchImpl: args.fetchImpl,
    });
  }
  if (signals.rating != null || signals.count != null || signals.quotes.length) {
    return fromJsonLd(signals, args.brand, sourceUrl);
  }
  if (signals.unsupported) return { kind: "error", error: `unsupported:${signals.unsupported}` };
  return { kind: "none", sourceUrl };
}
