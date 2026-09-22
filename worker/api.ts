import { Hono } from "hono";
import { omitStoredTags } from "../src/lib/public-product";
import { filterCatalog, parseOptionalNumber, parseSort, relevanceScore } from "../src/lib/search";
import { scanDeals } from "../src/services/deals";
import {
  accountScope,
  clearSessionCookie,
  createSession,
  destroySession,
  deviceFrom,
  findUserByUsername,
  hashPassword,
  isHexColor,
  isSecureRequest,
  mergeGuestWishlist,
  normalizeUsername,
  SESSION_HEADER,
  sessionCookie,
  sessionIdFrom,
  userFromRequest,
  validatePassword,
  validateUsername,
  verifyPassword,
  type AuthUser,
} from "./auth";
import { isAllowedCorsOrigin, isCrossSiteRequest } from "./cors";
import { adviseFromCatalog, parseAdvisorRequest } from "./advisor";
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

function json<T>(
  data: T,
  init: ResponseInit = {},
  extras: { deviceId?: string | null; sessionId?: string | null; clearSession?: boolean; request?: Request } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (extras.deviceId) headers.append("Set-Cookie", deviceCookie(extras.deviceId));
  const request = extras.request;
  const origin = request?.headers.get("Origin");
  const crossSite = Boolean(
    request && origin && isAllowedCorsOrigin(origin) && isCrossSiteRequest(request),
  );
  const secure = request ? isSecureRequest(request) : false;
  let payload: unknown = data;
  if (extras.sessionId) {
    headers.append("Set-Cookie", sessionCookie(extras.sessionId, secure, crossSite));
    headers.set(SESSION_HEADER, extras.sessionId);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      payload = { ...data, sessionId: extras.sessionId };
    }
  }
  if (extras.clearSession) {
    headers.append("Set-Cookie", clearSessionCookie(secure, crossSite));
    headers.set(SESSION_HEADER, "");
  }
  return new Response(JSON.stringify(payload), { ...init, headers });
}

function requireDevice(request: Request): string {
  return deviceIdFrom(request) ?? crypto.randomUUID();
}

async function actor(c: { req: { raw: Request }; env: Env }): Promise<{ deviceId: string; user: AuthUser | null }> {
  const deviceId = deviceFrom(c.req.raw);
  const user = await userFromRequest(c.req.raw, c.env.DB);
  return { deviceId, user };
}

async function lovedFor(c: { req: { raw: Request }; env: Env }, deviceId: string | null, user: AuthUser | null) {
  return wishlistedIds(c.env.DB, deviceId, user?.id);
}

export const api = new Hono<AppEnv>();

api.get("/api/health", (c) => c.json({ ok: true, name: "Beauti" }));

api.post("/api/advisor", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseAdvisorRequest(body);
  if ("error" in parsed) return json({ error: parsed.error }, { status: 400 });
  const result = await adviseFromCatalog(c.env, parsed.question, parsed.messages);
  return json(result);
});


api.get("/api/products", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const dealsOnly = c.req.query("deals") === "1";
  const minPrice = parseOptionalNumber(c.req.query("minPrice"));
  const maxPrice = parseOptionalNumber(c.req.query("maxPrice"));
  const minDiscount = parseOptionalNumber(c.req.query("minDiscount"));
  const sort = parseSort(c.req.query("sort"));
  const limit = parseOptionalNumber(c.req.query("limit"));
  const { deviceId, user } = await actor(c);
  const loved = await lovedFor(c, deviceId, user);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products ORDER BY deal_score DESC, name ASC`,
  ).all<ProductRow>();

  let products = await decorateProducts(c.env.DB, results ?? [], loved);
  // `tag` is ignored. Stored tags still match inside `q`.
  products = filterCatalog(products, { q, dealsOnly, minPrice, maxPrice, minDiscount });
  products = sortCatalog(products, sort, q);
  if (limit && limit > 0) products = products.slice(0, Math.min(Math.floor(limit), 200));

  return json(
    { products: products.map(omitStoredTags), query: q, minPrice, maxPrice, minDiscount, sort },
    {},
    { deviceId },
  );
});

api.get("/api/products/:id", async (c) => {
  const id = c.req.param("id");
  const { deviceId, user } = await actor(c);
  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  if (!row) return json({ error: "Not found" }, { status: 404 }, { deviceId });
  const loved = await lovedFor(c, deviceId, user);
  const priceHistory = await loadHistory(c.env.DB, id);
  const product = withDiscount(mapProduct(row, { priceHistory, wishlisted: loved.has(id) }));
  return json({ product: omitStoredTags(product) }, {}, { deviceId });
});

api.get("/api/deals", async (c) => {
  const { deviceId, user } = await actor(c);
  const loved = await lovedFor(c, deviceId, user);
  const { results } = await c.env.DB.prepare(`SELECT * FROM products`).all<ProductRow>();
  const ranked = sortCatalog(await decorateProducts(c.env.DB, results ?? [], loved), "discount_desc");
  const products = pickTopDeals(ranked, 5).map(omitStoredTags);
  const lastScan = await c.env.DEALS_CACHE.get("deals:last-scan");
  return json(
    {
      products,
      lastScan: lastScan ? JSON.parse(lastScan) : null,
    },
    {},
    { deviceId },
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
  const { deviceId, user } = await actor(c);
  const loved = await lovedFor(c, deviceId, user);
  if (!loved.size) return json({ products: [], deviceId, account: Boolean(user) }, {}, { deviceId });
  const placeholders = [...loved].map(() => "?").join(",");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products WHERE id IN (${placeholders}) ORDER BY name ASC`,
  )
    .bind(...loved)
    .all<ProductRow>();
  return json(
    {
      products: (await decorateProducts(c.env.DB, results ?? [], loved)).map(omitStoredTags),
      deviceId,
      account: Boolean(user),
    },
    {},
    { deviceId },
  );
});

api.post("/api/wishlist", async (c) => {
  const { deviceId, user } = await actor(c);
  const body = (await c.req.json()) as { productId?: string };
  const productId = body.productId?.trim();
  if (!productId) return json({ error: "productId required" }, { status: 400 }, { deviceId });
  const exists = await c.env.DB.prepare(`SELECT id FROM products WHERE id = ?`).bind(productId).first();
  if (!exists) return json({ error: "Not found" }, { status: 404 }, { deviceId });
  const now = new Date().toISOString();
  if (user) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO wishlist (device_id, product_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
      ).bind(accountScope(user.id), productId, user.id, now),
      c.env.DB.prepare(`INSERT OR IGNORE INTO wishlist (device_id, product_id, created_at) VALUES (?, ?, ?)`).bind(
        deviceId,
        productId,
        now,
      ),
    ]);
  } else {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO wishlist (device_id, product_id, created_at) VALUES (?, ?, ?)`)
      .bind(deviceId, productId, now)
      .run();
  }
  return json({ ok: true, wishlisted: true, productId }, {}, { deviceId });
});

api.delete("/api/wishlist/:productId", async (c) => {
  const { deviceId, user } = await actor(c);
  const productId = c.req.param("productId");
  if (user) {
    await c.env.DB.prepare(`DELETE FROM wishlist WHERE product_id = ? AND (user_id = ? OR device_id = ?)`)
      .bind(productId, user.id, deviceId)
      .run();
  } else {
    await c.env.DB.prepare(`DELETE FROM wishlist WHERE device_id = ? AND product_id = ?`)
      .bind(deviceId, productId)
      .run();
  }
  return json({ ok: true, wishlisted: false, productId }, {}, { deviceId });
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
  return json({ notifications: results ?? [], unread, deviceId }, {}, { deviceId });
});

api.post("/api/notifications/:id/read", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  await c.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND device_id = ?`)
    .bind(c.req.param("id"), deviceId)
    .run();
  return json({ ok: true }, {}, { deviceId });
});

api.post("/api/notifications/read-all", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  await c.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE device_id = ?`).bind(deviceId).run();
  return json({ ok: true }, {}, { deviceId });
});

api.post("/api/push/subscribe", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  const body = (await c.req.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return json({ error: "Invalid subscription" }, { status: 400 }, { deviceId });
  }
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (device_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(deviceId, body.endpoint, body.keys.p256dh, body.keys.auth, new Date().toISOString())
    .run();
  return json({ ok: true }, {}, { deviceId });
});

api.get("/api/auth/me", async (c) => {
  const { deviceId, user } = await actor(c);
  const sessionId = sessionIdFrom(c.req.raw);
  if (user) {
    const wishlist = await mergeGuestWishlist(c.env.DB, user.id, deviceId);
    return json({ user, wishlist, deviceId }, {}, { deviceId, sessionId, request: c.req.raw });
  }
  return json({ user: null, wishlist: [...(await lovedFor(c, deviceId, null))], deviceId }, {}, { deviceId });
});

api.post("/api/auth/signup", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  let body: { username?: string; password?: string };
  try {
    body = (await c.req.json()) as { username?: string; password?: string };
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 }, { deviceId });
  }
  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";
  const userError = validateUsername(username);
  if (userError) return json({ error: userError }, { status: 400 }, { deviceId });
  const passError = validatePassword(password);
  if (passError) return json({ error: passError }, { status: 400 }, { deviceId });

  const existing = await findUserByUsername(c.env.DB, username);
  if (existing) return json({ error: "That username is taken." }, { status: 409 }, { deviceId });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { hash, salt } = await hashPassword(password);
  try {
    await c.env.DB.prepare(
      `INSERT INTO users (id, username, password_hash, password_salt, device_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, username, hash, salt, deviceId, now)
      .run();
  } catch {
    return json({ error: "That username is taken." }, { status: 409 }, { deviceId });
  }

  const sessionId = await createSession(c.env.DB, id);
  const wishlist = await mergeGuestWishlist(c.env.DB, id, deviceId);
  const user = { id, username, themeMain: null, themeSecondary: null };
  return json({ user, wishlist, deviceId }, {}, { deviceId, sessionId, request: c.req.raw });
});

api.post("/api/auth/signin", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  let body: { username?: string; password?: string };
  try {
    body = (await c.req.json()) as { username?: string; password?: string };
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 }, { deviceId });
  }
  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";
  const row = await findUserByUsername(c.env.DB, username);
  if (!row?.password_hash || !row.password_salt) {
    return json({ error: "Username or password is incorrect." }, { status: 401 }, { deviceId });
  }
  const ok = await verifyPassword(password, row.password_hash, row.password_salt);
  if (!ok) return json({ error: "Username or password is incorrect." }, { status: 401 }, { deviceId });

  const sessionId = await createSession(c.env.DB, row.id);
  const wishlist = await mergeGuestWishlist(c.env.DB, row.id, deviceId);
  const user = {
    id: row.id,
    username: row.username ?? username,
    themeMain: row.theme_main,
    themeSecondary: row.theme_secondary,
  };
  return json({ user, wishlist, deviceId }, {}, { deviceId, sessionId, request: c.req.raw });
});

api.post("/api/auth/signout", async (c) => {
  const deviceId = requireDevice(c.req.raw);
  await destroySession(c.req.raw, c.env.DB);
  return json({ ok: true, user: null, deviceId }, {}, { deviceId, clearSession: true, request: c.req.raw });
});

api.get("/api/settings", async (c) => {
  const { deviceId, user } = await actor(c);
  if (!user) return json({ error: "Sign in to sync settings." }, { status: 401 }, { deviceId });
  return json({ themeMain: user.themeMain, themeSecondary: user.themeSecondary, username: user.username }, {}, { deviceId });
});

api.patch("/api/settings", async (c) => {
  const { deviceId, user } = await actor(c);
  if (!user) return json({ error: "Sign in to sync settings." }, { status: 401 }, { deviceId });
  let body: { themeMain?: string; themeSecondary?: string };
  try {
    body = (await c.req.json()) as { themeMain?: string; themeSecondary?: string };
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 }, { deviceId });
  }
  const themeMain = body.themeMain?.trim();
  const themeSecondary = body.themeSecondary?.trim();
  if (themeMain && !isHexColor(themeMain)) {
    return json({ error: "Main color must be a 6-digit hex value." }, { status: 400 }, { deviceId });
  }
  if (themeSecondary && !isHexColor(themeSecondary)) {
    return json({ error: "Secondary color must be a 6-digit hex value." }, { status: 400 }, { deviceId });
  }
  const nextMain = themeMain ?? user.themeMain;
  const nextSecondary = themeSecondary ?? user.themeSecondary;
  await c.env.DB.prepare(`UPDATE users SET theme_main = ?, theme_secondary = ? WHERE id = ?`)
    .bind(nextMain, nextSecondary, user.id)
    .run();
  return json(
    { ok: true, themeMain: nextMain, themeSecondary: nextSecondary, username: user.username },
    {},
    { deviceId },
  );
});

/**
 * Home five: real markdowns first (unique pack shots), then honest full-price
 * best-price picks — never invent a % badge to fill the slate.
 */
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
  const bestPrice = [...ranked]
    .filter((product) => product.discountPercent <= 0)
    .sort((a, b) => a.price - b.price || b.dealScore - a.dealScore || a.name.localeCompare(b.name));
  take(discounted, true);
  take(discounted, false);
  take(bestPrice, true);
  take(bestPrice, false);
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
