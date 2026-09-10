import type { AppNotification, Product, ProductQuery, ScanSummary, TagCount } from "../types";

const DEVICE_KEY = "beauti_device";
const WISHLIST_KEY = "beauti_wishlist";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function readLocalWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocalWishlist(ids: string[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...new Set(ids)]));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Device-Id", getDeviceId());
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  products: (params: ProductQuery = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.tag) search.set("tag", params.tag);
    if (params.deals) search.set("deals", "1");
    if (params.minPrice != null) search.set("minPrice", String(params.minPrice));
    if (params.maxPrice != null) search.set("maxPrice", String(params.maxPrice));
    if (params.minDiscount != null) search.set("minDiscount", String(params.minDiscount));
    if (params.sort) search.set("sort", params.sort);
    if (params.limit != null) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<{ products: Product[]; query: string; tag: string }>(`/api/products${qs ? `?${qs}` : ""}`);
  },
  product: (id: string) => request<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`),
  tags: () => request<{ tags: TagCount[] }>("/api/tags"),
  deals: () => request<{ products: Product[]; lastScan: ScanSummary | null }>("/api/deals"),
  scan: (force: "restock" | "drop" | "cycle" = "cycle") =>
    request<{ summary: ScanSummary }>("/api/deals/scan", {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  wishlist: () => request<{ products: Product[] }>("/api/wishlist"),
  addWish: (productId: string) =>
    request<{ ok: boolean }>("/api/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  removeWish: (productId: string) =>
    request<{ ok: boolean }>(`/api/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  notifications: () =>
    request<{ notifications: AppNotification[]; unread: number }>("/api/notifications"),
  markRead: (id: string) =>
    request<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  markAllRead: () => request<{ ok: boolean }>("/api/notifications/read-all", { method: "POST" }),
};
