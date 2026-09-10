import { Hono } from "hono";
import { matchesQuery, parseOptionalNumber, parseSort, relevanceScore } from "../src/lib/search";
import { scanDeals } from "../src/services/deals";
import {
  decorateProducts,
  deviceCookie,
  deviceIdFrom,
  loadHistory,
  mapProduct,
  wishlistedIds,
  withDiscount,
  type ProductRecord,
  type ProductRow,
} from "./db";

type AppEnv = { Bindings: Env };

function json<T>(data: T, init: ResponseInit = {}, deviceId?: string | null) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (deviceId) headers.append("Set-Cookie", deviceCookie(deviceId));
  return new Response(JSON.stringify(data), { ...init, headers });
}

function requireDevice(request: Request): string {
  return deviceIdFrom(request) ?? crypto.randomUUID();
}

export const api = new Hono<AppEnv>();

api.get("/api/health", (c) => c.json({ ok: true, name: "Beauti" }));

api.get("/api/products", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const tag = (c.req.query("tag") ?? "").trim().toLowerCase();
  const dealsOnly = c.req.query("deals") === "1";
  const minPrice = parseOptionalNumber(c.req.query("minPrice"));
  const maxPrice = parseOptionalNumber(c.req.query("maxPrice"));
  const minDiscount = parseOptionalNumber(c.req.query("minDiscount"));
  const sort = parseSort(c.req.query("sort"));
  const limit = parseOptionalNumber(c.req.query("limit"));
  const deviceId = deviceIdFrom(c.req.raw);
  const loved = await wishlistedIds(c.env.DB, deviceId);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products ORDER BY deal_score DESC, name ASC`,
  ).all<ProductRow>();

  let products = await decorateProducts(c.env.DB, results ?? [], loved);
  products = filterCatalog(products, { q, tag, dealsOnly, minPrice, maxPrice, minDiscount });
  products = sortCatalog(products, sort, q);
  if (limit && limit > 0) products = products.slice(0, Math.min(Math.floor(limit), 200));

  return json(
    { products, query: q, tag, minPrice, maxPrice, minDiscount, sort },
    {},
    deviceId,
  );
});

api.get("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const deviceId = deviceIdFrom(c.req.raw);
  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  if (!row) return json({ error: "Not found" }, { status: 404 }, deviceId);
  const loved = await wishlistedIds(c.env.DB, deviceId);
  const priceHistory = await loadHistory(c.env.DB, id);
  const product = withDiscount(mapProduct(row, { priceHistory, wishlisted: loved.has(id) }));
  return json({ product }, {}, deviceId);
});

api.get("/api/tags", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT tags FROM products`).all<{ tags: string }>();
  const counts = new Map<string, number>();
  for (const row of results ?? []) {
    try {
      for (const tag of JSON.parse(row.tags) as string[]) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    } catch {
      /* ignore malformed */
    }
  }
  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return json({ tags });
});

api.get("/api/deals", async (c) => {
  const deviceId = deviceIdFrom(c.req.raw);
  const loved = await wishlistedIds(c.env.DB, deviceId);
  const { results } = await c.env.DB.prepare(`SELECT * FROM products`).all<ProductRow>();
  const ranked = sortCatalog(await decorateProducts(c.env.DB, results ?? [], loved), "discount_desc");
  const products = pickTopDeals(ranked, 5);
  const lastScan = await c.env.DEALS_CACHE.get("deals:last-scan");
  return json(
    {
      products,
      lastScan: lastScan ? JSON.parse(lastScan) : null,
    },
    {},
    deviceId,
  );
});

api.post("/api/deals/scan", async (c) => {
  let force: "restock" | "drop" | "cycle" | undefined;
  try {
    const body = (await c.req.json()) as { force?: string };
    if (body.force === "restock" || body.force === "drop" || body.force === "cycle") {
      force = body.force;
    }
  } catch {
    force = "cycle";
  }
  const summary = await scanDeals(c.env, { force: force ?? "cycle" });
  console.log(JSON.stringify({ event: "deal_scan_manual", ...summary }));
  return json({ summary });
});

api.get("/api/wishlist", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const loved = await wishlistedIds(c.env.DB, deviceId);
  if (!loved.size) return json({ products: [], deviceId }, {}, deviceId);
  const placeholders = [...loved].map(() => "?").join(",");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products WHERE id IN (${placeholders}) ORDER BY name ASC`,
  )
    .bind(...loved)
    .all<ProductRow>();
  return json(
    { products: await decorateProducts(c.env.DB, results ?? [], loved), deviceId },
    {},
    deviceId,
  );
});

api.post("/api/wishlist", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const body = (await c.req.json()) as { productId?: string };
  const productId = body.productId?.trim();
  if (!productId) return json({ error: "productId required" }, { status: 400 }, deviceId);
  const exists = await c.env.DB.prepare(`SELECT id FROM products WHERE id = ?`).bind(productId).first();
  if (!exists) return json({ error: "Not found" }, { status: 404 }, deviceId);
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO wishlist (device_id, product_id, created_at) VALUES (?, ?, ?)`,
  )
    .bind(deviceId, productId, new Date().toISOString())
    .run();
  return json({ ok: true, wishlisted: true, productId }, {}, deviceId);
});

api.delete("/api/wishlist/:productId", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const productId = c.req.param("productId");
  await c.env.DB.prepare(`DELETE FROM wishlist WHERE device_id = ? AND product_id = ?`)
    .bind(deviceId, productId)
    .run();
  return json({ ok: true, wishlisted: false, productId }, {}, deviceId);
});

api.get("/api/notifications", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const { results } = await c.env.DB.prepare(
    `SELECT n.id, n.product_id, n.type, n.title, n.body, n.read, n.created_at,
            p.name as product_name, p.image_url, p.brand
     FROM notifications n
     JOIN products p ON p.id = n.product_id
     WHERE n.device_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50`,
  )
    .bind(deviceId)
    .all();
  const unread = (results ?? []).filter((n) => !n.read).length;
  return json({ notifications: results ?? [], unread, deviceId }, {}, deviceId);
});

api.post("/api/notifications/:id/read", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  await c.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND device_id = ?`)
    .bind(c.req.param("id"), deviceId)
    .run();
  return json({ ok: true }, {}, deviceId);
});

api.post("/api/notifications/read-all", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  await c.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE device_id = ?`).bind(deviceId).run();
  return json({ ok: true }, {}, deviceId);
});

api.post("/api/push/subscribe", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const body = (await c.req.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return json({ error: "Invalid subscription" }, { status: 400 }, deviceId);
  }
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (device_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(deviceId, body.endpoint, body.keys.p256dh, body.keys.auth, new Date().toISOString())
    .run();
  return json({ ok: true }, {}, deviceId);
});

function filterCatalog(
  products: ProductRecord[],
  opts: {
    q: string;
    tag: string;
    dealsOnly: boolean;
    minPrice?: number;
    maxPrice?: number;
    minDiscount?: number;
  },
): ProductRecord[] {
  let next = products;
  if (opts.q) {
    next = next.filter((p) =>
      matchesQuery(
        [
          p.name,
          p.brand,
          p.description,
          p.tags,
          p.promoCodes.map((code) => `${code.code} ${code.label}`),
        ],
        opts.q,
      ),
    );
  }
  if (opts.tag) {
    next = next.filter((p) => p.tags.some((t) => t.toLowerCase() === opts.tag));
  }
  if (opts.dealsOnly) {
    next = next.filter((p) => p.discountPercent > 0 && p.promoCodes.length > 0);
  }
  if (opts.minPrice != null) next = next.filter((p) => p.price >= opts.minPrice!);
  if (opts.maxPrice != null) next = next.filter((p) => p.price <= opts.maxPrice!);
  if (opts.minDiscount != null) next = next.filter((p) => p.discountPercent >= opts.minDiscount!);
  return next;
}

/** Prefer discounted SKUs with distinct pack shots so the home five never collapse into one photo. */
export function pickTopDeals(ranked: ProductRecord[], limit = 5): ProductRecord[] {
  const picked: ProductRecord[] = [];
  const usedImages = new Set<string>();
  const take = (pool: ProductRecord[], requireUniqueImage: boolean) => {
    for (const product of pool) {
      if (picked.length >= limit) return;
      if (picked.some((row) => row.id === product.id)) continue;
      if (requireUniqueImage && product.imageUrl && usedImages.has(product.imageUrl)) continue;
      picked.push(product);
      if (product.imageUrl) usedImages.add(product.imageUrl);
    }
  };
  const discounted = ranked.filter((product) => product.discountPercent > 0);
  take(discounted, true);
  take(discounted, false);
  take(ranked, true);
  take(ranked, false);
  return picked;
}

function sortCatalog(products: ProductRecord[], sort: ReturnType<typeof parseSort>, q = ""): ProductRecord[] {
  const copy = [...products];
  copy.sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price || a.name.localeCompare(b.name);
    if (sort === "price_desc") return b.price - a.price || a.name.localeCompare(b.name);
    if (sort === "discount_desc") {
      return (
        b.discountPercent - a.discountPercent ||
        (q ? relevanceScore(b, q) - relevanceScore(a, q) : 0) ||
        b.dealScore - a.dealScore ||
        a.name.localeCompare(b.name)
      );
    }
    return (
      (q ? relevanceScore(b, q) - relevanceScore(a, q) : 0) ||
      b.dealScore - a.dealScore ||
      a.name.localeCompare(b.name)
    );
  });
  return copy;
}
