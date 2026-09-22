import type {
  AccountUser,
  AdvisorMessage,
  AdvisorResponse,
  AppNotification,
  Product,
  ProductQuery,
  ScanSummary,
} from "../types";
import { apiBase, isNativeApp } from "../lib/native";

const DEVICE_KEY = "beauti_device";
const WISHLIST_KEY = "beauti_wishlist";
const SESSION_KEY = "beauti_session";
const SESSION_HEADER = "X-Beauti-Session";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeStoredSessionId(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
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

function persistSessionFrom(data: unknown, res: Response): void {
  const header = res.headers.get(SESSION_HEADER)?.trim();
  if (header) {
    writeStoredSessionId(header);
    return;
  }
  if (data && typeof data === "object" && "sessionId" in data) {
    const value = (data as { sessionId?: unknown }).sessionId;
    if (typeof value === "string" && value) writeStoredSessionId(value);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Device-Id", getDeviceId());
  const session = getStoredSessionId();
  if (session) headers.set(SESSION_HEADER, session);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const base = apiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    credentials: base ? "include" : "same-origin",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed (${res.status})`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* keep text */
    }
    if (res.status === 0 || res.status >= 500) {
      message = isNativeApp()
        ? `${message} Check that the live Beauti API is reachable.`
        : message;
    }
    throw new Error(message);
  }
  const data = (await res.json()) as T;
  persistSessionFrom(data, res);
  return data;
}

export interface AuthResponse {
  user: AccountUser | null;
  wishlist?: string[];
  deviceId?: string;
  sessionId?: string;
}

export const api = {
  products: (params: ProductQuery = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.deals) search.set("deals", "1");
    if (params.minPrice != null) search.set("minPrice", String(params.minPrice));
    if (params.maxPrice != null) search.set("maxPrice", String(params.maxPrice));
    if (params.minDiscount != null) search.set("minDiscount", String(params.minDiscount));
    if (params.sort) search.set("sort", params.sort);
    if (params.limit != null) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<{ products: Product[]; query: string }>(`/api/products${qs ? `?${qs}` : ""}`);
  },
  product: (id: string) => request<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`),
  deals: () => request<{ products: Product[]; lastScan: ScanSummary | null }>("/api/deals"),
  scan: (force: "restock" | "drop" | "cycle" = "cycle") =>
    request<{ summary: ScanSummary }>("/api/deals/scan", {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  wishlist: () => request<{ products: Product[]; account?: boolean }>("/api/wishlist"),
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
  me: () => request<AuthResponse>("/api/auth/me"),
  signup: (username: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  signin: (username: string, password: string) =>
    request<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  signout: async () => {
    const result = await request<AuthResponse>("/api/auth/signout", { method: "POST" });
    writeStoredSessionId(null);
    return result;
  },
  settings: () => request<{ themeMain: string | null; themeSecondary: string | null; username: string }>("/api/settings"),
  saveSettings: (theme: { themeMain: string; themeSecondary: string }) =>
    request<{ ok: boolean; themeMain: string | null; themeSecondary: string | null }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(theme),
    }),
  advisor: (payload: { message: string; messages?: AdvisorMessage[] }) =>
    request<AdvisorResponse>("/api/advisor", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
