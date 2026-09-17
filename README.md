# Beauti

A dark, luxurious beauty shopping companion: top-discount editorial browse, tokenized catalog search, promo codes, a heart wishlist, and restock / price-drop alerts.

Beauti is **API-first** (Cloudflare Worker + D1) with a componentized React UI. The same catalog, wishlist, and notification APIs power the website and the iOS Capacitor shell.

## iOS app shell

The App Store wrapper lives in this repo (Capacitor). It ships the built SPA and calls the live Worker. This environment cannot sign in to Apple.

- Full walkthrough: [`docs/ios.md`](docs/ios.md)
- Listing copy and privacy labels: [`docs/app-store-listing.md`](docs/app-store-listing.md)
- On a Mac: `npm run ios:bootstrap` then `npx cap open ios`
- Bundle id: `com.tdgitdm.beauti` (how to change is in `docs/ios.md`)

You still need your own Apple Developer Program membership to upload. Deploy the Worker CORS changes (`npm run deploy`) so the device can call `/api`.

## Stack

- Vite + React + TypeScript SPA
- Cloudflare Workers with static assets (`assets.not_found_handling = "single-page-application"`)
- D1 — products, price history, wishlist, notifications
- KV — deal-scan cache
- Workers AI — catalog-grounded on-site product advisor (`env.AI`)
- Cron Trigger — catalog availability + price refresh every 15 minutes (Sephora / Shopify JSON)
- Mock retailer feed at `src/services/deals/` (demo restock / drop only; production cron does not invent prices or stock; **do not scrape storefronts**)

## Local setup

```bash
npm install
npx wrangler login          # once, for deploy / remote D1
npm run dev                 # applies local D1 migrations, then Vite
```

Open [http://localhost:5173](http://localhost:5173).

| Script | What it does |
| --- | --- |
| `npm run dev` | Local D1 migrate + Vite (Workers runtime via `@cloudflare/vite-plugin`) |
| `npm run build` | Typecheck + production build (`dist/`) |
| `npm run build:ios` | SPA-only Capacitor bundle (`dist-native/`) aimed at the live Worker |
| `npm run ios:bootstrap` | Mac: generate icons, build, `cap add ios` if needed, `cap sync` |
| `npm run ios:sync` | Rebuild native web assets and copy them into `ios/` |
| `npm run preview` | Build and preview the Worker bundle locally |
| `npm run deploy` | Build, apply **remote** D1 migrations, `wrangler deploy` |
| `npm run db:migrate:local` | Apply D1 migrations to local SQLite |
| `npm run db:migrate:remote` | Apply D1 migrations to production D1 |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.toml` |
| `npm run catalog:resolve-images` | Refresh official pack-shot map + `0007_real_product_images.sql` |
| `npm run catalog:resolve-urls` | Sephora catalog lookup + HEAD checks → `scripts/data/real-product-urls.json` |
| `npm run catalog:generate:0008` | Write `0008_real_product_urls.sql` from that JSON |
| `npm run catalog:resolve-prices` | Sephora catalog JSON + Shopify product JSON + known MSRP → `scripts/data/honest-prices.json` |
| `npm run catalog:generate:0009` | Write `0009_honest_prices.sql` from that JSON |
| `npm run catalog:test-prices` | Assert no invented promo codes; discount only when list > sale |
| `npm run catalog:resolve-availability` | Sephora catalog JSON + Shopify product JSON → `scripts/data/availability.json` |
| `npm run catalog:generate:0010` | Write `0010_sync_availability.sql` from that JSON |
| `npm run catalog:test-availability` | Assert explicit stock cites JSON sources; in-stock clears restock estimates |

The Worker config lives in **`wrangler.toml`** (Wrangler also accepts `wrangler.jsonc`; this project uses TOML). Bindings:

- `DB` — D1 database `beauti`
- `DEALS_CACHE` — KV namespace `beauti-deals-cache`
- `AI` — Workers AI (`[ai] binding = "AI"`). No third-party API key. Used by `POST /api/advisor`.
- Cron `*/15 * * * *` → `scheduled` handler

You can fire the production catalog sync locally:

```bash
curl "http://localhost:5173/cdn-cgi/local/scheduled?format=json"
```

That hits the same 15-minute Cron Trigger path: a rotating batch of SKUs is quoted from Sephora catalog JSON and Shopify product JSON, then D1 `availability` / `restock_estimate` (and price when the source includes it) are persisted. Wishlist restock alerts fire on real OOS → in-stock transitions.

**Notifications → Run deal scan** is a separate demo path (`POST /api/deals/scan` with `force`). It still forces a mock restock + price drop so alerts are easy to demo. It does **not** call retailer APIs.

## Catalog UX

- **Home** — up to **five real markdowns** (list vs sale on the linked retailer/brand page), one product per viewport (scroll-snap). If fewer than five SKUs are actually on sale, the slate fills with honest best-price picks and **no fake % off badge**. Discount is never invented from seed promo codes or mock price-history peaks.
- **Search** — `/search` is a dedicated tab (header magnifying glass). Empty state: **filter control at the top**, search bar **centered** in the viewport. Results: `/search?q=` / `tag=` plus price and discount filters.
- Multi-word queries are **AND-tokenized** (`red lipstick` matches tags/name/description that contain both `red` and `lipstick`), then ranked so name and tag hits beat a mention in copy.
- Out-of-stock products stay visible; the description includes a **restock estimate** (date range or “unknown / may not return”)
- **Ask Beauti** — floating catalog advisor. Natural questions are matched against D1 products (tags, name, brand, description, availability), then Workers AI writes a short reply from that shortlist only. Cards open `/product/:id`. Off-catalog asks are refused. This is product matching, not medical advice.

## Wishlist & notifications

Guest v1 uses a stable **device id** (`localStorage` + `X-Device-Id` header + cookie). Hearts write to D1 and fall back to `localStorage`.

When the deal scanner sees a wishlisted item **restock** or **drop in price**, it inserts rows in `notifications`. The in-app bell lists them. If you grant Notification permission, the service worker (`/sw.js`) shows a browser notification.

### Email later

The cron already creates notification records from **real** restock / price-drop transitions. To email:

1. Add `users.email` (or a later account table) keyed from `wishlist.user_id`
2. In `src/services/deals/index.ts` after `createNotifications`, send through Resend, SES, or MailChannels
3. Record `emailed_at` so retries stay idempotent

### Web Push later

`POST /api/push/subscribe` already stores Push API subscriptions. Add VAPID keys as Worker secrets (`wrangler secret put VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) and send payloads from the same cron to `push_subscriptions.endpoint`. The service worker already handles `push` events.

## Deal scanner architecture

```
src/services/deals/
  types.ts            DealProvider, DealSnapshot, AffiliateClient
  catalog-sources.ts  Sephora catalog JSON + Shopify product JSON (production)
  mock-retailer.ts    MockRetailerFeed (identity snapshots; forced demo events only)
  index.ts            scanDeals() → D1 + KV + wishlist alerts
```

Cron (`*/15 * * * *`, no `force`) loads a rotating batch (~48 SKUs, wishlisted OOS first) and quotes each from:

1. Linked Shopify `/products/{handle}.js` when the stored URL is a brand PDP
2. Sephora `/api/v2/catalog/search` (and product JSON when that card includes `isOutOfStock`)
3. Brand Shopify `products.json` when the brand has a public shop and search omitted stock flags

Unverified SKUs are left unchanged — stock is never invented. Manual **Run deal scan** still uses `MockRetailerFeed` + forced events. Do not scrape third-party HTML.

## Deploy to Cloudflare

1. `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`)
2. Confirm D1 + KV IDs in `wrangler.toml` (already provisioned for this account) or create your own:

   ```bash
   npx wrangler d1 create beauti
   npx wrangler kv namespace create beauti-deals-cache
   ```

3. `npm run deploy`

Workers AI is enabled by the `[ai]` binding. After changing bindings, regenerate types:

```bash
npm run cf-typegen
```

No extra secret is required. Inference uses the Cloudflare account’s Workers AI allocation (free tier, then billed to the account).

`vite.config.ts` sets `cloudflare({ remoteBindings: false })` so `npm run dev` does not hang on OAuth. The advisor still ranks D1 products. Production `npm run deploy` uses the live `[ai]` Workers AI binding. After `npx wrangler login`, you can set `remoteBindings: true` to call `@cf/meta/llama-3.1-8b-instruct-fast` from Vite.

Live URL after a successful `wrangler login` + `npm run deploy`:

```
https://beauti.<your-subdomain>.workers.dev
```

This environment’s Wrangler CLI was not logged into the Cloudflare account that owns the provisioned D1/KV (IDs are already in `wrangler.toml`). Run `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` for that account), then `npm run deploy`. A preview `wrangler deploy --temporary` cannot attach those existing D1/KV IDs.

First request bootstraps **schema + the original ~18 seed SKUs only** (`0001_init` + `0002_seed`). It does **not** `db.exec` the large aisle files — that 500s production D1.

The comprehensive catalog lives in later migrations and must be applied with Wrangler:

```bash
npm run db:migrate:local     # local SQLite (also runs at the start of npm run dev)
npm run db:migrate:remote    # production D1 — applies pending files in migrations/
```

| Migration | What it adds |
| --- | --- |
| `0004_expand_catalog.sql` | First aisle expansion (~100 SKUs) |
| `0005_lipstick_images.sql` | Lipstick photo fixes |
| `0006_perfume_makeup_expand.sql` | Deep perfume aisle + full-shade lipstick/gloss/liner, blush, foundation/concealer, eyes, nails, serums (~450 SKUs). Images have **no `?` query strings**. Inserts are batched so each statement stays under D1’s 100 KB limit. |
| `0007_real_product_images.sql` | Official brand/retailer **pack shots** (~210 verified HTTPS URLs, no `?`) + real `product_url`s (brand/Shopify page, or a Sephora `/search/{slug}` path). The other ~370 SKUs keep the best pack-like photo and gain an `image-placeholder` tag. Do **not** `db.exec` this from `ensureCatalog` — apply with Wrangler / MCP batch updates. |
| `0008_real_product_urls.sql` | Replaces Google / fake `sephora.com/product/{beauti-id}` links with **verified retailer or brand PDPs** (**441 / 580**: 367 Sephora `-P` pages, 74 official brand PDPs). The other **139** SKUs get a path-only Sephora `/search/{slug}` or Ulta `/brand/{brand}` URL (no `?` in SQL). Do **not** `db.exec` this from `ensureCatalog`. |
| `0009_honest_prices.sql` | Adds `list_price`, rewrites `price` / `promo_codes` / `deal_score` from Sephora catalog JSON, Shopify product JSON, or known MSRP. Clears invented seed coupons and fake price-history peaks. Do **not** `db.exec` this from `ensureCatalog`. |
| `0010_sync_availability.sql` | Rewrites `availability` / `restock_estimate` / `deal_score` from the same catalog JSON sources. OOS SKUs keep a restock estimate only when the source provides one; in-stock clears stale estimates. Unverified rows are left unchanged. Do **not** `db.exec` this from `ensureCatalog`. |

`INSERT OR IGNORE` so re-applying is safe on an already-seeded database.

### Apply `0008` to production D1

`ensureCatalog` never runs `0008`, `0009`, or `0010` (same 100 KB / statement-volume limit that 500s 0004/0006/0007). Apply the files with Wrangler or Cloudflare MCP.

**Wrangler (preferred):**

```bash
npm run db:migrate:remote    # CI=1 wrangler d1 migrations apply beauti --remote
# includes any pending files in migrations/, including 0008 + 0009 + 0010
npm run deploy               # also runs remote migrate, then wrangler deploy
```

Confirm with Wrangler:

```bash
npx wrangler d1 migrations list beauti --remote
```

**Cloudflare MCP** (`d1_database_query` on the Bindings server): database id `f83c9aae-86c4-457a-882a-fd86d1fb85bb` (see `wrangler.toml`). Run the batched `UPDATE` statements from `migrations/0008_real_product_urls.sql` in chunks (do not paste the whole file into one `db.exec`). Bind parameters if a URL ever contains `?` — this file is written without query strings so quoted HTTPS paths are safe.

After migrate, shop / deal clicks that still have a fake or empty `product_url` are rewritten in the Worker to:

- `https://www.sephora.com/search?keyword=` + `encodeURIComponent(brand + ' ' + name)` (prestige)
- `https://www.ulta.com/search?search=` + the same query (mass / drugstore brands)

Never Google.

Regenerate SQL from the product lists:

```bash
node scripts/generate-expand-catalog.mjs            # writes 0004
node scripts/generate-perfume-makeup-expand.mjs     # writes 0006
python3 scripts/resolve-real-product-images.py      # Shopify/Wikimedia/CDN lookup → JSON
node scripts/generate-real-product-images.mjs       # writes 0007 from that JSON
python3 scripts/resolve-real-product-urls.py        # Sephora catalog JSON + HEAD checks → JSON
node scripts/generate-real-product-urls.mjs         # writes 0008 from that JSON
python3 scripts/resolve-honest-prices.py            # Sephora catalog + Shopify JSON + known MSRP → JSON
node scripts/generate-honest-prices.mjs             # writes 0009 from that JSON
python3 scripts/resolve-availability.py             # Sephora catalog + Shopify JSON → availability JSON
node scripts/generate-availability.mjs              # writes 0010 from that JSON
```

### Re-run price sync

Prices must match the retailer/brand page we link to (or the lowest found current selling price from that source). Do not invent markdowns.

```bash
npm run catalog:resolve-prices    # talks to Sephora catalog JSON + Shopify /products/{handle}.js
npm run catalog:generate:0009     # rewrites migrations/0009_honest_prices.sql
npm run catalog:test-prices
npm run db:migrate:local          # or db:migrate:remote
```

`resolve-honest-prices.py` prefers:

1. **Sephora catalog search JSON** for SKUs whose stored URL is a `-P` PDP (same API as the URL resolver)
2. **Shopify product JSON** (`.js`) for official brand `/products/{handle}` URLs
3. **Known list prices** in `scripts/data/known-list-prices.json` when neither feed matches
4. Keep the existing catalog selling price and set `discountPercent: 0` / `promo_codes: []`

A `% off` badge is emitted only when `list_price > price` (a real sale) or a promo is marked `verified`. The production cron **does** persist real price + availability from those JSON sources (rotating batch every 15 minutes). It does not persist mock price drops.

### Re-run availability sync

Availability must match the retailer/brand page we link to. Do not invent stock or scrape HTML.

```bash
npm run catalog:resolve-availability   # Sephora catalog JSON + Shopify /products/{handle}.js + products.json
npm run catalog:generate:0010          # rewrites migrations/0010_sync_availability.sql
npm run catalog:test-availability
npm run db:migrate:local               # or db:migrate:remote
```

`resolve-availability.py` prefers:

1. **Shopify product JSON** (`.js`) for official brand `/products/{handle}` URLs
2. **Sephora catalog search JSON** (and product JSON when it includes `isOutOfStock` / `isOnlyFewLeft` / `isComingSoon`) for `-P` PDPs
3. **Brand Shopify `products.json`** when the search card omitted stock flags
4. Leave the existing row unchanged when no source provided an explicit boolean

OOS → `out_of_stock` and `restock_estimate` only if the source sent a date / “coming soon”; otherwise `NULL`. Back in stock → `in_stock` and a cleared restock estimate. The production cron repeats this for a rotating batch every 15 minutes and writes wishlist restock notifications on real transitions.

Generators prefer official pack shots from `scripts/lib/catalog-media.mjs` (and `scripts/data/real-product-images.json` when present) instead of inventing Unsplash URLs. Product links prefer a verified Sephora/Ulta/brand PDP; SQL fallbacks stay on Sephora/Ulta as a path (no `?`). The Worker emits `search?keyword=` / Ulta `search?search=` only when the stored URL is still fake or missing.

## API (for a future mobile app)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products?q=&tag=&minPrice=&maxPrice=&minDiscount=&sort=&limit=` | Catalog + tokenized search. `sort`: `deal` (default), `price_asc`, `price_desc`, `discount_desc` |
| GET | `/api/products/:id` | Detail + price history |
| GET | `/api/tags` | Tag cloud |
| GET | `/api/deals` | Top 5 by computed discount % |
| POST | `/api/deals/scan` | `{ "force": "cycle" \| "restock" \| "drop" }` |
| GET/POST/DELETE | `/api/wishlist` | Device-scoped hearts |
| GET | `/api/notifications` | Inbox |
| POST | `/api/advisor` | `{ "message": "vanilla perfume", "messages"?: [{role, content}] }` catalog-only product matcher |
| POST | `/api/push/subscribe` | Web Push subscription |

Send `X-Device-Id` on every call. The iOS shell also sends `X-Beauti-Session` after sign-in (WKWebView may ignore the session cookie). See [`docs/ios.md`](docs/ios.md).

`POST /api/advisor` grounds replies in the D1 `products` table. The Worker searches the catalog first, then optionally calls `@cf/meta/llama-3.1-8b-instruct-fast` with that shortlist. Product ids in the response always exist in catalog. The SPA navigates to `/product/:id`.

Promo codes are shown only when a **verified** retailer/brand promo exists. Seed codes such as `RARE10` / `SOL20` are not real and are stripped. A `% off` badge appears only when `list_price` is higher than the current selling `price` (or a promo is marked `verified: true`).
