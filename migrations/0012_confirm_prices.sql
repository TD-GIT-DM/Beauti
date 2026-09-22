-- Confirm sellable prices against linked retailer JSON.
-- Sources: Sephora catalog search JSON, Shopify product .js (USD), brand products.json
-- when the linked .js URL is gone. No invented markdowns.
-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:
--   npm run catalog:confirm-prices && npm run catalog:generate:0012
--   npm run db:migrate:local
--   npm run db:migrate:remote
--
-- Verified SKUs: 398  (Sephora 346, Shopify 52)
-- Unverified (left unchanged): 182
-- Price rows updated: 17
-- Prices flipped: 17
-- Fake discounts removed: 1
-- Understated discounts raised: 0

UPDATE products SET price = 14.00, list_price = 14.00, deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-blue-moon';
UPDATE products SET price = 14.00, list_price = 14.00, deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-going-coconuts';
UPDATE products SET price = 64.00, list_price = 75.00, deal_score = 59, updated_at = datetime('now') WHERE id = 'cosrx-vitamin-c-23';
UPDATE products SET price = 494.00, list_price = 494.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'diptyque-fleur-de-peau';
UPDATE products SET price = 219.00, list_price = 219.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'diptyque-tam-dao';
UPDATE products SET price = 46.00, list_price = 46.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'gisou-honey-oil';
UPDATE products SET price = 39.00, list_price = 39.00, deal_score = 14, updated_at = datetime('now') WHERE id = 'hourglass-confession-red';
UPDATE products SET price = 25.00, list_price = 25.00, deal_score = 18, updated_at = datetime('now') WHERE id = 'juvia-magic-palette';
UPDATE products SET price = 125.00, list_price = 125.00, deal_score = 26, updated_at = datetime('now') WHERE id = 'kayali-invite-only-amber';
UPDATE products SET price = 125.00, list_price = 125.00, deal_score = 10, updated_at = datetime('now') WHERE id = 'kayali-vanilla-gift';
UPDATE products SET price = 36.00, list_price = 36.00, deal_score = 36, updated_at = datetime('now') WHERE id = 'lisa-eldridge-velvet-ribbon';
UPDATE products SET price = 36.00, list_price = 36.00, deal_score = 36, updated_at = datetime('now') WHERE id = 'olehenriksen-banana';
UPDATE products SET price = 36.00, list_price = 36.00, deal_score = 36, updated_at = datetime('now') WHERE id = 'onesize-on-til-dawn';
UPDATE products SET price = 68.00, list_price = 80.00, deal_score = 53, updated_at = datetime('now') WHERE id = 'patrick-ta-oh-she-glows';
UPDATE products SET price = 59.00, list_price = 59.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'peach-lily-glass-skin';
UPDATE products SET price = 245.00, list_price = 245.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-erba-pura';
UPDATE products SET price = 293.00, list_price = 293.00, deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-naxos';
