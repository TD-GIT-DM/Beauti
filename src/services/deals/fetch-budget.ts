/**
 * Outbound fetch budget for a cron invocation.
 *
 * Workers Free allows 50 external subrequests per invocation. Each redirect
 * hop counts. D1 and KV do not count toward that 50. This run stops at 45
 * so a redirect or a late fetch still fits.
 *
 * Pre-order checks and catalog quotes are separate cron triggers, so each
 * gets its own 45. A combined run (no cron string) checks pre-orders first
 * and gives the catalog whatever remains.
 */

export const SUBREQUEST_BUDGET = 45;
/** Do not start another catalog product below this. A quote is several fetches. */
export const MIN_CATALOG_REMAINING = 4;
export const CATALOG_PRODUCT_CAP = 24;
export const CATALOG_PRIORITY_CAP = 8;
export const HOST_GAP_MS = 400;
export const MAX_REDIRECTS = 3;
/** Wait and retry once only when Retry-After is this short. Longer waits cool the host. */
export const INLINE_RETRY_MS = 2_000;
export const DEFAULT_RETRY_AFTER_MS = 15_000;

/** Quarter-hour pre-order pass. Runs before the catalog pass in the hour. */
export const PREORDER_CRON = "*/15 * * * *";
/** Catalog pass, offset so it does not share the pre-order invocation. */
export const CATALOG_CRON = "8,23,38,53 * * * *";

export type ScheduledJob = "preorders" | "catalog" | "both";

export function scheduledJob(cron: string | undefined): ScheduledJob {
  const text = (cron ?? "").trim();
  if (text === PREORDER_CRON) return "preorders";
  if (text === CATALOG_CRON) return "catalog";
  return "both";
}

export class SubrequestBudget {
  used = 0;
  readonly limit: number;

  constructor(limit = SUBREQUEST_BUDGET) {
    this.limit = limit;
  }

  remaining(): number {
    return Math.max(0, this.limit - this.used);
  }

  /** Reserve one outbound subrequest. False when the run is at the cap. */
  take(): boolean {
    if (this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }
}

export function parseRetryAfterMs(header: string | null, nowMs: number): number {
  if (!header || !header.trim()) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 15 * 60 * 1000);
  }
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.min(date - nowMs, 15 * 60 * 1000));
  }
  return DEFAULT_RETRY_AFTER_MS;
}

export function fetchFailedError(err: unknown): string {
  const message = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").trim();
  if (/too many subrequests/i.test(message)) return "subrequest_budget_exhausted";
  const prefix = "fetch_failed: ";
  const body = message.slice(0, 180 - prefix.length);
  return body ? prefix + body : "fetch_failed";
}

export interface HostCooldownStore {
  getUntil(host: string): Promise<number | null>;
  setUntil(host: string, untilMs: number): Promise<void>;
}

export interface CooldownKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export function kvHostCooldown(kv: CooldownKv): HostCooldownStore {
  return {
    async getUntil(host: string): Promise<number | null> {
      try {
        const raw = await kv.get(`fetch:cool:${host}`);
        const until = Number(raw ?? "");
        return Number.isFinite(until) && until > Date.now() ? until : null;
      } catch {
        return null;
      }
    },
    async setUntil(host: string, untilMs: number): Promise<void> {
      try {
        const ttl = Math.max(60, Math.ceil((untilMs - Date.now()) / 1000));
        await kv.put(`fetch:cool:${host}`, String(untilMs), { expirationTtl: ttl });
      } catch {
        // The in-memory cooldown still covers this run.
      }
    },
  };
}

export class HostScheduler {
  private nextAt = new Map<string, number>();
  private coolUntil = new Map<string, number>();
  private loading = new Map<string, Promise<void>>();
  private nowFn: () => number;
  private sleepFn: (ms: number) => Promise<void>;
  private store: HostCooldownStore | null;
  readonly gapMs: number;

  constructor(options?: {
    gapMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    store?: HostCooldownStore | null;
  }) {
    this.gapMs = options?.gapMs ?? HOST_GAP_MS;
    this.nowFn = options?.now ?? (() => Date.now());
    this.sleepFn = options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.store = options?.store ?? null;
  }

  now(): number {
    return this.nowFn();
  }

  async sleep(ms: number): Promise<void> {
    if (ms > 0) await this.sleepFn(ms);
  }

  coolingMs(host: string): number {
    return Math.max(0, (this.coolUntil.get(host) ?? 0) - this.now());
  }

  async note429(host: string, retryAfterHeader: string | null): Promise<number> {
    const wait = parseRetryAfterMs(retryAfterHeader, this.now());
    const until = this.now() + wait;
    const prev = this.coolUntil.get(host) ?? 0;
    const next = Math.max(prev, until);
    this.coolUntil.set(host, next);
    if (this.store) await this.store.setUntil(host, next);
    return wait;
  }

  private ensureLoaded(host: string): Promise<void> {
    const existing = this.loading.get(host);
    if (existing) return existing;
    const job = (async () => {
      if (!this.store) return;
      const until = await this.store.getUntil(host);
      if (until == null) return;
      const prev = this.coolUntil.get(host) ?? 0;
      if (until > prev) this.coolUntil.set(host, until);
    })();
    this.loading.set(host, job);
    return job;
  }

  async beforeRequest(host: string): Promise<{ skipped: false } | { skipped: true; retryAfterMs: number }> {
    await this.ensureLoaded(host);
    const cool = this.coolingMs(host);
    if (cool > 0) return { skipped: true, retryAfterMs: cool };
    const now = this.now();
    const at = this.nextAt.get(host) ?? now;
    const start = Math.max(now, at);
    this.nextAt.set(host, start + this.gapMs);
    const wait = start - now;
    if (wait > 0) await this.sleep(wait);
    return { skipped: false };
  }
}

export interface BudgetedResponse {
  status: number;
  text: string | null;
  contentType: string | null;
  error: string | null;
}

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

export interface OutboundFetch {
  budget: SubrequestBudget;
  hosts: HostScheduler;
}

async function cancelBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // The status and headers are what we needed.
  }
}

export async function budgetedFetch(args: {
  url: string;
  budget: SubrequestBudget;
  hosts: HostScheduler;
  init?: RequestInit;
  timeoutMs?: number;
  fetchImpl?: FetchImpl;
}): Promise<BudgetedResponse> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const timeoutMs = args.timeoutMs ?? 8_000;
  let currentUrl = args.url;
  let redirects = 0;
  let retried429 = false;

  while (redirects <= MAX_REDIRECTS) {
    let host = "";
    try {
      host = new URL(currentUrl).hostname.toLowerCase();
    } catch {
      return { status: 0, text: null, contentType: null, error: "fetch_failed: bad url" };
    }

    const gate = await args.hosts.beforeRequest(host);
    if (gate.skipped) {
      const seconds = Math.max(0, Math.round(gate.retryAfterMs / 1000));
      return { status: 429, text: null, contentType: null, error: `http_429 retry_after=${seconds}` };
    }
    if (!args.budget.take()) {
      return { status: 0, text: null, contentType: null, error: "subrequest_budget_exhausted" };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(currentUrl, {
        ...args.init,
        redirect: "manual",
        signal: ctrl.signal,
      });
    } catch (err) {
      return { status: 0, text: null, contentType: null, error: fetchFailedError(err) };
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      await cancelBody(res);
      if (!loc || redirects >= MAX_REDIRECTS) {
        return {
          status: res.status,
          text: null,
          contentType: res.headers.get("content-type"),
          error: `http_${res.status}`,
        };
      }
      try {
        currentUrl = new URL(loc, currentUrl).toString();
      } catch {
        return { status: res.status, text: null, contentType: null, error: "fetch_failed: bad redirect" };
      }
      redirects += 1;
      continue;
    }

    if (res.status === 429) {
      const header = res.headers.get("retry-after");
      const waitMs = parseRetryAfterMs(header, args.hosts.now());
      await cancelBody(res);
      if (!retried429 && waitMs > 0 && waitMs <= INLINE_RETRY_MS) {
        retried429 = true;
        await args.hosts.sleep(waitMs);
        continue;
      }
      const waited = await args.hosts.note429(host, header);
      const seconds = Math.max(0, Math.round(waited / 1000));
      return {
        status: 429,
        text: null,
        contentType: res.headers.get("content-type"),
        error: `http_429 retry_after=${seconds}`,
      };
    }

    let text: string | null = null;
    try {
      text = await res.text();
    } catch (err) {
      return { status: res.status, text: null, contentType: res.headers.get("content-type"), error: fetchFailedError(err) };
    }
    if (res.status < 200 || res.status >= 300) {
      return {
        status: res.status,
        text,
        contentType: res.headers.get("content-type"),
        error: `http_${res.status}`,
      };
    }
    return { status: res.status, text, contentType: res.headers.get("content-type"), error: null };
  }

  return { status: 0, text: null, contentType: null, error: "fetch_failed: too many redirects" };
}

export function spreadByHost<T>(items: T[], hostOf: (item: T) => string): T[] {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const host = hostOf(item) || "";
    const bucket = buckets.get(host);
    if (bucket) bucket.push(item);
    else {
      buckets.set(host, [item]);
      order.push(host);
    }
  }
  const out: T[] = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const host of order) {
      const next = buckets.get(host)?.shift();
      if (next !== undefined) {
        out.push(next);
        pending = true;
      }
    }
  }
  return out;
}

/**
 * Wishlisted out-of-stock ids stay first, capped so the rotation still moves.
 * The cursor walks the id-sorted catalog. Callers advance it only by products
 * this run actually started.
 */
export function planCatalogIds(
  sortedIds: readonly string[],
  cursor: number,
  priorityIds: readonly string[],
  limits?: { cap?: number; priorityCap?: number },
): string[] {
  const cap = limits?.cap ?? CATALOG_PRODUCT_CAP;
  const priorityCap = limits?.priorityCap ?? CATALOG_PRIORITY_CAP;
  const inCatalog = new Set(sortedIds);
  const seen = new Set<string>();
  const planned: string[] = [];
  for (const id of priorityIds) {
    if (planned.length >= Math.min(priorityCap, cap)) break;
    if (!inCatalog.has(id) || seen.has(id)) continue;
    seen.add(id);
    planned.push(id);
  }
  const n = sortedIds.length;
  if (n === 0 || planned.length >= cap) return planned;
  const start = ((cursor % n) + n) % n;
  for (let i = 0; i < n && planned.length < cap; i++) {
    const id = sortedIds[(start + i) % n];
    if (seen.has(id)) continue;
    seen.add(id);
    planned.push(id);
  }
  return planned;
}

export function advanceCatalogCursor(
  sortedLength: number,
  cursor: number,
  attemptedIds: readonly string[],
  priorityIds: ReadonlySet<string>,
): number {
  if (sortedLength <= 0) return 0;
  let consumed = 0;
  for (const id of attemptedIds) {
    if (!priorityIds.has(id)) consumed += 1;
  }
  const start = ((cursor % sortedLength) + sortedLength) % sortedLength;
  return (start + consumed) % sortedLength;
}
