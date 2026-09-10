/** Split a shopper query into AND tokens ("red lipstick" → red + lipstick). */
export function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+%]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
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
