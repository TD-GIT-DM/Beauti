# Beauti

A dark, luxurious beauty shopping companion: top-discount editorial browse, tokenized catalog search, promo codes, a heart wishlist, and restock / price-drop alerts.

Beauti is **API-first** (Cloudflare Worker + D1) with a componentized React UI so the same catalog, wishlist, and notification APIs can power a later mobile app.

## Stack

- Vite + React + TypeScript SPA
- Cloudflare Workers with static assets (`assets.not_found_handling = "single-page-application"`)
- D1 — products, price history, wishlist, notifications
- KV — deal-scan cache
- Cron Trigger — deal scanner every 15 minutes
- Mock retailer feed at `src/services/deals/` (swap for real affiliate APIs later; **do not scrape storefronts**)

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
| `npm run preview` | Build and preview the Worker bundle locally |
| `npm run deploy` | Build, apply **remote** D1 migrations, `wrangler deploy` |
| `npm run db:migrate:local` | Apply D1 migrations to local SQLite |
| `npm run db:migrate:remote` | Apply D1 migrations to production D1 |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.toml` |

The Worker config lives in **`wrangler.toml`** (Wrangler also accepts `wrangler.jsonc`; this project uses TOML). Bindings:

- `DB` — D1 database `beauti`
- `DEALS_CACHE` — KV namespace `beauti-deals-cache`
- Cron `*/15 * * * *` → `scheduled` handler

You can fire the cron locally:

```bash
curl "http://localhost:5173/cdn-cgi/local/scheduled?format=json"
```

Or use **Notifications → Run deal scan** (same scanner, with a forced restock + price drop so alerts are easy to demo).

## Catalog UX

- **Home** — the **five highest discount %** deals, one product per viewport (scroll-snap). Discount comes from promo `discountPercent`, or from a drop vs price-history peak when that is larger. A final slide links into search.
- **Search** — `/search` is a dedicated tab (header magnifying glass). Empty state: **filter control at the top**, search bar **centered** in the viewport. Results: `/search?q=` / `tag=` plus price and discount filters.
- Multi-word queries are **AND-tokenized** (`red lipstick` matches tags/name/description that contain both `red` and `lipstick`), then ranked so name and tag hits beat a mention in copy.
- Out-of-stock products stay visible; the description includes a **restock estimate** (date range or “unknown / may not return”)

## Wishlist & notifications

Guest v1 uses a stable **device id** (`localStorage` + `X-Device-Id` header + cookie). Hearts write to D1 and fall back to `localStorage`.

When the deal scanner sees a wishlisted item **restock** or **drop in price**, it inserts rows in `notifications`. The in-app bell lists them. If you grant Notification permission, the service worker (`/sw.js`) shows a browser notification.

### Email later

The cron already creates notification records. To email:

1. Add `users.email` (or a later account table) keyed from `wishlist.user_id`
2. In `src/services/deals/index.ts` after `createNotifications`, send through Resend, SES, or MailChannels
3. Record `emailed_at` so retries stay idempotent

### Web Push later

`POST /api/push/subscribe` already stores Push API subscriptions. Add VAPID keys as Worker secrets (`wrangler secret put VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) and send payloads from the same cron to `push_subscriptions.endpoint`. The service worker already handles `push` events.

## Deal scanner architecture

```
src/services/deals/
  types.ts          DealProvider, DealSnapshot, AffiliateClient
  mock-retailer.ts  MockRetailerFeed (simulated prices / codes / stock)
  index.ts          scanDeals() → D1 + KV + wishlist alerts
```

Replace `MockRetailerFeed` with an Impact / CJ / ShareASale / retailer **feed** client that implements `DealProvider.fetchDeals()`. Do not scrape third-party HTML.

## Deploy to Cloudflare

1. `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`)
2. Confirm D1 + KV IDs in `wrangler.toml` (already provisioned for this account) or create your own:

   ```bash
   npx wrangler d1 create beauti
   npx wrangler kv namespace create beauti-deals-cache
   ```

3. `npm run deploy`

Live URL after a successful `wrangler login` + `npm run deploy`:

```
https://beauti.<your-subdomain>.workers.dev
```

This environment’s Wrangler CLI was not logged into the Cloudflare account that owns the provisioned D1/KV (IDs are already in `wrangler.toml`). Run `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` for that account), then `npm run deploy`. A preview `wrangler deploy --temporary` cannot attach those existing D1/KV IDs.

First request also bootstraps schema + seed if the catalog is empty, and applies the expanded aisle (`0004_expand_catalog`) if `mac-ruby-woo` is missing — so a fresh or previously seeded D1 still reaches **100+** products.

### Remote D1 catalog (already-deployed database)

If production D1 still has the original ~18 products, apply the new migration (safe `INSERT OR IGNORE`) then deploy:

```bash
npm run db:migrate:remote    # applies pending files in migrations/, including 0004_expand_catalog.sql
npm run deploy               # also runs remote migrate, then wrangler deploy
```

Locally: `npm run db:migrate:local` (or just `npm run dev`, which migrates first).

You can regenerate `0004` from the product list with `node scripts/generate-expand-catalog.mjs`.

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
| POST | `/api/push/subscribe` | Web Push subscription |

Send `X-Device-Id` on every call.

Promo codes in the seed catalog are **samples** for the mock feed, not guaranteed retailer coupons.
