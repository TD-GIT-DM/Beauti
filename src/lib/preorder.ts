/**
 * Pre-order timing and verification rules.
 * Dates, prices, and discounts come from a retailer or brand source.
 * A missing date stays unconfirmed. Nothing here invents a countdown.
 */

import type { DatePrecision, PreorderKind, PublicPreorder } from "../types.ts";
import { markdownPercent } from "./catalog-price.ts";

export const STALE_MS = 36 * 60 * 60 * 1000;

export type { DatePrecision, PreorderKind, PublicPreorder };
export type PreorderStatus = "upcoming" | "live" | "removed";

export interface PreorderEntry {
  id: string;
  kind: PreorderKind;
  name: string;
  brand: string;
  description: string;
  imageUrl: string | null;
  productUrl: string;
  sourceUrl: string;
  price: number | null;
  listPrice: number | null;
  announcedPercent: number | null;
  discountConfirmed: boolean;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  datePrecision: DatePrecision;
  dateLabel: string | null;
  status: PreorderStatus;
  linkedProductId: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SourceReading =
  | {
      ok: true;
      found: boolean;
      stillPending: boolean;
      nowLive: boolean;
      kind?: PreorderKind;
      name?: string;
      brand?: string;
      description?: string;
      imageUrl?: string | null;
      productUrl?: string;
      sourceUrl?: string;
      price?: number | null;
      listPrice?: number | null;
      announcedPercent?: number | null;
      discountConfirmed?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      datePrecision?: DatePrecision;
      dateLabel?: string | null;
    }
  | { ok: false };

export interface PreorderRow {
  id: string;
  kind: string;
  name: string;
  brand: string;
  description: string;
  image_url: string | null;
  product_url: string;
  source_url: string;
  price: number | null;
  list_price: number | null;
  announced_percent: number | null;
  discount_confirmed: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  date_precision: string;
  date_label: string | null;
  status: string;
  linked_product_id: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COMING_TAG =
  /^(coming[\s-]?soon|tag:\s*coming soon|badge\|coming soon|badge_coming soon)$/i;
const PREORDER_TAG = /^pre-?order$/i;

const ANNOUNCED_SALE =
  /(\d{1,2})\s*%\s*off\b[\s\S]{0,80}?\b(?:starts|begins|goes live)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})/i;

const SHIP_MONTH =
  /will ship in (January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function tagList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

export function shopifyPreorderId(host: string, handle: string): string {
  const bare = host.replace(/^www\./i, "").toLowerCase();
  return `shopify:${bare}:${handle}`;
}

export function httpsProductUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (/google\./i.test(parsed.hostname)) return null;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
}

export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function isElapsed(entry: Pick<PreorderEntry, "datePrecision" | "startsAt">, nowMs: number): boolean {
  if (entry.datePrecision === "datetime") {
    const start = entry.startsAt ? Date.parse(entry.startsAt) : Number.NaN;
    if (!Number.isFinite(start)) return true;
    return start <= nowMs;
  }
  if (entry.datePrecision === "date") {
    if (!entry.startsAt || !/^\d{4}-\d{2}-\d{2}/.test(entry.startsAt)) return true;
    return entry.startsAt.slice(0, 10) < utcDay(nowMs);
  }
  return false;
}

export function isListed(entry: PreorderEntry, nowMs: number): boolean {
  if (entry.status !== "upcoming") return false;
  if (!entry.lastVerifiedAt) return false;
  const verified = Date.parse(entry.lastVerifiedAt);
  if (!Number.isFinite(verified)) return false;
  if (nowMs - verified > STALE_MS) return false;
  if (!httpsProductUrl(entry.productUrl)) return false;
  if (isElapsed(entry, nowMs)) return false;
  return true;
}

export interface PreorderTiming {
  mode: "countdown" | "text";
  text: string;
  countdownTo: number | null;
  ended: boolean;
}

export function preorderTiming(
  entry: Pick<PreorderEntry, "kind" | "datePrecision" | "startsAt" | "dateLabel">,
  nowMs: number,
): PreorderTiming {
  const ended = isElapsed(entry, nowMs);
  if (entry.datePrecision === "datetime" && entry.startsAt && !ended) {
    const countdownTo = Date.parse(entry.startsAt);
    if (Number.isFinite(countdownTo)) {
      return { mode: "countdown", text: "Starts in", countdownTo, ended: false };
    }
  }
  if (entry.datePrecision === "date" && entry.startsAt && !ended) {
    return { mode: "text", text: `Starts ${formatLongDate(entry.startsAt)}`, countdownTo: null, ended: false };
  }
  if (entry.datePrecision === "month" && entry.dateLabel && !ended) {
    return { mode: "text", text: entry.dateLabel, countdownTo: null, ended: false };
  }
  const text = entry.kind === "upcoming_deal" ? "Start date not announced" : "Release date not announced";
  return { mode: "text", text, countdownTo: null, ended };
}

export function listedDiscount(entry: Pick<PreorderEntry, "price" | "listPrice" | "announcedPercent" | "discountConfirmed">): number {
  if (!entry.discountConfirmed) return 0;
  if (entry.announcedPercent != null && entry.announcedPercent > 0 && entry.announcedPercent < 100) {
    return Math.round(entry.announcedPercent);
  }
  if (entry.price != null && entry.listPrice != null) return markdownPercent(entry.price, entry.listPrice);
  return 0;
}

export function toPublicPreorder(entry: PreorderEntry, wishlisted: boolean, nowMs: number): PublicPreorder | null {
  if (!isListed(entry, nowMs)) return null;
  const verified = entry.lastVerifiedAt;
  if (!verified) return null;
  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    brand: entry.brand,
    description: entry.description,
    imageUrl: entry.imageUrl,
    productUrl: httpsProductUrl(entry.productUrl) ?? entry.productUrl,
    sourceUrl: httpsProductUrl(entry.sourceUrl) ?? entry.sourceUrl,
    price: entry.price,
    listPrice: entry.listPrice,
    currency: entry.currency || "USD",
    discountPercent: listedDiscount(entry),
    startsAt: entry.startsAt,
    endsAt: entry.endsAt,
    datePrecision: entry.datePrecision,
    dateLabel: entry.dateLabel,
    lastVerifiedAt: verified,
    wishlisted,
  };
}

export function entryFromRow(row: PreorderRow): PreorderEntry | null {
  if (row.kind !== "upcoming_deal" && row.kind !== "coming_soon") return null;
  if (
    row.date_precision !== "datetime" &&
    row.date_precision !== "date" &&
    row.date_precision !== "month" &&
    row.date_precision !== "unconfirmed"
  ) {
    return null;
  }
  if (row.status !== "upcoming" && row.status !== "live" && row.status !== "removed") return null;
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    brand: row.brand,
    description: row.description,
    imageUrl: row.image_url || null,
    productUrl: row.product_url,
    sourceUrl: row.source_url,
    price: row.price != null && row.price > 0 ? row.price : null,
    listPrice: row.list_price != null && row.list_price > 0 ? row.list_price : null,
    announcedPercent: row.announced_percent != null && row.announced_percent > 0 ? row.announced_percent : null,
    discountConfirmed: row.discount_confirmed === 1,
    currency: row.currency || "USD",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    datePrecision: row.date_precision,
    dateLabel: row.date_label,
    status: row.status,
    linkedProductId: row.linked_product_id,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function applyReading(entry: PreorderEntry, reading: SourceReading, nowIso: string): PreorderEntry {
  if (!reading.ok) return entry;
  if (!reading.found) {
    return { ...entry, status: "removed", lastVerifiedAt: nowIso, updatedAt: nowIso };
  }
  const next: PreorderEntry = {
    ...entry,
    kind: reading.kind ?? entry.kind,
    name: reading.name || entry.name,
    brand: reading.brand || entry.brand,
    description: reading.description || entry.description,
    imageUrl: reading.imageUrl === undefined ? entry.imageUrl : reading.imageUrl,
    productUrl: reading.productUrl || entry.productUrl,
    sourceUrl: reading.sourceUrl || entry.sourceUrl,
    price: reading.price === undefined ? entry.price : reading.price,
    listPrice: reading.listPrice === undefined ? entry.listPrice : reading.listPrice,
    announcedPercent: reading.announcedPercent === undefined ? entry.announcedPercent : reading.announcedPercent,
    discountConfirmed: reading.discountConfirmed ?? entry.discountConfirmed,
    startsAt: reading.startsAt === undefined ? entry.startsAt : reading.startsAt,
    endsAt: reading.endsAt === undefined ? entry.endsAt : reading.endsAt,
    datePrecision: reading.datePrecision ?? entry.datePrecision,
    dateLabel: reading.dateLabel === undefined ? entry.dateLabel : reading.dateLabel,
    lastVerifiedAt: nowIso,
    updatedAt: nowIso,
  };
  if (reading.nowLive) return { ...next, status: "live" };
  if (!reading.stillPending) return { ...next, status: "removed" };
  const nowMs = Date.parse(nowIso);
  if (Number.isFinite(nowMs) && isElapsed(next, nowMs)) return { ...next, status: "removed" };
  return { ...next, status: "upcoming" };
}

export function classifyComingSoonPage(html: string): "pending" | "live" | "unknown" {
  const waitlist =
    /COMING SOON:\s*JOIN THE WAITLIST/i.test(html) ||
    /js-comming-soon-form/i.test(html) ||
    /js-open-modal-coming-soon/i.test(html);
  const addToCart = /aria-label="Add to cart"/i.test(html) || /data-add-to-cart/i.test(html);
  if (waitlist && !addToCart) return "pending";
  if (addToCart && !waitlist) return "live";
  return "unknown";
}

export function extractShipWindow(html: string): { label: string } | null {
  const match = SHIP_MONTH.exec(plainText(html));
  if (!match) return null;
  const month = MONTHS.find((name) => name.toLowerCase() === match[1].toLowerCase());
  if (!month) return null;
  return { label: `Ships in ${month}` };
}

export function readAnnouncedSale(
  text: string,
  now: Date,
): { percent: number; startsAt: string } | null {
  const match = ANNOUNCED_SALE.exec(text);
  if (!match) return null;
  const percent = Number(match[1]);
  if (!Number.isInteger(percent) || percent < 5 || percent > 80) return null;
  const monthIndex = MONTHS.findIndex((name) => name.toLowerCase() === match[2].toLowerCase());
  if (monthIndex < 0) return null;
  const day = Number(match[3]);
  const year = Number(match[4]);
  const stamp = new Date(Date.UTC(year, monthIndex, day));
  if (stamp.getUTCFullYear() !== year || stamp.getUTCMonth() !== monthIndex || stamp.getUTCDate() !== day) {
    return null;
  }
  const startsAt = stamp.toISOString().slice(0, 10);
  if (startsAt < utcDay(now.getTime())) return null;
  return { percent, startsAt };
}

export interface ShopifyReadInput {
  title?: unknown;
  handle?: unknown;
  vendor?: unknown;
  tags?: unknown;
  body_html?: unknown;
  description?: unknown;
  available?: unknown;
  variants?: unknown;
  price?: unknown;
  compare_at_price?: unknown;
  images?: unknown;
  featured_image?: unknown;
}

export interface ShopifyReadContext {
  host: string;
  productUrl: string;
  sourceUrl: string;
  unit: "cents" | "dollars";
  /** Null when the page was not loaded. */
  pageHtml: string | null;
  pageLoaded: boolean;
  now: Date;
}

function brandName(vendor: unknown, host: string): string {
  if (host.includes("makeupbymario")) return "Makeup by Mario";
  if (host.includes("oliveandjune")) return "Olive & June";
  const name = typeof vendor === "string" ? vendor.trim() : "";
  if (name && !/^calendar$/i.test(name)) return name;
  if (host.includes("fenty")) return "Fenty Beauty";
  if (host.includes("patrickta")) return "Patrick Ta";
  return host;
}

function firstImage(product: ShopifyReadInput): string | null {
  const candidates: unknown[] = [product.featured_image];
  if (Array.isArray(product.images)) candidates.push(product.images[0]);
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("https://")) return candidate.split("?")[0];
    if (candidate && typeof candidate === "object" && "src" in candidate) {
      const src = (candidate as { src?: unknown }).src;
      if (typeof src === "string" && src.startsWith("https://")) return src.split("?")[0];
    }
  }
  return null;
}

function variantRows(product: ShopifyReadInput): Array<Record<string, unknown>> {
  if (!Array.isArray(product.variants)) return [];
  return product.variants.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>>;
}

export function shopifyInStock(product: ShopifyReadInput): boolean | null {
  const flags = variantRows(product)
    .map((row) => row.available)
    .filter((flag): flag is boolean => typeof flag === "boolean");
  if (flags.length) return flags.some(Boolean);
  if (typeof product.available === "boolean") return product.available;
  return null;
}

function money(raw: unknown, unit: "cents" | "dollars"): number | null {
  if (raw == null || raw === "" || raw === 0 || raw === "0" || raw === "0.00") return null;
  const numeric = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const text = String(raw);
  const dollars = unit === "dollars" || (typeof raw === "string" && text.includes("."));
  const value = dollars ? numeric : numeric / 100;
  if (value <= 0 || value >= 20000) return null;
  return Math.round(value * 100) / 100;
}

function productMoney(product: ShopifyReadInput, field: "price" | "compare_at_price", unit: "cents" | "dollars"): number | null {
  const top = money(product[field], unit);
  if (top != null) return top;
  const variant = variantRows(product)[0];
  if (!variant) return null;
  return money(variant[field], unit);
}

export type ShopifySignal = "preorder" | "coming_blocked" | "coming_ambiguous" | "none";

export function shopifySignal(tags: string[], inStock: boolean | null): ShopifySignal {
  if (tags.some((tag) => PREORDER_TAG.test(tag))) return "preorder";
  if (tags.some((tag) => COMING_TAG.test(tag))) {
    if (inStock === false) return "coming_blocked";
    if (inStock === true) return "coming_ambiguous";
  }
  return "none";
}

export function interpretShopifyProduct(product: ShopifyReadInput | null, ctx: ShopifyReadContext): SourceReading {
  if (!product || typeof product.title !== "string" || !product.title.trim()) {
    return { ok: true, found: false, stillPending: false, nowLive: false };
  }
  const tags = tagList(product.tags);
  const inStock = shopifyInStock(product);
  const signal = shopifySignal(tags, inStock);
  const descriptionHtml = typeof product.description === "string" ? product.description : typeof product.body_html === "string" ? product.body_html : "";
  const description = plainText(descriptionHtml).slice(0, 480) || "The brand page does not include a description yet.";
  const price = productMoney(product, "price", ctx.unit);
  const compare = productMoney(product, "compare_at_price", ctx.unit);
  const listPrice = price != null && compare != null && compare > price ? compare : null;
  const imageUrl = firstImage(product);
  const base = {
    ok: true as const,
    found: true,
    name: product.title.trim(),
    brand: brandName(product.vendor, ctx.host),
    description,
    imageUrl,
    productUrl: ctx.productUrl,
    sourceUrl: ctx.sourceUrl,
    price,
    listPrice,
    announcedPercent: null as number | null,
    discountConfirmed: false,
    endsAt: null as string | null,
  };

  if (signal === "coming_ambiguous") {
    if (!ctx.pageLoaded || ctx.pageHtml == null) return { ok: false };
    const page = classifyComingSoonPage(ctx.pageHtml);
    if (page === "unknown") return { ok: false };
    if (page === "live") {
      return { ...base, stillPending: false, nowLive: true, kind: "coming_soon", datePrecision: "unconfirmed", dateLabel: null, startsAt: null };
    }
    return {
      ...base,
      stillPending: true,
      nowLive: false,
      kind: "coming_soon",
      datePrecision: "unconfirmed",
      dateLabel: null,
      startsAt: null,
    };
  }

  if (signal === "preorder") {
    if (!ctx.pageLoaded) {
      return { ...base, stillPending: true, nowLive: false, kind: "coming_soon" };
    }
    const dated = extractShipWindow(ctx.pageHtml ?? "");
    return {
      ...base,
      stillPending: true,
      nowLive: false,
      kind: "coming_soon",
      datePrecision: dated ? "month" : "unconfirmed",
      dateLabel: dated?.label ?? null,
      startsAt: null,
    };
  }

  if (signal === "coming_blocked") {
    const dated = ctx.pageLoaded ? extractShipWindow(ctx.pageHtml ?? "") : null;
    return {
      ...base,
      stillPending: true,
      nowLive: false,
      kind: "coming_soon",
      datePrecision: dated ? "month" : "unconfirmed",
      dateLabel: dated?.label ?? null,
      startsAt: null,
    };
  }

  const announced = readAnnouncedSale(`${product.title} ${description}`, ctx.now);
  if (announced && inStock !== null) {
    return {
      ...base,
      stillPending: true,
      nowLive: false,
      kind: "upcoming_deal",
      price: null,
      listPrice: null,
      announcedPercent: announced.percent,
      discountConfirmed: true,
      datePrecision: "date",
      dateLabel: null,
      startsAt: announced.startsAt,
    };
  }

  if (inStock === true) {
    return { ...base, stillPending: false, nowLive: true, kind: "coming_soon" };
  }
  return { ...base, stillPending: false, nowLive: false };
}

export function entryFromReading(id: string, reading: SourceReading, nowIso: string): PreorderEntry | null {
  if (!reading.ok || !reading.found || !reading.stillPending || reading.nowLive) return null;
  if (!reading.kind || !reading.name || !reading.productUrl || !reading.sourceUrl || !reading.brand) return null;
  const productUrl = httpsProductUrl(reading.productUrl);
  const sourceUrl = httpsProductUrl(reading.sourceUrl);
  if (!productUrl || !sourceUrl) return null;
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return null;
  const entry: PreorderEntry = {
    id,
    kind: reading.kind,
    name: reading.name,
    brand: reading.brand,
    description: reading.description || "The brand page does not include a description yet.",
    imageUrl: reading.imageUrl ?? null,
    productUrl,
    sourceUrl,
    price: reading.price ?? null,
    listPrice: reading.listPrice ?? null,
    announcedPercent: reading.announcedPercent ?? null,
    discountConfirmed: reading.discountConfirmed ?? false,
    currency: "USD",
    startsAt: reading.startsAt ?? null,
    endsAt: reading.endsAt ?? null,
    datePrecision: reading.datePrecision ?? "unconfirmed",
    dateLabel: reading.dateLabel ?? null,
    status: "upcoming",
    linkedProductId: null,
    lastVerifiedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  if (!isListed(entry, nowMs)) return null;
  return entry;
}
