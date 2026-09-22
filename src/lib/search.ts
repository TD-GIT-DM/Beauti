/** Split a shopper query into AND tokens ("red lipstick" → red + lipstick). */
export function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+%]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/** Higher scores for tokens in the name or private tags so "red lipstick" ranks lipsticks above a mention in copy. */
export function relevanceScore(
  product: { name: string; brand: string; description: string; tags: string[] },
  q: string,
): number {
  const tokens = tokenizeQuery(q);
  if (!tokens.length) return 0;
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const tags = product.tags.map((tag) => tag.toLowerCase());
  const description = product.description.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 4;
    if (tags.some((tag) => tag === token || tag.includes(token))) score += 3;
    if (brand.includes(token)) score += 2;
    if (description.includes(token)) score += 1;
  }
  return score;
}

export function matchesQuery(
  haystacks: Array<string | string[] | undefined | null>,
  q: string,
): boolean {
  const tokens = tokenizeQuery(q);
  if (!tokens.length) return true;
  const hay = haystacks
    .flatMap((part) => (Array.isArray(part) ? part : part ? [part] : []))
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

export type ProductSort = "deal" | "price_asc" | "price_desc" | "discount_desc";

export function parseSort(value: string | undefined | null): ProductSort {
  if (value === "price_asc" || value === "price_desc" || value === "discount_desc" || value === "deal") {
    return value;
  }
  return "deal";
}

export function parseOptionalNumber(value: string | undefined | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Search URLs do not keep a public tag filter. Free-text `q` still matches private tags on the server. */
export function withoutTagParam(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete("tag");
  return next;
}

export interface CatalogFilterProduct {
  name: string;
  brand: string;
  description: string;
  tags: string[];
  promoCodes: Array<{ code: string; label: string }>;
  price: number;
  discountPercent: number;
}

export interface CatalogFilterOptions {
  q: string;
  dealsOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
}

/** Match `q` against name, brand, description, promo copy, and private tags. No public tag browse. */
export function filterCatalog<T extends CatalogFilterProduct>(products: T[], opts: CatalogFilterOptions): T[] {
  let next = products;
  if (opts.q) {
    next = next.filter((product) =>
      matchesQuery(
        [
          product.name,
          product.brand,
          product.description,
          product.tags,
          product.promoCodes.map((code) => `${code.code} ${code.label}`),
        ],
        opts.q,
      ),
    );
  }
  if (opts.dealsOnly) next = next.filter((product) => product.discountPercent > 0);
  if (opts.minPrice != null) next = next.filter((product) => product.price >= opts.minPrice!);
  if (opts.maxPrice != null) next = next.filter((product) => product.price <= opts.maxPrice!);
  if (opts.minDiscount != null) next = next.filter((product) => product.discountPercent >= opts.minDiscount!);
  return next;
}
