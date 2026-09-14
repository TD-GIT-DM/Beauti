import { tokenizeQuery } from "./search.ts";
import type { AdvisorProduct, AdvisorSearchHint } from "../types.ts";

export const ADVISOR_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
export const ADVISOR_SHORTLIST_LIMIT = 14;
export const ADVISOR_PICK_LIMIT = 5;
export const ADVISOR_MESSAGE_MAX = 500;

const STOPWORDS = new Set([
  "a",
  "about",
  "also",
  "an",
  "and",
  "any",
  "are",
  "be",
  "best",
  "better",
  "can",
  "case",
  "does",
  "find",
  "for",
  "get",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "just",
  "like",
  "looking",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "please",
  "really",
  "show",
  "some",
  "something",
  "that",
  "the",
  "this",
  "to",
  "very",
  "want",
  "what",
  "which",
  "with",
  "you",
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  acne: ["blemish", "concealer", "niacinamide"],
  blemish: ["concealer", "niacinamide", "blemish"],
  blush: ["blush"],
  body: ["body"],
  cheap: ["budget"],
  cheaper: ["budget"],
  cologne: ["fragrance", "perfume"],
  concealer: ["concealer", "coverage"],
  cover: ["concealer", "foundation", "coverage"],
  coverage: ["concealer", "foundation", "coverage"],
  covering: ["concealer", "foundation", "coverage"],
  covers: ["concealer", "foundation", "coverage"],
  dry: ["moisturizer", "skincare"],
  eau: ["fragrance", "perfume"],
  foundation: ["foundation", "coverage"],
  fragrance: ["fragrance", "perfume"],
  gloss: ["gloss", "lips"],
  hair: ["hair"],
  hide: ["concealer", "coverage"],
  hides: ["concealer", "coverage"],
  lipstick: ["lipstick", "lips"],
  mascara: ["mascara"],
  moisturizer: ["moisturizer", "skincare"],
  nail: ["nails"],
  nails: ["nails"],
  parfum: ["fragrance", "perfume"],
  perfume: ["fragrance", "perfume"],
  redness: ["concealer", "blush"],
  scent: ["fragrance", "perfume"],
  serum: ["serum", "skincare"],
  skin: ["skincare"],
  smell: ["fragrance", "perfume"],
  smelling: ["fragrance", "perfume"],
  smells: ["fragrance", "perfume"],
  spots: ["concealer", "blemish"],
  vanilla: ["vanilla", "fragrance"],
};

const PHRASE_BOOSTS: Array<{ match: RegExp; extra: string[] }> = [
  { match: /bad skin|uneven|blemish|breakout/, extra: ["concealer", "foundation", "coverage", "blemish", "niacinamide"] },
  { match: /cover(s|ing)?\b.*\b(skin|blemish|spot|redness)|full coverage|covers my/, extra: ["concealer", "foundation", "coverage"] },
  { match: /dark circles?|under eye/, extra: ["concealer"] },
  { match: /smells? like|fragrance|perfume|parfum/, extra: ["fragrance", "perfume"] },
  { match: /vanilla/, extra: ["vanilla", "fragrance"] },
];

export interface AdvisorQuery {
  original: string;
  tokens: string[];
  expanded: string[];
  preferInStock: boolean;
  sort: "relevance" | "price_asc" | "price_desc";
  searchHint: AdvisorSearchHint | null;
}

export interface AdvisorPick {
  reply: string;
  productIds: string[];
}

export function clampAdvisorMessage(value: string): string {
  return value.trim().slice(0, ADVISOR_MESSAGE_MAX);
}

export function expandAdvisorQuery(question: string): AdvisorQuery {
  const original = clampAdvisorMessage(question);
  const lowered = original.toLowerCase();
  const preferInStock = /\b(in stock|available|buy now)\b/.test(lowered);
  const sort: AdvisorQuery["sort"] = /\b(cheap|cheaper|budget|affordable)\b/.test(lowered)
    ? "price_asc"
    : /\b(expensive|luxury|splurge)\b/.test(lowered)
      ? "price_desc"
      : "relevance";

  const extras: string[] = [];
  for (const phrase of PHRASE_BOOSTS) {
    if (phrase.match.test(lowered)) extras.push(...phrase.extra);
  }

  const rawTokens = tokenizeQuery(lowered);
  const tokens = rawTokens.filter((token) => !STOPWORDS.has(token) && token.length > 1);
  const expandedSet = new Set<string>();
  for (const token of [...tokens, ...extras]) {
    expandedSet.add(token);
    for (const syn of TOKEN_SYNONYMS[token] ?? []) expandedSet.add(syn);
  }
  const expanded = [...expandedSet];
  const hintToken =
    expanded.find((token) => ["fragrance", "lipstick", "concealer", "foundation", "skincare", "blush", "hair", "nails"].includes(token)) ??
    tokens[0];

  return {
    original,
    tokens,
    expanded,
    preferInStock,
    sort,
    searchHint: hintToken ? { q: hintToken } : null,
  };
}

export function advisorScore(product: AdvisorProduct, query: AdvisorQuery): number {
  if (!query.expanded.length || !hasCatalogHit(product, query)) return 0;
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const tags = product.tags.map((tag) => tag.toLowerCase());
  const description = product.description.toLowerCase();
  let score = 0;
  for (const token of query.expanded) {
    if (name.includes(token)) score += 5;
    if (tags.some((tag) => tag === token || tag.includes(token))) score += 4;
    if (brand.includes(token)) score += 3;
    if (description.includes(token)) score += 1;
  }
  if (query.preferInStock && product.availability === "in_stock") score += 1;
  if (product.availability === "out_of_stock") score -= 1;
  return score;
}

function hasCatalogHit(product: AdvisorProduct, query: AdvisorQuery): boolean {
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const tags = product.tags.map((tag) => tag.toLowerCase());
  const description = product.description.toLowerCase();
  return query.expanded.some((token) => {
    if (name.includes(token) || brand.includes(token) || tags.some((tag) => tag === token || tag.includes(token))) {
      return true;
    }
    return token.length >= 6 && description.includes(token);
  });
}

function familyKey(product: AdvisorProduct): string {
  return `${product.brand.toLowerCase()}::${product.id.replace(
    /-(?:fair|light|medium|tan|deep|dark|rich|cool|warm|neutral|nc\d+|nw\d+|\d+[wnc]?|\d+)$/i,
    "",
  )}`;
}

export function catalogShortlist(products: AdvisorProduct[], question: string, limit = ADVISOR_SHORTLIST_LIMIT): AdvisorProduct[] {
  const query = expandAdvisorQuery(question);
  const scored = products
    .map((product) => ({ product, score: advisorScore(product, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (query.sort === "price_asc") return a.product.price - b.product.price || b.score - a.score;
      if (query.sort === "price_desc") return b.product.price - a.product.price || b.score - a.score;
      return b.score - a.score || a.product.name.localeCompare(b.product.name);
    });

  const picked: AdvisorProduct[] = [];
  const familyCount = new Map<string, number>();
  for (const row of scored) {
    const family = familyKey(row.product);
    const used = familyCount.get(family) ?? 0;
    if (used >= 1) continue;
    familyCount.set(family, used + 1);
    picked.push(row.product);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function effectiveQuestion(messages: Array<{ role: string; content: string }>, fallback = ""): string {
  const users = messages.filter((m) => m.role === "user").map((m) => clampAdvisorMessage(m.content)).filter(Boolean);
  if (!users.length) return clampAdvisorMessage(fallback);
  return users.slice(-2).join(" ");
}

export function parseAdvisorJson(raw: unknown): AdvisorPick | null {
  const source = unwrapModelText(raw);
  if (!source) return null;
  const jsonText = extractJsonObject(source);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as { reply?: unknown; productIds?: unknown };
    const reply = typeof parsed.reply === "string" ? parsed.reply : "";
    const productIds = Array.isArray(parsed.productIds)
      ? parsed.productIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim())
      : [];
    if (!reply && !productIds.length) return null;
    return { reply, productIds };
  } catch {
    return null;
  }
}

export function groundAdvisorPick(
  pick: AdvisorPick | null,
  shortlist: AdvisorProduct[],
  query: AdvisorQuery,
): { reply: string; products: AdvisorProduct[]; searchHint: AdvisorSearchHint | null; weak: boolean } {
  const byId = new Map(shortlist.map((product) => [product.id, product]));
  const products = pickCatalogProducts(pick?.productIds ?? [], byId, ADVISOR_PICK_LIMIT);
  const weak = shortlist.length > 0 && Math.max(...shortlist.map((p) => advisorScore(p, query))) < 6;
  if (!shortlist.length) {
    return {
      reply: emptyCatalogReply(query),
      products: [],
      searchHint: query.searchHint,
      weak: false,
    };
  }
  const selected = products.length ? products : shortlist.slice(0, Math.min(3, ADVISOR_PICK_LIMIT));
  const reply = sanitizeAdvisorReply(pick?.reply ?? "", selected) || templateReply(selected, weak);
  return { reply, products: selected, searchHint: query.searchHint, weak };
}

export function templateReply(products: AdvisorProduct[], weak = false): string {
  if (!products.length) {
    return "Nothing in the Beauti catalog matches that. Try a tag like lipstick, fragrance, or skincare.";
  }
  const bits = products.slice(0, 3).map((product) => {
    return `${product.brand} ${product.name} (${formatAdvisorPrice(product.price, product.currency)}, ${stockPhrase(product.availability)}).`;
  });
  const lead = weak ? "Closest in-catalog matches:" : "From the Beauti catalog:";
  return `${lead} ${bits.join(" ")} Open a card for the product page.`;
}

export function emptyCatalogReply(query: AdvisorQuery): string {
  if (!query.tokens.length) {
    return "Ask for a product type, brand, or scent. Answers stay in this catalog.";
  }
  const hint = query.searchHint?.q;
  if (hint) {
    return `Nothing in the Beauti catalog matches that. Search “${hint}” or browse related in-catalog tags.`;
  }
  return "Nothing in the Beauti catalog matches that. Try searching tags or browse related in-catalog items.";
}

export function advisorSystemPrompt(): string {
  return [
    "You are Beauti's in-catalog product matcher.",
    "Recommend only products in CATALOG. Never invent brands, names, prices, or ids.",
    "Beauty advice is product matching only. Do not diagnose skin or medical conditions.",
    "If nothing fits, say so and suggest searching in-catalog tags. Do not mention off-catalog items.",
    "Write short plain sentences. No filler. No em dashes.",
    "Name brand, product, price, and availability for each pick.",
    'Return JSON only: {"reply": string, "productIds": string[]}.',
    `productIds must be CATALOG ids, at most ${ADVISOR_PICK_LIMIT}, best first. Prefer in-stock.`,
  ].join(" ");
}

export function advisorUserPrompt(
  question: string,
  shortlist: AdvisorProduct[],
  history: Array<{ role: string; content: string }> = [],
): string {
  const prior = history
    .slice(-6)
    .map((m) => `${m.role}: ${clampAdvisorMessage(m.content)}`)
    .join("\n");
  const rows = shortlist.map((p) => {
    const tags = p.tags.slice(0, 8).join(",");
    const desc = p.description.replace(/\s+/g, " ").slice(0, 160);
    return `${p.id} | ${p.brand} | ${p.name} | ${formatAdvisorPrice(p.price, p.currency)} | ${p.availability} | ${tags} | ${desc}`;
  });
  return [
    `Question: ${clampAdvisorMessage(question)}`,
    prior ? `Prior turns:\n${prior}` : "",
    "CATALOG (id | brand | name | price | availability | tags | description):",
    rows.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function pickCatalogProducts(ids: string[], byId: Map<string, AdvisorProduct>, limit: number): AdvisorProduct[] {
  const out: AdvisorProduct[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const product = byId.get(id);
    if (!product || seen.has(id)) continue;
    seen.add(id);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out;
}

function sanitizeAdvisorReply(reply: string, products: AdvisorProduct[]): string {
  let text = reply.replace(/\s*[—–]\s*/g, ". ").replace(/\s{2,}/g, " ").trim();
  if (!text) return "";
  text = text.slice(0, 420);
  if (!products.length) return text;
  const lowered = text.toLowerCase();
  const citesCatalog = products.some(
    (product) => lowered.includes(product.brand.toLowerCase()) || lowered.includes(product.name.toLowerCase()),
  );
  if (!citesCatalog) return "";
  const unknownSku = tokenizeQuery(text).some(
    (token) => token.includes("-") && token.split("-").length >= 3 && !products.some((product) => product.id.toLowerCase() === token),
  );
  if (unknownSku) return "";
  return text;
}

function unwrapModelText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  if (typeof record.response === "string") return record.response;
  if (typeof record.reply === "string") return JSON.stringify(raw);
  if (Array.isArray(record.result) && typeof record.result[0] === "object") {
    return JSON.stringify(record.result[0]);
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return "";
  }
}

function extractJsonObject(source: string): string | null {
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? source).trim();
  if (body.startsWith("{") && body.endsWith("}")) return body;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return null;
}

function formatAdvisorPrice(amount: number, currency: string): string {
  if (currency === "USD" || !currency) return `$${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

function stockPhrase(availability: AdvisorProduct["availability"]): string {
  if (availability === "out_of_stock") return "out of stock";
  if (availability === "limited") return "limited";
  return "in stock";
}
