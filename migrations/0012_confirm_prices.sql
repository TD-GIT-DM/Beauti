-- Confirm price, list_price, and discount from Sephora catalog JSON,
-- Shopify product JSON, and brand products.json.
-- price is the current sell price. list_price is a real compare-at.
-- Percent off is omitted when list_price equals price.
-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:
--   npm run catalog:resolve-prices
--   npm run catalog:generate:0012
--   npm run catalog:test-prices
--   npm run db:migrate:local
--   npm run db:migrate:remote
--
-- Verified: 426
-- Flipped (price or list changed vs 0009): 33
-- Fake discounts removed: 7
-- Understated discounts raised: 2
-- Real markdowns now: 7
-- Rows updated: 33

UPDATE products SET price = 12.75, list_price = 17.00, promo_codes = '[]', deal_score = 77, updated_at = datetime('now') WHERE id = 'beauty-of-joseon-revive';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'charlotte-pillow-talk-liner';
UPDATE products SET price = 14.00, list_price = 14.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-blue-moon';
UPDATE products SET price = 14.00, list_price = 14.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-going-coconuts';
UPDATE products SET price = 64.00, list_price = 75.00, promo_codes = '[]', deal_score = 59, updated_at = datetime('now') WHERE id = 'cosrx-vitamin-c-23';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-deep';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-fair';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-medium';
UPDATE products SET price = 15.00, list_price = 15.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-deep';
UPDATE products SET price = 15.00, list_price = 15.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-fair';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-highlighter';
UPDATE products SET price = 15.00, list_price = 15.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-medium';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-o-face-plum';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-o-face-red';
UPDATE products SET price = 11.00, list_price = 11.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-power-grip';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-putty-blush-bahamas';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-putty-blush-maldives';
UPDATE products SET price = 11.00, list_price = 11.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-stay-all-night';
UPDATE products SET price = 46.00, list_price = 46.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'gisou-honey-oil';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lisa-eldridge-velvet-ribbon';
UPDATE products SET price = 125.00, list_price = 125.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'molecule-01';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'olivejune-clear';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'olivejune-poppy-pink';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'onesize-on-til-dawn';
UPDATE products SET price = 6.50, list_price = 6.50, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-niacinamide';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'patrick-ta-oh-she-glows';
UPDATE products SET price = 285.00, list_price = 285.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'pdm-delina';
UPDATE products SET price = 290.00, list_price = 290.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'pdm-layton';
UPDATE products SET price = 32.00, list_price = 46.00, promo_codes = '[]', deal_score = 86, updated_at = datetime('now') WHERE id = 'replica-discovery-set';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'skylar-vanilla-sky';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'thrive-liquid-lash';
UPDATE products SET price = 245.00, list_price = 245.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-erba-pura';
UPDATE products SET price = 245.00, list_price = 245.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-naxos';
