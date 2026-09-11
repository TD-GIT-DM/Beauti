-- Honest retailer / brand prices. No invented promo codes or fake % off.
-- Sources: Sephora catalog JSON, Shopify product JSON, curated known list prices.
-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:
--   npm run db:migrate:local
--   npm run db:migrate:remote
--   npm run catalog:resolve-prices && npm run catalog:generate:0009
--
-- Verified prices: 421  (Sephora 367, Shopify 54, known 0)
-- Cleared fake discounts (full price / no markdown): 568
-- Real list-vs-sale markdowns: 12
-- Total SKUs: 580

-- Compare-at / list price from the linked retailer or brand page.
ALTER TABLE products ADD COLUMN list_price REAL;

UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'abh-brow-wiz';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'abh-dipbrow';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'abh-modern-renaissance';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'abh-norvina-vol1';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'abh-soft-glam';
UPDATE products SET price = 155.00, list_price = 155.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'acqua-di-parma-colonia';
UPDATE products SET price = 96.00, list_price = 96.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'allies-35-c';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'amika-soulfood';
UPDATE products SET price = 395.00, list_price = 395.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'amouage-interlude-man';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ariana-cloud';
UPDATE products SET price = 132.00, list_price = 132.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-acqua-profondo';
UPDATE products SET price = 69.00, list_price = 69.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-luminous-silk-13';
UPDATE products SET price = 69.00, list_price = 69.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-luminous-silk-2';
UPDATE products SET price = 69.00, list_price = 69.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-luminous-silk-5-5';
UPDATE products SET price = 69.00, list_price = 69.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-luminous-silk-9';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-my-way';
UPDATE products SET price = 140.00, list_price = 140.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'armani-si-edp';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'bbw-in-the-stars';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'bbw-warm-vanilla-sugar';
UPDATE products SET price = 22.10, list_price = 34.00, promo_codes = '[]', deal_score = 95, updated_at = datetime('now') WHERE id = 'beauty-of-joseon-glow-serum';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'beauty-of-joseon-relief-sun';
UPDATE products SET price = 17.00, list_price = 17.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'beauty-of-joseon-revive';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'beautyblender-original';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'benefit-bae-blue';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'benefit-dandelion';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'benefit-galifornia';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'benefit-gimme-brow';
UPDATE products SET price = 35.00, list_price = 35.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'benefit-hoola';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'benefit-porefessional';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'benefit-precisely-my-brow';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'benefit-theyre-real';
UPDATE products SET price = 78.00, list_price = 78.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'billie-eilish-eilish';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'bleu-de-chanel-edp';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'burberry-goddess';
UPDATE products SET price = 132.00, list_price = 132.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'burberry-her-edp';
UPDATE products SET price = 128.00, list_price = 128.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'burberry-hero-edp';
UPDATE products SET price = 196.00, list_price = 196.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-bal-dafrique';
UPDATE products SET price = 196.00, list_price = 196.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-blanche';
UPDATE products SET price = 196.00, list_price = 196.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-gypsy-water';
UPDATE products SET price = 196.00, list_price = 196.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-mojave-ghost';

UPDATE products SET price = 196.00, list_price = 196.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-rose-no-mans';
UPDATE products SET price = 290.00, list_price = 290.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'byredo-vanille-antique';
UPDATE products SET price = 16.00, list_price = 16.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'cerave-hydrating-cleanser';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'cerave-resurfacing-retinol';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'cerave-vitamin-c-serum';
UPDATE products SET price = 138.00, list_price = 138.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ch-good-girl';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ch-very-good-girl';
UPDATE products SET price = 115.00, list_price = 115.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-allure-homme-sport';
UPDATE products SET price = 155.00, list_price = 155.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-chance-eau-tendre';
UPDATE products SET price = 185.00, list_price = 185.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-chance-gift';
UPDATE products SET price = 162.00, list_price = 162.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-coco-mad-travel';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-coco-mademoiselle';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-gabrielle-edp';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'chanel-le-vernis-ballerina';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'chanel-le-vernis-black';
UPDATE products SET price = 146.00, list_price = 146.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-no5-edp';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-rouge-coco-mademoiselle';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chanel-rouge-coco-opera';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-airbrush-1-cool';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-airbrush-11-neutral';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-airbrush-16-cool';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-airbrush-5-warm';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-filmstar-bronze';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-hollywood-filter-2';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-hollywood-filter-6';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-pillow-talk';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-pillow-talk-blush';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-pillow-talk-liner';
UPDATE products SET price = 58.00, list_price = 58.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'charlotte-pillow-talk-palette';
UPDATE products SET price = 37.00, list_price = 37.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-red-carpet';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'charlotte-red-carpet-liner';
UPDATE products SET price = 35.00, list_price = 35.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-setting-spray';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-superstar-red';
UPDATE products SET price = 35.00, list_price = 35.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-very-victoria';
UPDATE products SET price = 37.00, list_price = 37.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'charlotte-walk-of-shame';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'chloe-nomade';
UPDATE products SET price = 45.00, list_price = 45.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'cirque-jelly';
UPDATE products SET price = 12.50, list_price = 12.50, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'cirque-midnight';
UPDATE products SET price = 98.00, list_price = 98.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'clean-reserve-skin';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'clinique-black-honey';

UPDATE products SET price = 98.00, list_price = 98.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'coach-floral-edp';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'colorwow-dream-coat';
UPDATE products SET price = 10.50, list_price = 14.00, promo_codes = '[]', deal_score = 77, updated_at = datetime('now') WHERE id = 'colourpop-blue-moon';
UPDATE products SET price = 10.50, list_price = 14.00, promo_codes = '[]', deal_score = 77, updated_at = datetime('now') WHERE id = 'colourpop-going-coconuts';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-lux-lumiere';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'colourpop-lux-midsummer';
UPDATE products SET price = 110.00, list_price = 110.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'commodity-milk';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'cosrx-snail-96';
UPDATE products SET price = 63.75, list_price = 75.00, promo_codes = '[]', deal_score = 59, updated_at = datetime('now') WHERE id = 'cosrx-vitamin-c-23';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'coty-airspun';
UPDATE products SET price = 1080.00, list_price = 1080.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'creed-aventus';
UPDATE products SET price = 110.00, list_price = 110.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'creed-silver-mountain';
UPDATE products SET price = 74.00, list_price = 74.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'de-a-passioni';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'de-b-hydra';
UPDATE products SET price = 78.00, list_price = 78.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dedcool-milk';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dg-devotion';
UPDATE products SET price = 104.00, list_price = 104.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dg-light-blue';
UPDATE products SET price = 35.00, list_price = 35.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'dior-diorshow';
UPDATE products SET price = 120.00, list_price = 120.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-fahrenheit-edt';
UPDATE products SET price = 60.00, list_price = 60.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-forever-matte-0n';
UPDATE products SET price = 60.00, list_price = 60.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-forever-matte-3w';
UPDATE products SET price = 60.00, list_price = 60.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-forever-matte-6n';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-homme-intense';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-jadore-edp';
UPDATE products SET price = 128.00, list_price = 128.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-poison-girl';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-rouge-720';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-rouge-999';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-sauvage';
UPDATE products SET price = 199.00, list_price = 199.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-sauvage-elixir';
UPDATE products SET price = 95.00, list_price = 95.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'dior-sauvage-travel';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'dior-vernis-nude';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'dior-vernis-red';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'diptyque-do-son';
UPDATE products SET price = 350.00, list_price = 350.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'diptyque-fleur-de-peau';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'diptyque-philosykos';
UPDATE products SET price = 155.00, list_price = 155.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'diptyque-tam-dao';
UPDATE products SET price = 79.00, list_price = 79.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'drunk-elephant-c-firma';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'drunk-elephant-protini';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-deep';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-fair';

UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-camo-medium';
UPDATE products SET price = 14.00, list_price = 14.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-deep';
UPDATE products SET price = 14.00, list_price = 14.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-fair';
UPDATE products SET price = 9.00, list_price = 9.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-highlighter';
UPDATE products SET price = 14.00, list_price = 14.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-halo-glow-medium';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-o-face-nude';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-o-face-plum';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-o-face-red';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-power-grip';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-putty-blush-bahamas';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-putty-blush-maldives';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'elf-stay-all-night';
UPDATE products SET price = 105.00, list_price = 105.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ellis-brooklyn-bee';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-ballet-slippers';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-blanc';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-fiji';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-lacquered-up';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-lapis-of-luxury';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-licorice';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-lilacism';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-mint-candy-apple';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-tart-deco';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'essie-wicked';
UPDATE products SET price = 82.00, list_price = 82.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'estee-advanced-night-repair';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'estee-double-wear-2n1';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'estee-double-wear-4w1';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-cheeks-out-pettl';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-cheeks-out-rose-latt';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'fenty-gloss-bomb';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'fenty-gloss-fenty-glow';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'fenty-gloss-fuenty-clear';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-instant-retouch-powder';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-killawatt-hustla-baby';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-killawatt-metal-moon';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-profiltr-120';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-profiltr-190';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-profiltr-290';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-profiltr-370';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-profiltr-445';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-skin-fat-water';

UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'fenty-slip-shine-honey';
UPDATE products SET price = 14.50, list_price = 29.00, promo_codes = '[]', deal_score = 99, updated_at = datetime('now') WHERE id = 'fenty-stunna-uncensored';
UPDATE products SET price = 14.50, list_price = 29.00, promo_codes = '[]', deal_score = 99, updated_at = datetime('now') WHERE id = 'fenty-stunna-uninvited';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-sun-stalkr-cocoa';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'fenty-sun-stalkr-indasun';
UPDATE products SET price = 16.99, list_price = 16.99, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'finery-not-another-cherry';
UPDATE products SET price = 320.00, list_price = 320.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'frederic-malle-musc-rav';
UPDATE products SET price = 390.00, list_price = 390.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'frederic-malle-portrait';
UPDATE products SET price = 239.00, list_price = 239.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ghd-glide';
UPDATE products SET price = 41.40, list_price = 46.00, promo_codes = '[]', deal_score = 50, updated_at = datetime('now') WHERE id = 'gisou-honey-oil';
UPDATE products SET price = 130.00, list_price = 130.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'givenchy-gentleman-edp';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'givenchy-linterdit';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-boy-brow';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-cloud-beam';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-cloud-dusk';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-cloud-paint';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-cloud-puff';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-cloud-storm';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-lash-slick';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-ultralip-cachet';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'glossier-ultralip-ember';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'glossier-you';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'glossier-you-travel';
UPDATE products SET price = 0.25, list_price = 0.25, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'glow-recipe-guava-c';
UPDATE products SET price = 35.00, list_price = 35.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'glow-recipe-watermelon';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'good-molecules-discoloration';
UPDATE products SET price = 138.00, list_price = 138.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'gucci-bloom-edp';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'gucci-flora-gardenia';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'haus-labs-le-monster-nude';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'haus-labs-le-monster-red';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'haus-labs-triclone-040';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'haus-labs-triclone-250';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'haus-labs-triclone-500';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'hermes-twilly';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'hourglass-confession-red';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'hourglass-veil-powder';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'hourglass-veil-primer';
UPDATE products SET price = 33.00, list_price = 33.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'huda-emerald-palette';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'huda-liquid-matte-heartbreaker';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'huda-liquid-matte-trophy-wife';

UPDATE products SET price = 43.00, list_price = 43.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'huda-rose-gold-palette';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ilia-balmy-red';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ilia-color-block-nude';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ilia-limitless-lash';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ilia-super-serum-st3';
UPDATE products SET price = 280.00, list_price = 280.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'initio-oud-greatness';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'inkey-hyaluronic';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'inkey-niacinamide';
UPDATE products SET price = 12.60, list_price = 18.00, promo_codes = '[]', deal_score = 86, updated_at = datetime('now') WHERE id = 'inkey-peptide';
UPDATE products SET price = 15.00, list_price = 15.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'inkey-retinol';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'inkey-vitamin-c';
UPDATE products SET price = 150.00, list_price = 150.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jhag-not-a-perfume';
UPDATE products SET price = 150.00, list_price = 150.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jhag-vanilla-vibes';
UPDATE products SET price = 118.00, list_price = 118.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jimmy-choo-i-want-choo';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jo-malone-cologne-gift';
UPDATE products SET price = 175.00, list_price = 175.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jo-malone-english-pear';
UPDATE products SET price = 180.00, list_price = 180.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jo-malone-myrrh-tonka';
UPDATE products SET price = 175.00, list_price = 175.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jo-malone-peony';
UPDATE products SET price = 175.00, list_price = 175.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jo-malone-wood-sage';
UPDATE products SET price = 108.00, list_price = 108.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'jpg-le-male';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'juvia-magic-palette';
UPDATE products SET price = 88.00, list_price = 88.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kayali-eden-apple';
UPDATE products SET price = 559.00, list_price = 559.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kayali-invite-only-amber';
UPDATE products SET price = 88.00, list_price = 88.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kayali-vanilla-28';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kayali-vanilla-28-travel';
UPDATE products SET price = 559.00, list_price = 559.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kayali-vanilla-gift';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kayali-yum-pistachio';
UPDATE products SET price = 50.00, list_price = 50.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kerastase-elixir';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kiehl-midnight-recovery';
UPDATE products SET price = 255.00, list_price = 255.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kilian-angels-share';
UPDATE products SET price = 255.00, list_price = 255.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'kilian-love-dont-be-shy';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'klairs-freshly-juiced-c';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-con-deep';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-con-fair';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-con-medium';
UPDATE products SET price = 45.00, list_price = 45.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-deep';
UPDATE products SET price = 45.00, list_price = 45.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-fair';
UPDATE products SET price = 45.00, list_price = 45.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kosas-revealer-medium';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kylie-matte-candy-k';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'kylie-matte-mary-jo-k';

UPDATE products SET price = 190.00, list_price = 190.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'la-mer-cream';
UPDATE products SET price = 128.00, list_price = 128.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'lancome-idole';
UPDATE products SET price = 128.00, list_price = 128.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'lancome-la-vie-est-belle';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lancome-lash-idole';
UPDATE products SET price = 27.00, list_price = 27.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'lancome-monsieur-big';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'laneige-cream-skin';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'laneige-gummy-bear';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'laneige-lip-mask';
UPDATE products SET price = 16.00, list_price = 16.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'laroche-cicaplast';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'lattafa-asad';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'lattafa-khamrah';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'lattafa-yara';
UPDATE products SET price = 43.00, list_price = 43.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'laura-mercier-translucent';
UPDATE products SET price = 215.00, list_price = 215.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-another-13';
UPDATE products SET price = 215.00, list_price = 215.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-bergamote-22';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'le-labo-discovery-set';
UPDATE products SET price = 215.00, list_price = 215.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-rose-31';
UPDATE products SET price = 215.00, list_price = 215.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-santal-33';
UPDATE products SET price = 86.00, list_price = 86.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-santal-travel';
UPDATE products SET price = 215.00, list_price = 215.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'le-labo-the-noir-29';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lisa-eldridge-velvet-ribbon';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'living-proof-dry';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'loreal-true-match-c1';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'loreal-true-match-n8';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'loreal-true-match-w3';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lrp-hyalu-b5';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lrp-pure-vitamin-c10';
UPDATE products SET price = 44.00, list_price = 44.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'lrp-retinol-b3';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-antique-velvet';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-cherry-liner';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-chili';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-cosmo';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-cyber';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-diva';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-fluidline-blacktrack';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-fluidline-blush-baby';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-lady-danger';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-lipglass-clear';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-mehr';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-mocha';

UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-morange';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-pink-pigeon';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-rebel';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-ruby-woo';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-russian-red';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-soar';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-soar-liner';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-spice-liner';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'mac-studio-fix-nc15';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'mac-studio-fix-nc20';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'mac-studio-fix-nw45';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-twig';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-velvet-teddy';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'mac-whirl';
UPDATE products SET price = 32.95, list_price = 32.95, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'maelove-glow-maker';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'make-up-for-ever-aqua-nude';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'make-up-for-ever-aqua-orange';
UPDATE products SET price = 49.00, list_price = 49.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'makeup-forever-hd-y225';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'makeup-mario-ultra-suede-berry';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'makeup-mario-ultra-suede-nude';
UPDATE products SET price = 102.00, list_price = 102.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'marc-jacobs-daisy';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-fitme-matte-110';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-fitme-matte-220';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-fitme-matte-330';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-fitme-matte-358';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-great-lash-black';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-great-lash-brown';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-instant-deep';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-instant-fair';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-instant-medium';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-sky-high';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-sky-high-burgundy';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-superstay-pioneer';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-tattoo-black';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-tattoo-navy';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-vinyl-lippy';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-vinyl-peachy';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'maybelline-vinyl-wicked';
UPDATE products SET price = 56.00, list_price = 56.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'medik8-crystal-retinal';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'merit-signature-beige';

UPDATE products SET price = 325.00, list_price = 325.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mfk-br540';
UPDATE products SET price = 95.00, list_price = 95.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mfk-br540-travel';
UPDATE products SET price = 275.00, list_price = 275.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mfk-gentle-fluidity-gold';
UPDATE products SET price = 325.00, list_price = 325.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mfk-oud-satin-mood';
UPDATE products SET price = 9.00, list_price = 9.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'milani-luminoso';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'milk-cool-cream';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'milk-hydro-grip';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'milk-jelly-werk';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'milk-kush-mascara';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'miss-dior';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'molecule-01';
UPDATE products SET price = 82.00, list_price = 82.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'montblanc-legend';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'morphe-face-brush-set';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'morphe-jaclyn-hill';
UPDATE products SET price = 132.00, list_price = 132.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mugler-alien-edp';
UPDATE products SET price = 135.00, list_price = 135.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'mugler-angel-edp';
UPDATE products SET price = 15.00, list_price = 15.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nails-inc-kale';
UPDATE products SET price = 138.00, list_price = 138.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'narciso-for-her';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-cruella';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-deep-throat';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-dolce-vita';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-dragon-girl';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-exhibit-a';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-heat-wave';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-jungle-red';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-laguna';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-orgasm';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-orgasm-x';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-radiant-cacao';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-radiant-caramel';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-radiant-custard';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-radiant-vanilla';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nars-sheer-glow-punjab';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nars-sheer-glow-syracuse';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-slow-ride';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nars-soft-matte-macaque';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nars-soft-matte-oslo';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nars-soft-matte-punjab';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'nars-train-bleu';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'natasha-denona-mini-nude';

UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'natasha-denona-mini-purple';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'naturium-vit-c-complex';
UPDATE products SET price = 86.00, list_price = 86.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nest-madagascar-vanilla';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'neutrogena-rapid-wrinkle';
UPDATE products SET price = 265.00, list_price = 265.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nishane-ani';
UPDATE products SET price = 265.00, list_price = 265.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'nishane-hacivat';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-butter-cherry';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-butter-madeleine';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-butter-tiramisu';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-epic-ink-black';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-epic-ink-brown';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-line-loud-berry';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-line-loud-nude';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-line-loud-pink';
UPDATE products SET price = 5.00, list_price = 5.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-micro-brow';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'nyx-pore-filler';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'olaplex-no3';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'olaplex-no7';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'olay-regenerist-retinol';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'olehenriksen-banana';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'olivejune-brown';
UPDATE products SET price = 18.00, list_price = 24.00, promo_codes = '[]', deal_score = 77, updated_at = datetime('now') WHERE id = 'olivejune-clear';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'olivejune-lilac';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'olivejune-mustard';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'olivejune-orange';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'olivejune-poppy';
UPDATE products SET price = 18.00, list_price = 20.00, promo_codes = '[]', deal_score = 50, updated_at = datetime('now') WHERE id = 'olivejune-poppy-pink';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'onesize-on-til-dawn';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-alpine-snow';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-big-apple-red';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-black-onyx';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-cajun-shrimp';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-gold-the-peel';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-humming-yay';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-lincoln-park';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-malaga-wine';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-mod-about-you';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'opi-silver-on-ice';
UPDATE products SET price = 10.00, list_price = 10.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-alpha-arbutin';
UPDATE products SET price = 13.00, list_price = 13.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-ascorbyl-glucoside';

UPDATE products SET price = 19.90, list_price = 19.90, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ordinary-buffet';
UPDATE products SET price = 12.10, list_price = 12.10, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-granactive-retinoid';
UPDATE products SET price = 9.90, list_price = 9.90, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-hyaluronic';
UPDATE products SET price = 12.00, list_price = 12.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-matrixyl';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-niacinamide';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-retinol';
UPDATE products SET price = 8.00, list_price = 8.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-silicone-primer';
UPDATE products SET price = 8.10, list_price = 8.10, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'ordinary-vit-c-suspension';
UPDATE products SET price = 11.00, list_price = 11.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'orly-plastic-valley';
UPDATE products SET price = 11.00, list_price = 11.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'orly-purple-crush';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ouai-leave-in';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ouai-melrose-edp';
UPDATE products SET price = 98.00, list_price = 98.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'paco-1-million';
UPDATE products SET price = 96.00, list_price = 96.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'paco-invictus';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'pat-mcgrath-elson';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'pat-mcgrath-elson-6';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'pat-mcgrath-elson-red';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'pat-mcgrath-flesh-3';
UPDATE products SET price = 128.00, list_price = 128.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'pat-mcgrath-mothership-bronze';
UPDATE products SET price = 68.00, list_price = 80.00, promo_codes = '[]', deal_score = 59, updated_at = datetime('now') WHERE id = 'patrick-ta-oh-she-glows';
UPDATE products SET price = 40.00, list_price = 40.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'patrick-ta-shes-that-girl';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'pattern-leave-in';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'paulas-choice-bha';
UPDATE products SET price = 59.00, list_price = 59.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'paulas-choice-c15';
UPDATE products SET price = 53.00, list_price = 53.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'paulas-choice-niacinamide';
UPDATE products SET price = 310.00, list_price = 310.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'pdm-delina';
UPDATE products SET price = 310.00, list_price = 310.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'pdm-layton';
UPDATE products SET price = 59.00, list_price = 59.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'peach-lily-glass-skin';
UPDATE products SET price = 52.00, list_price = 52.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'philosophy-fresh-cream';
UPDATE products SET price = 99.00, list_price = 99.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'phlur-missing-person';
UPDATE products SET price = 99.00, list_price = 99.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'phlur-vanilla-skin';
UPDATE products SET price = 16.00, list_price = 16.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'physicians-butter-bronzer';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'prada-candy';
UPDATE products SET price = 110.00, list_price = 110.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'prada-luna-rossa';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'prada-paradoxe';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-always-optimist-spray';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-bliss';
UPDATE products SET price = 21.00, list_price = 21.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-brow-harmony';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-con-150';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-con-330';

UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-con-480';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-encourage';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-grace';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-hope';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-joy';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-kind-give';
UPDATE products SET price = 18.00, list_price = 18.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-kind-lucky';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-kind-worthy';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rare-beauty-liquid-140';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rare-beauty-liquid-240';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rare-beauty-liquid-420';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-love';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-perfect-liner-black';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-perfect-liner-brown';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-perfect-strokes';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-positive-light';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-primer';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rare-beauty-soft-pinch';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rare-beauty-warm-wishes-always';
UPDATE products SET price = 30.00, list_price = 30.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rare-beauty-warm-wishes-truth';
UPDATE products SET price = 7.00, list_price = 7.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'real-techniques-sponge';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'refy-brow-sculpt';
UPDATE products SET price = 144.00, list_price = 144.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'replica-beach-walk';
UPDATE products SET price = 170.00, list_price = 170.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'replica-coffee-break';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'replica-discovery-set';
UPDATE products SET price = 144.00, list_price = 144.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'replica-fireplace';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'replica-fireplace-travel';
UPDATE products SET price = 144.00, list_price = 144.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'replica-jazz-club';
UPDATE products SET price = 144.00, list_price = 144.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'replica-lazy-sunday';
UPDATE products SET price = 9.50, list_price = 9.50, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'revlon-fire-ice';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rhode-espresso';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rhode-glazing-milk';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'rhode-peptide-serum';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'rhode-peptide-tint';
UPDATE products SET price = 250.00, list_price = 250.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'rms-lip2cheek';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'saie-dew-blush';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'saie-dew-blush-baby';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'saie-dew-blush-rosy';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'saie-glossybounce-pink';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'saie-glowy-super-gel';

UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'saie-slip-tint';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'saie-sun-melt';
UPDATE products SET price = 5.00, list_price = 5.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'sally-hard-as-nails-clear';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'sally-insta-berry';
UPDATE products SET price = 6.00, list_price = 6.00, promo_codes = '[]', deal_score = 44, updated_at = datetime('now') WHERE id = 'sally-insta-drip';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'sdj-cheirosa-40-mist';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'sdj-cheirosa-62-mist';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'sdj-cheirosa-68-mist';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'sdj-cheirosa-71-mist';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'sdj-mist-gift';
UPDATE products SET price = 170.00, list_price = 170.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'serge-lutens-chergui';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'shu-eyelash-curler';
UPDATE products SET price = 182.00, list_price = 182.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'skinceuticals-ce-ferulic';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'skylar-vanilla-sky';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'smashbox-photo-finish';
UPDATE products SET price = 42.00, list_price = 42.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'snif-crumb-couture';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'sol-de-janeiro-bum-bum';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'stila-stay-all-day';
UPDATE products SET price = 25.00, list_price = 25.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'stila-stay-emerald';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'summer-fridays-butter';
UPDATE products SET price = 68.00, list_price = 68.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'summer-fridays-cc-me';
UPDATE products SET price = 24.00, list_price = 24.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'summer-fridays-cherry';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'summer-fridays-cloud-dew';
UPDATE products SET price = 85.00, list_price = 85.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'sunday-riley-a-plus';
UPDATE products SET price = 85.00, list_price = 85.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'sunday-riley-ceo';
UPDATE products SET price = 85.00, list_price = 85.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'sunday-riley-good-genes';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'supergoop-unseen';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tarte-amazonian-aa';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tarte-shape-tape-deep';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tarte-shape-tape-light';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tarte-shape-tape-medium';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tarte-tartelette-bloom';
UPDATE products SET price = 72.00, list_price = 72.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tatcha-dewy-skin';
UPDATE products SET price = 36.00, list_price = 36.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'tatcha-rice-wash';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tatcha-silk-canvas';
UPDATE products SET price = 49.00, list_price = 49.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tatcha-the-serum';
UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'terre-dhermes-edt';
UPDATE products SET price = 90.00, list_price = 90.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tf-lost-cherry-travel';
UPDATE products SET price = 75.00, list_price = 75.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tf-oud-wood-travel';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'the-gelbottle-builder';

UPDATE products SET price = 46.80, list_price = 52.00, promo_codes = '[]', deal_score = 50, updated_at = datetime('now') WHERE id = 'thrive-liquid-lash';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'timeless-20-c';
UPDATE products SET price = 188.00, list_price = 188.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-black-orchid';
UPDATE products SET price = 270.00, list_price = 270.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-lost-cherry';
UPDATE products SET price = 250.00, list_price = 250.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-neroli-portofino';
UPDATE products SET price = 195.00, list_price = 195.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-ombre-leather';
UPDATE products SET price = 270.00, list_price = 270.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-oud-wood';
UPDATE products SET price = 250.00, list_price = 250.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-soleil-blanc';
UPDATE products SET price = 270.00, list_price = 270.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-tobacco-vanille';
UPDATE products SET price = 240.00, list_price = 240.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-tuscan-leather';
UPDATE products SET price = 270.00, list_price = 270.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'tom-ford-vanilla-sex';
UPDATE products SET price = 29.00, list_price = 29.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'too-faced-bts';
UPDATE products SET price = 49.00, list_price = 49.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'too-faced-btw-golden-beige';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'too-faced-btw-mocha';
UPDATE products SET price = 49.00, list_price = 49.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'too-faced-btw-porcelain';
UPDATE products SET price = 57.00, list_price = 57.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'too-faced-chocolate-bar';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tower28-beachplease-magic';
UPDATE products SET price = 20.00, list_price = 20.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tower28-beachplease-office';
UPDATE products SET price = 16.00, list_price = 16.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tower28-shineon-cashew';
UPDATE products SET price = 16.00, list_price = 16.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tower28-shineon-pistachio';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tower28-sos';
UPDATE products SET price = 26.00, list_price = 26.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'tweezerman-slant';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ud-247-deep-end';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ud-247-perversion';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ud-247-ransom';
UPDATE products SET price = 23.00, list_price = 23.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'ud-247-zero';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'urban-decay-all-nighter';
UPDATE products SET price = 56.00, list_price = 56.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'urban-decay-naked-honey';
UPDATE products SET price = 59.00, list_price = 59.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'urban-decay-naked3';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'urban-decay-vice-714';
UPDATE products SET price = 28.00, list_price = 28.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'urban-decay-vice-backtalk';
UPDATE products SET price = 49.00, list_price = 49.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'urban-decay-wild-west';
UPDATE products SET price = 150.00, list_price = 150.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'valentino-bir-gift';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'valentino-born-in-roma';
UPDATE products SET price = 118.00, list_price = 118.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'valentino-uomo-bir';
UPDATE products SET price = 98.00, list_price = 98.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'versace-bright-crystal';
UPDATE products SET price = 158.00, list_price = 158.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'versace-crystal-noir';
UPDATE products SET price = 92.00, list_price = 92.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'versace-dylan-blue';
UPDATE products SET price = 118.00, list_price = 118.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'versace-eros-edp';
UPDATE products SET price = 32.00, list_price = 32.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'vichy-liftactiv-c';

UPDATE products SET price = 145.00, list_price = 145.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'viktor-rolf-flowerbomb';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'vs-bare-vanilla-mist';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'vs-bombshell-mist';
UPDATE products SET price = 22.00, list_price = 22.00, promo_codes = '[]', deal_score = 40, updated_at = datetime('now') WHERE id = 'vs-love-spell-mist';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'westman-baby-cheeks-petal';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'westman-baby-cheeks-soleil';
UPDATE products SET price = 255.00, list_price = 255.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-erba-pura';
UPDATE products SET price = 305.00, list_price = 305.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'xerjoff-naxos';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-black-opium';
UPDATE products SET price = 150.00, list_price = 150.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-black-opium-gift';
UPDATE products SET price = 34.00, list_price = 34.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ysl-lash-clash';
UPDATE products SET price = 48.00, list_price = 48.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-le-rouge';
UPDATE products SET price = 148.00, list_price = 148.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-libre';
UPDATE products SET price = 38.00, list_price = 38.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ysl-libre-travel';
UPDATE products SET price = 138.00, list_price = 138.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-mon-paris';
UPDATE products SET price = 142.00, list_price = 142.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-myslf';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ysl-tatouage-coral';
UPDATE products SET price = 39.00, list_price = 39.00, promo_codes = '[]', deal_score = 36, updated_at = datetime('now') WHERE id = 'ysl-tatouage-nude';
UPDATE products SET price = 138.00, list_price = 138.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'ysl-y-edp';
UPDATE products SET price = 55.00, list_price = 55.00, promo_codes = '[]', deal_score = 32, updated_at = datetime('now') WHERE id = 'yttp-15-vitamin-c';

-- Drop invented mock / seed price-history peaks so leftover clients cannot badge a fake % off.
DELETE FROM price_history;

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('abh-brow-wiz', 26.00, datetime('now')),
  ('abh-dipbrow', 25.00, datetime('now')),
  ('abh-modern-renaissance', 48.00, datetime('now')),
  ('abh-norvina-vol1', 48.00, datetime('now')),
  ('abh-soft-glam', 48.00, datetime('now')),
  ('acqua-di-parma-colonia', 155.00, datetime('now')),
  ('allies-35-c', 96.00, datetime('now')),
  ('amika-soulfood', 32.00, datetime('now')),
  ('amouage-interlude-man', 395.00, datetime('now')),
  ('ariana-cloud', 55.00, datetime('now')),
  ('armani-acqua-profondo', 132.00, datetime('now')),
  ('armani-luminous-silk-13', 69.00, datetime('now')),
  ('armani-luminous-silk-2', 69.00, datetime('now')),
  ('armani-luminous-silk-5-5', 69.00, datetime('now')),
  ('armani-luminous-silk-9', 69.00, datetime('now')),
  ('armani-my-way', 142.00, datetime('now')),
  ('armani-si-edp', 140.00, datetime('now')),
  ('bbw-in-the-stars', 18.00, datetime('now')),
  ('bbw-warm-vanilla-sugar', 18.00, datetime('now')),
  ('beauty-of-joseon-glow-serum', 22.10, datetime('now')),
  ('beauty-of-joseon-relief-sun', 18.00, datetime('now')),
  ('beauty-of-joseon-revive', 17.00, datetime('now')),
  ('beautyblender-original', 20.00, datetime('now')),
  ('benefit-bae-blue', 26.00, datetime('now')),
  ('benefit-dandelion', 34.00, datetime('now')),
  ('benefit-galifornia', 34.00, datetime('now')),
  ('benefit-gimme-brow', 26.00, datetime('now')),
  ('benefit-hoola', 35.00, datetime('now')),
  ('benefit-porefessional', 32.00, datetime('now')),
  ('benefit-precisely-my-brow', 28.00, datetime('now')),
  ('benefit-theyre-real', 29.00, datetime('now')),
  ('billie-eilish-eilish', 78.00, datetime('now')),
  ('bleu-de-chanel-edp', 135.00, datetime('now')),
  ('burberry-goddess', 148.00, datetime('now')),
  ('burberry-her-edp', 132.00, datetime('now')),
  ('burberry-hero-edp', 128.00, datetime('now')),
  ('byredo-bal-dafrique', 196.00, datetime('now')),
  ('byredo-blanche', 196.00, datetime('now')),
  ('byredo-gypsy-water', 196.00, datetime('now')),
  ('byredo-mojave-ghost', 196.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('byredo-rose-no-mans', 196.00, datetime('now')),
  ('byredo-vanille-antique', 290.00, datetime('now')),
  ('cerave-hydrating-cleanser', 16.00, datetime('now')),
  ('cerave-resurfacing-retinol', 18.00, datetime('now')),
  ('cerave-vitamin-c-serum', 20.00, datetime('now')),
  ('ch-good-girl', 138.00, datetime('now')),
  ('ch-very-good-girl', 142.00, datetime('now')),
  ('chanel-allure-homme-sport', 115.00, datetime('now')),
  ('chanel-chance-eau-tendre', 155.00, datetime('now')),
  ('chanel-chance-gift', 185.00, datetime('now')),
  ('chanel-coco-mad-travel', 162.00, datetime('now')),
  ('chanel-coco-mademoiselle', 148.00, datetime('now')),
  ('chanel-gabrielle-edp', 148.00, datetime('now')),
  ('chanel-le-vernis-ballerina', 32.00, datetime('now')),
  ('chanel-le-vernis-black', 32.00, datetime('now')),
  ('chanel-no5-edp', 146.00, datetime('now')),
  ('chanel-rouge-coco-mademoiselle', 50.00, datetime('now')),
  ('chanel-rouge-coco-opera', 50.00, datetime('now')),
  ('charlotte-airbrush-1-cool', 52.00, datetime('now')),
  ('charlotte-airbrush-11-neutral', 52.00, datetime('now')),
  ('charlotte-airbrush-16-cool', 52.00, datetime('now')),
  ('charlotte-airbrush-5-warm', 52.00, datetime('now')),
  ('charlotte-filmstar-bronze', 68.00, datetime('now')),
  ('charlotte-hollywood-filter-2', 50.00, datetime('now')),
  ('charlotte-hollywood-filter-6', 50.00, datetime('now')),
  ('charlotte-pillow-talk', 32.00, datetime('now')),
  ('charlotte-pillow-talk-blush', 32.00, datetime('now')),
  ('charlotte-pillow-talk-liner', 32.00, datetime('now')),
  ('charlotte-pillow-talk-palette', 58.00, datetime('now')),
  ('charlotte-red-carpet', 37.00, datetime('now')),
  ('charlotte-red-carpet-liner', 28.00, datetime('now')),
  ('charlotte-setting-spray', 35.00, datetime('now')),
  ('charlotte-superstar-red', 39.00, datetime('now')),
  ('charlotte-very-victoria', 35.00, datetime('now')),
  ('charlotte-walk-of-shame', 37.00, datetime('now')),
  ('chloe-nomade', 135.00, datetime('now')),
  ('cirque-jelly', 45.00, datetime('now')),
  ('cirque-midnight', 12.50, datetime('now')),
  ('clean-reserve-skin', 98.00, datetime('now')),
  ('clinique-black-honey', 25.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('coach-floral-edp', 98.00, datetime('now')),
  ('colorwow-dream-coat', 28.00, datetime('now')),
  ('colourpop-blue-moon', 10.50, datetime('now')),
  ('colourpop-going-coconuts', 10.50, datetime('now')),
  ('colourpop-lux-lumiere', 8.00, datetime('now')),
  ('colourpop-lux-midsummer', 8.00, datetime('now')),
  ('commodity-milk', 110.00, datetime('now')),
  ('cosrx-snail-96', 25.00, datetime('now')),
  ('cosrx-vitamin-c-23', 63.75, datetime('now')),
  ('coty-airspun', 8.00, datetime('now')),
  ('creed-aventus', 1080.00, datetime('now')),
  ('creed-silver-mountain', 110.00, datetime('now')),
  ('de-a-passioni', 74.00, datetime('now')),
  ('de-b-hydra', 48.00, datetime('now')),
  ('dedcool-milk', 78.00, datetime('now')),
  ('dg-devotion', 148.00, datetime('now')),
  ('dg-light-blue', 104.00, datetime('now')),
  ('dior-diorshow', 35.00, datetime('now')),
  ('dior-fahrenheit-edt', 120.00, datetime('now')),
  ('dior-forever-matte-0n', 60.00, datetime('now')),
  ('dior-forever-matte-3w', 60.00, datetime('now')),
  ('dior-forever-matte-6n', 60.00, datetime('now')),
  ('dior-homme-intense', 145.00, datetime('now')),
  ('dior-jadore-edp', 142.00, datetime('now')),
  ('dior-poison-girl', 128.00, datetime('now')),
  ('dior-rouge-720', 50.00, datetime('now')),
  ('dior-rouge-999', 48.00, datetime('now')),
  ('dior-sauvage', 135.00, datetime('now')),
  ('dior-sauvage-elixir', 199.00, datetime('now')),
  ('dior-sauvage-travel', 95.00, datetime('now')),
  ('dior-vernis-nude', 32.00, datetime('now')),
  ('dior-vernis-red', 32.00, datetime('now')),
  ('diptyque-do-son', 38.00, datetime('now')),
  ('diptyque-fleur-de-peau', 350.00, datetime('now')),
  ('diptyque-philosykos', 48.00, datetime('now')),
  ('diptyque-tam-dao', 155.00, datetime('now')),
  ('drunk-elephant-c-firma', 79.00, datetime('now')),
  ('drunk-elephant-protini', 68.00, datetime('now')),
  ('elf-camo-deep', 7.00, datetime('now')),
  ('elf-camo-fair', 7.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('elf-camo-medium', 7.00, datetime('now')),
  ('elf-halo-glow-deep', 14.00, datetime('now')),
  ('elf-halo-glow-fair', 14.00, datetime('now')),
  ('elf-halo-glow-highlighter', 9.00, datetime('now')),
  ('elf-halo-glow-medium', 14.00, datetime('now')),
  ('elf-o-face-nude', 7.00, datetime('now')),
  ('elf-o-face-plum', 7.00, datetime('now')),
  ('elf-o-face-red', 7.00, datetime('now')),
  ('elf-power-grip', 10.00, datetime('now')),
  ('elf-putty-blush-bahamas', 7.00, datetime('now')),
  ('elf-putty-blush-maldives', 7.00, datetime('now')),
  ('elf-stay-all-night', 8.00, datetime('now')),
  ('ellis-brooklyn-bee', 105.00, datetime('now')),
  ('essie-ballet-slippers', 10.00, datetime('now')),
  ('essie-blanc', 10.00, datetime('now')),
  ('essie-fiji', 10.00, datetime('now')),
  ('essie-lacquered-up', 10.00, datetime('now')),
  ('essie-lapis-of-luxury', 10.00, datetime('now')),
  ('essie-licorice', 10.00, datetime('now')),
  ('essie-lilacism', 10.00, datetime('now')),
  ('essie-mint-candy-apple', 10.00, datetime('now')),
  ('essie-tart-deco', 10.00, datetime('now')),
  ('essie-wicked', 10.00, datetime('now')),
  ('estee-advanced-night-repair', 82.00, datetime('now')),
  ('estee-double-wear-2n1', 52.00, datetime('now')),
  ('estee-double-wear-4w1', 52.00, datetime('now')),
  ('fenty-cheeks-out-pettl', 36.00, datetime('now')),
  ('fenty-cheeks-out-rose-latt', 36.00, datetime('now')),
  ('fenty-gloss-bomb', 23.00, datetime('now')),
  ('fenty-gloss-fenty-glow', 23.00, datetime('now')),
  ('fenty-gloss-fuenty-clear', 26.00, datetime('now')),
  ('fenty-instant-retouch-powder', 39.00, datetime('now')),
  ('fenty-killawatt-hustla-baby', 40.00, datetime('now')),
  ('fenty-killawatt-metal-moon', 40.00, datetime('now')),
  ('fenty-profiltr-120', 40.00, datetime('now')),
  ('fenty-profiltr-190', 40.00, datetime('now')),
  ('fenty-profiltr-290', 40.00, datetime('now')),
  ('fenty-profiltr-370', 40.00, datetime('now')),
  ('fenty-profiltr-445', 40.00, datetime('now')),
  ('fenty-skin-fat-water', 38.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('fenty-slip-shine-honey', 26.00, datetime('now')),
  ('fenty-stunna-uncensored', 14.50, datetime('now')),
  ('fenty-stunna-uninvited', 14.50, datetime('now')),
  ('fenty-sun-stalkr-cocoa', 39.00, datetime('now')),
  ('fenty-sun-stalkr-indasun', 39.00, datetime('now')),
  ('finery-not-another-cherry', 16.99, datetime('now')),
  ('frederic-malle-musc-rav', 320.00, datetime('now')),
  ('frederic-malle-portrait', 390.00, datetime('now')),
  ('ghd-glide', 239.00, datetime('now')),
  ('gisou-honey-oil', 41.40, datetime('now')),
  ('givenchy-gentleman-edp', 130.00, datetime('now')),
  ('givenchy-linterdit', 135.00, datetime('now')),
  ('glossier-boy-brow', 22.00, datetime('now')),
  ('glossier-cloud-beam', 24.00, datetime('now')),
  ('glossier-cloud-dusk', 24.00, datetime('now')),
  ('glossier-cloud-paint', 24.00, datetime('now')),
  ('glossier-cloud-puff', 24.00, datetime('now')),
  ('glossier-cloud-storm', 26.00, datetime('now')),
  ('glossier-lash-slick', 20.00, datetime('now')),
  ('glossier-ultralip-cachet', 22.00, datetime('now')),
  ('glossier-ultralip-ember', 22.00, datetime('now')),
  ('glossier-you', 68.00, datetime('now')),
  ('glossier-you-travel', 32.00, datetime('now')),
  ('glow-recipe-guava-c', 0.25, datetime('now')),
  ('glow-recipe-watermelon', 35.00, datetime('now')),
  ('good-molecules-discoloration', 12.00, datetime('now')),
  ('gucci-bloom-edp', 138.00, datetime('now')),
  ('gucci-flora-gardenia', 135.00, datetime('now')),
  ('haus-labs-le-monster-nude', 24.00, datetime('now')),
  ('haus-labs-le-monster-red', 24.00, datetime('now')),
  ('haus-labs-triclone-040', 52.00, datetime('now')),
  ('haus-labs-triclone-250', 52.00, datetime('now')),
  ('haus-labs-triclone-500', 52.00, datetime('now')),
  ('hermes-twilly', 145.00, datetime('now')),
  ('hourglass-confession-red', 39.00, datetime('now')),
  ('hourglass-veil-powder', 52.00, datetime('now')),
  ('hourglass-veil-primer', 50.00, datetime('now')),
  ('huda-emerald-palette', 33.00, datetime('now')),
  ('huda-liquid-matte-heartbreaker', 25.00, datetime('now')),
  ('huda-liquid-matte-trophy-wife', 25.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('huda-rose-gold-palette', 43.00, datetime('now')),
  ('ilia-balmy-red', 29.00, datetime('now')),
  ('ilia-color-block-nude', 29.00, datetime('now')),
  ('ilia-limitless-lash', 29.00, datetime('now')),
  ('ilia-super-serum-st3', 48.00, datetime('now')),
  ('initio-oud-greatness', 280.00, datetime('now')),
  ('inkey-hyaluronic', 13.00, datetime('now')),
  ('inkey-niacinamide', 13.00, datetime('now')),
  ('inkey-peptide', 12.60, datetime('now')),
  ('inkey-retinol', 15.00, datetime('now')),
  ('inkey-vitamin-c', 20.00, datetime('now')),
  ('jhag-not-a-perfume', 150.00, datetime('now')),
  ('jhag-vanilla-vibes', 150.00, datetime('now')),
  ('jimmy-choo-i-want-choo', 118.00, datetime('now')),
  ('jo-malone-cologne-gift', 145.00, datetime('now')),
  ('jo-malone-english-pear', 175.00, datetime('now')),
  ('jo-malone-myrrh-tonka', 180.00, datetime('now')),
  ('jo-malone-peony', 175.00, datetime('now')),
  ('jo-malone-wood-sage', 175.00, datetime('now')),
  ('jpg-le-male', 108.00, datetime('now')),
  ('juvia-magic-palette', 25.00, datetime('now')),
  ('kayali-eden-apple', 88.00, datetime('now')),
  ('kayali-invite-only-amber', 559.00, datetime('now')),
  ('kayali-vanilla-28', 88.00, datetime('now')),
  ('kayali-vanilla-28-travel', 32.00, datetime('now')),
  ('kayali-vanilla-gift', 559.00, datetime('now')),
  ('kayali-yum-pistachio', 48.00, datetime('now')),
  ('kerastase-elixir', 50.00, datetime('now')),
  ('kiehl-midnight-recovery', 52.00, datetime('now')),
  ('kilian-angels-share', 255.00, datetime('now')),
  ('kilian-love-dont-be-shy', 255.00, datetime('now')),
  ('klairs-freshly-juiced-c', 23.00, datetime('now')),
  ('kosas-revealer-con-deep', 32.00, datetime('now')),
  ('kosas-revealer-con-fair', 32.00, datetime('now')),
  ('kosas-revealer-con-medium', 32.00, datetime('now')),
  ('kosas-revealer-deep', 45.00, datetime('now')),
  ('kosas-revealer-fair', 45.00, datetime('now')),
  ('kosas-revealer-medium', 45.00, datetime('now')),
  ('kylie-matte-candy-k', 36.00, datetime('now')),
  ('kylie-matte-mary-jo-k', 36.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('la-mer-cream', 190.00, datetime('now')),
  ('lancome-idole', 128.00, datetime('now')),
  ('lancome-la-vie-est-belle', 128.00, datetime('now')),
  ('lancome-lash-idole', 30.00, datetime('now')),
  ('lancome-monsieur-big', 27.00, datetime('now')),
  ('laneige-cream-skin', 34.00, datetime('now')),
  ('laneige-gummy-bear', 24.00, datetime('now')),
  ('laneige-lip-mask', 24.00, datetime('now')),
  ('laroche-cicaplast', 16.00, datetime('now')),
  ('lattafa-asad', 26.00, datetime('now')),
  ('lattafa-khamrah', 28.00, datetime('now')),
  ('lattafa-yara', 24.00, datetime('now')),
  ('laura-mercier-translucent', 43.00, datetime('now')),
  ('le-labo-another-13', 215.00, datetime('now')),
  ('le-labo-bergamote-22', 215.00, datetime('now')),
  ('le-labo-discovery-set', 38.00, datetime('now')),
  ('le-labo-rose-31', 215.00, datetime('now')),
  ('le-labo-santal-33', 215.00, datetime('now')),
  ('le-labo-santal-travel', 86.00, datetime('now')),
  ('le-labo-the-noir-29', 215.00, datetime('now')),
  ('lisa-eldridge-velvet-ribbon', 36.00, datetime('now')),
  ('living-proof-dry', 29.00, datetime('now')),
  ('loreal-true-match-c1', 13.00, datetime('now')),
  ('loreal-true-match-n8', 13.00, datetime('now')),
  ('loreal-true-match-w3', 13.00, datetime('now')),
  ('lrp-hyalu-b5', 40.00, datetime('now')),
  ('lrp-pure-vitamin-c10', 42.00, datetime('now')),
  ('lrp-retinol-b3', 44.00, datetime('now')),
  ('mac-antique-velvet', 25.00, datetime('now')),
  ('mac-cherry-liner', 25.00, datetime('now')),
  ('mac-chili', 25.00, datetime('now')),
  ('mac-cosmo', 25.00, datetime('now')),
  ('mac-cyber', 25.00, datetime('now')),
  ('mac-diva', 25.00, datetime('now')),
  ('mac-fluidline-blacktrack', 23.00, datetime('now')),
  ('mac-fluidline-blush-baby', 23.00, datetime('now')),
  ('mac-lady-danger', 25.00, datetime('now')),
  ('mac-lipglass-clear', 25.00, datetime('now')),
  ('mac-mehr', 25.00, datetime('now')),
  ('mac-mocha', 25.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('mac-morange', 25.00, datetime('now')),
  ('mac-pink-pigeon', 25.00, datetime('now')),
  ('mac-rebel', 25.00, datetime('now')),
  ('mac-ruby-woo', 25.00, datetime('now')),
  ('mac-russian-red', 25.00, datetime('now')),
  ('mac-soar', 25.00, datetime('now')),
  ('mac-soar-liner', 25.00, datetime('now')),
  ('mac-spice-liner', 25.00, datetime('now')),
  ('mac-studio-fix-nc15', 39.00, datetime('now')),
  ('mac-studio-fix-nc20', 39.00, datetime('now')),
  ('mac-studio-fix-nw45', 39.00, datetime('now')),
  ('mac-twig', 25.00, datetime('now')),
  ('mac-velvet-teddy', 25.00, datetime('now')),
  ('mac-whirl', 25.00, datetime('now')),
  ('maelove-glow-maker', 32.95, datetime('now')),
  ('make-up-for-ever-aqua-nude', 26.00, datetime('now')),
  ('make-up-for-ever-aqua-orange', 26.00, datetime('now')),
  ('makeup-forever-hd-y225', 49.00, datetime('now')),
  ('makeup-mario-ultra-suede-berry', 28.00, datetime('now')),
  ('makeup-mario-ultra-suede-nude', 28.00, datetime('now')),
  ('marc-jacobs-daisy', 102.00, datetime('now')),
  ('maybelline-fitme-matte-110', 10.00, datetime('now')),
  ('maybelline-fitme-matte-220', 10.00, datetime('now')),
  ('maybelline-fitme-matte-330', 10.00, datetime('now')),
  ('maybelline-fitme-matte-358', 10.00, datetime('now')),
  ('maybelline-great-lash-black', 8.00, datetime('now')),
  ('maybelline-great-lash-brown', 8.00, datetime('now')),
  ('maybelline-instant-deep', 10.00, datetime('now')),
  ('maybelline-instant-fair', 10.00, datetime('now')),
  ('maybelline-instant-medium', 10.00, datetime('now')),
  ('maybelline-sky-high', 12.00, datetime('now')),
  ('maybelline-sky-high-burgundy', 12.00, datetime('now')),
  ('maybelline-superstay-pioneer', 10.00, datetime('now')),
  ('maybelline-tattoo-black', 10.00, datetime('now')),
  ('maybelline-tattoo-navy', 10.00, datetime('now')),
  ('maybelline-vinyl-lippy', 12.00, datetime('now')),
  ('maybelline-vinyl-peachy', 12.00, datetime('now')),
  ('maybelline-vinyl-wicked', 12.00, datetime('now')),
  ('medik8-crystal-retinal', 56.00, datetime('now')),
  ('merit-signature-beige', 28.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('mfk-br540', 325.00, datetime('now')),
  ('mfk-br540-travel', 95.00, datetime('now')),
  ('mfk-gentle-fluidity-gold', 275.00, datetime('now')),
  ('mfk-oud-satin-mood', 325.00, datetime('now')),
  ('milani-luminoso', 9.00, datetime('now')),
  ('milk-cool-cream', 26.00, datetime('now')),
  ('milk-hydro-grip', 38.00, datetime('now')),
  ('milk-jelly-werk', 26.00, datetime('now')),
  ('milk-kush-mascara', 29.00, datetime('now')),
  ('miss-dior', 142.00, datetime('now')),
  ('molecule-01', 145.00, datetime('now')),
  ('montblanc-legend', 82.00, datetime('now')),
  ('morphe-face-brush-set', 68.00, datetime('now')),
  ('morphe-jaclyn-hill', 48.00, datetime('now')),
  ('mugler-alien-edp', 132.00, datetime('now')),
  ('mugler-angel-edp', 135.00, datetime('now')),
  ('nails-inc-kale', 15.00, datetime('now')),
  ('narciso-for-her', 138.00, datetime('now')),
  ('nars-cruella', 42.00, datetime('now')),
  ('nars-deep-throat', 36.00, datetime('now')),
  ('nars-dolce-vita', 36.00, datetime('now')),
  ('nars-dragon-girl', 42.00, datetime('now')),
  ('nars-exhibit-a', 36.00, datetime('now')),
  ('nars-heat-wave', 42.00, datetime('now')),
  ('nars-jungle-red', 42.00, datetime('now')),
  ('nars-laguna', 38.00, datetime('now')),
  ('nars-orgasm', 36.00, datetime('now')),
  ('nars-orgasm-x', 36.00, datetime('now')),
  ('nars-radiant-cacao', 36.00, datetime('now')),
  ('nars-radiant-caramel', 36.00, datetime('now')),
  ('nars-radiant-custard', 36.00, datetime('now')),
  ('nars-radiant-vanilla', 36.00, datetime('now')),
  ('nars-sheer-glow-punjab', 55.00, datetime('now')),
  ('nars-sheer-glow-syracuse', 55.00, datetime('now')),
  ('nars-slow-ride', 36.00, datetime('now')),
  ('nars-soft-matte-macaque', 55.00, datetime('now')),
  ('nars-soft-matte-oslo', 55.00, datetime('now')),
  ('nars-soft-matte-punjab', 55.00, datetime('now')),
  ('nars-train-bleu', 42.00, datetime('now')),
  ('natasha-denona-mini-nude', 29.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('natasha-denona-mini-purple', 29.00, datetime('now')),
  ('naturium-vit-c-complex', 12.00, datetime('now')),
  ('nest-madagascar-vanilla', 86.00, datetime('now')),
  ('neutrogena-rapid-wrinkle', 22.00, datetime('now')),
  ('nishane-ani', 265.00, datetime('now')),
  ('nishane-hacivat', 265.00, datetime('now')),
  ('nyx-butter-cherry', 6.00, datetime('now')),
  ('nyx-butter-madeleine', 6.00, datetime('now')),
  ('nyx-butter-tiramisu', 6.00, datetime('now')),
  ('nyx-epic-ink-black', 10.00, datetime('now')),
  ('nyx-epic-ink-brown', 10.00, datetime('now')),
  ('nyx-line-loud-berry', 8.00, datetime('now')),
  ('nyx-line-loud-nude', 8.00, datetime('now')),
  ('nyx-line-loud-pink', 8.00, datetime('now')),
  ('nyx-micro-brow', 5.00, datetime('now')),
  ('nyx-pore-filler', 12.00, datetime('now')),
  ('olaplex-no3', 34.00, datetime('now')),
  ('olaplex-no7', 32.00, datetime('now')),
  ('olay-regenerist-retinol', 32.00, datetime('now')),
  ('olehenriksen-banana', 36.00, datetime('now')),
  ('olivejune-brown', 10.00, datetime('now')),
  ('olivejune-clear', 18.00, datetime('now')),
  ('olivejune-lilac', 10.00, datetime('now')),
  ('olivejune-mustard', 10.00, datetime('now')),
  ('olivejune-orange', 10.00, datetime('now')),
  ('olivejune-poppy', 10.00, datetime('now')),
  ('olivejune-poppy-pink', 18.00, datetime('now')),
  ('onesize-on-til-dawn', 34.00, datetime('now')),
  ('opi-alpine-snow', 12.00, datetime('now')),
  ('opi-big-apple-red', 12.00, datetime('now')),
  ('opi-black-onyx', 12.00, datetime('now')),
  ('opi-cajun-shrimp', 12.00, datetime('now')),
  ('opi-gold-the-peel', 12.00, datetime('now')),
  ('opi-humming-yay', 12.00, datetime('now')),
  ('opi-lincoln-park', 12.00, datetime('now')),
  ('opi-malaga-wine', 12.00, datetime('now')),
  ('opi-mod-about-you', 12.00, datetime('now')),
  ('opi-silver-on-ice', 12.00, datetime('now')),
  ('ordinary-alpha-arbutin', 10.00, datetime('now')),
  ('ordinary-ascorbyl-glucoside', 13.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('ordinary-buffet', 19.90, datetime('now')),
  ('ordinary-granactive-retinoid', 12.10, datetime('now')),
  ('ordinary-hyaluronic', 9.90, datetime('now')),
  ('ordinary-matrixyl', 12.00, datetime('now')),
  ('ordinary-niacinamide', 6.00, datetime('now')),
  ('ordinary-retinol', 8.00, datetime('now')),
  ('ordinary-silicone-primer', 8.00, datetime('now')),
  ('ordinary-vit-c-suspension', 8.10, datetime('now')),
  ('orly-plastic-valley', 11.00, datetime('now')),
  ('orly-purple-crush', 11.00, datetime('now')),
  ('ouai-leave-in', 28.00, datetime('now')),
  ('ouai-melrose-edp', 68.00, datetime('now')),
  ('paco-1-million', 98.00, datetime('now')),
  ('paco-invictus', 96.00, datetime('now')),
  ('pat-mcgrath-elson', 39.00, datetime('now')),
  ('pat-mcgrath-elson-6', 39.00, datetime('now')),
  ('pat-mcgrath-elson-red', 39.00, datetime('now')),
  ('pat-mcgrath-flesh-3', 39.00, datetime('now')),
  ('pat-mcgrath-mothership-bronze', 128.00, datetime('now')),
  ('patrick-ta-oh-she-glows', 68.00, datetime('now')),
  ('patrick-ta-shes-that-girl', 40.00, datetime('now')),
  ('pattern-leave-in', 25.00, datetime('now')),
  ('paulas-choice-bha', 34.00, datetime('now')),
  ('paulas-choice-c15', 59.00, datetime('now')),
  ('paulas-choice-niacinamide', 53.00, datetime('now')),
  ('pdm-delina', 310.00, datetime('now')),
  ('pdm-layton', 310.00, datetime('now')),
  ('peach-lily-glass-skin', 59.00, datetime('now')),
  ('philosophy-fresh-cream', 52.00, datetime('now')),
  ('phlur-missing-person', 99.00, datetime('now')),
  ('phlur-vanilla-skin', 99.00, datetime('now')),
  ('physicians-butter-bronzer', 16.00, datetime('now')),
  ('prada-candy', 145.00, datetime('now')),
  ('prada-luna-rossa', 110.00, datetime('now')),
  ('prada-paradoxe', 142.00, datetime('now')),
  ('rare-beauty-always-optimist-spray', 23.00, datetime('now')),
  ('rare-beauty-bliss', 25.00, datetime('now')),
  ('rare-beauty-brow-harmony', 21.00, datetime('now')),
  ('rare-beauty-con-150', 24.00, datetime('now')),
  ('rare-beauty-con-330', 24.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('rare-beauty-con-480', 24.00, datetime('now')),
  ('rare-beauty-encourage', 25.00, datetime('now')),
  ('rare-beauty-grace', 25.00, datetime('now')),
  ('rare-beauty-hope', 25.00, datetime('now')),
  ('rare-beauty-joy', 25.00, datetime('now')),
  ('rare-beauty-kind-give', 20.00, datetime('now')),
  ('rare-beauty-kind-lucky', 18.00, datetime('now')),
  ('rare-beauty-kind-worthy', 20.00, datetime('now')),
  ('rare-beauty-liquid-140', 30.00, datetime('now')),
  ('rare-beauty-liquid-240', 30.00, datetime('now')),
  ('rare-beauty-liquid-420', 30.00, datetime('now')),
  ('rare-beauty-love', 25.00, datetime('now')),
  ('rare-beauty-perfect-liner-black', 22.00, datetime('now')),
  ('rare-beauty-perfect-liner-brown', 22.00, datetime('now')),
  ('rare-beauty-perfect-strokes', 20.00, datetime('now')),
  ('rare-beauty-positive-light', 28.00, datetime('now')),
  ('rare-beauty-primer', 26.00, datetime('now')),
  ('rare-beauty-soft-pinch', 25.00, datetime('now')),
  ('rare-beauty-warm-wishes-always', 30.00, datetime('now')),
  ('rare-beauty-warm-wishes-truth', 30.00, datetime('now')),
  ('real-techniques-sponge', 7.00, datetime('now')),
  ('refy-brow-sculpt', 26.00, datetime('now')),
  ('replica-beach-walk', 144.00, datetime('now')),
  ('replica-coffee-break', 170.00, datetime('now')),
  ('replica-discovery-set', 32.00, datetime('now')),
  ('replica-fireplace', 144.00, datetime('now')),
  ('replica-fireplace-travel', 32.00, datetime('now')),
  ('replica-jazz-club', 144.00, datetime('now')),
  ('replica-lazy-sunday', 144.00, datetime('now')),
  ('revlon-fire-ice', 9.50, datetime('now')),
  ('rhode-espresso', 20.00, datetime('now')),
  ('rhode-glazing-milk', 32.00, datetime('now')),
  ('rhode-peptide-serum', 32.00, datetime('now')),
  ('rhode-peptide-tint', 20.00, datetime('now')),
  ('rms-lip2cheek', 250.00, datetime('now')),
  ('saie-dew-blush', 25.00, datetime('now')),
  ('saie-dew-blush-baby', 25.00, datetime('now')),
  ('saie-dew-blush-rosy', 25.00, datetime('now')),
  ('saie-glossybounce-pink', 22.00, datetime('now')),
  ('saie-glowy-super-gel', 28.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('saie-slip-tint', 38.00, datetime('now')),
  ('saie-sun-melt', 34.00, datetime('now')),
  ('sally-hard-as-nails-clear', 5.00, datetime('now')),
  ('sally-insta-berry', 6.00, datetime('now')),
  ('sally-insta-drip', 6.00, datetime('now')),
  ('sdj-cheirosa-40-mist', 39.00, datetime('now')),
  ('sdj-cheirosa-62-mist', 39.00, datetime('now')),
  ('sdj-cheirosa-68-mist', 26.00, datetime('now')),
  ('sdj-cheirosa-71-mist', 26.00, datetime('now')),
  ('sdj-mist-gift', 34.00, datetime('now')),
  ('serge-lutens-chergui', 170.00, datetime('now')),
  ('shu-eyelash-curler', 22.00, datetime('now')),
  ('skinceuticals-ce-ferulic', 182.00, datetime('now')),
  ('skylar-vanilla-sky', 38.00, datetime('now')),
  ('smashbox-photo-finish', 39.00, datetime('now')),
  ('snif-crumb-couture', 42.00, datetime('now')),
  ('sol-de-janeiro-bum-bum', 48.00, datetime('now')),
  ('stila-stay-all-day', 25.00, datetime('now')),
  ('stila-stay-emerald', 25.00, datetime('now')),
  ('summer-fridays-butter', 24.00, datetime('now')),
  ('summer-fridays-cc-me', 68.00, datetime('now')),
  ('summer-fridays-cherry', 24.00, datetime('now')),
  ('summer-fridays-cloud-dew', 38.00, datetime('now')),
  ('sunday-riley-a-plus', 85.00, datetime('now')),
  ('sunday-riley-ceo', 85.00, datetime('now')),
  ('sunday-riley-good-genes', 85.00, datetime('now')),
  ('supergoop-unseen', 32.00, datetime('now')),
  ('tarte-amazonian-aa', 29.00, datetime('now')),
  ('tarte-shape-tape-deep', 32.00, datetime('now')),
  ('tarte-shape-tape-light', 32.00, datetime('now')),
  ('tarte-shape-tape-medium', 32.00, datetime('now')),
  ('tarte-tartelette-bloom', 39.00, datetime('now')),
  ('tatcha-dewy-skin', 72.00, datetime('now')),
  ('tatcha-rice-wash', 36.00, datetime('now')),
  ('tatcha-silk-canvas', 55.00, datetime('now')),
  ('tatcha-the-serum', 49.00, datetime('now')),
  ('terre-dhermes-edt', 145.00, datetime('now')),
  ('tf-lost-cherry-travel', 90.00, datetime('now')),
  ('tf-oud-wood-travel', 75.00, datetime('now')),
  ('the-gelbottle-builder', 22.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('thrive-liquid-lash', 46.80, datetime('now')),
  ('timeless-20-c', 26.00, datetime('now')),
  ('tom-ford-black-orchid', 188.00, datetime('now')),
  ('tom-ford-lost-cherry', 270.00, datetime('now')),
  ('tom-ford-neroli-portofino', 250.00, datetime('now')),
  ('tom-ford-ombre-leather', 195.00, datetime('now')),
  ('tom-ford-oud-wood', 270.00, datetime('now')),
  ('tom-ford-soleil-blanc', 250.00, datetime('now')),
  ('tom-ford-tobacco-vanille', 270.00, datetime('now')),
  ('tom-ford-tuscan-leather', 240.00, datetime('now')),
  ('tom-ford-vanilla-sex', 270.00, datetime('now')),
  ('too-faced-bts', 29.00, datetime('now')),
  ('too-faced-btw-golden-beige', 49.00, datetime('now')),
  ('too-faced-btw-mocha', 48.00, datetime('now')),
  ('too-faced-btw-porcelain', 49.00, datetime('now')),
  ('too-faced-chocolate-bar', 57.00, datetime('now')),
  ('tower28-beachplease-magic', 20.00, datetime('now')),
  ('tower28-beachplease-office', 20.00, datetime('now')),
  ('tower28-shineon-cashew', 16.00, datetime('now')),
  ('tower28-shineon-pistachio', 16.00, datetime('now')),
  ('tower28-sos', 28.00, datetime('now')),
  ('tweezerman-slant', 26.00, datetime('now')),
  ('ud-247-deep-end', 23.00, datetime('now')),
  ('ud-247-perversion', 23.00, datetime('now')),
  ('ud-247-ransom', 23.00, datetime('now')),
  ('ud-247-zero', 23.00, datetime('now')),
  ('urban-decay-all-nighter', 34.00, datetime('now')),
  ('urban-decay-naked-honey', 56.00, datetime('now')),
  ('urban-decay-naked3', 59.00, datetime('now')),
  ('urban-decay-vice-714', 28.00, datetime('now')),
  ('urban-decay-vice-backtalk', 28.00, datetime('now')),
  ('urban-decay-wild-west', 49.00, datetime('now')),
  ('valentino-bir-gift', 150.00, datetime('now')),
  ('valentino-born-in-roma', 142.00, datetime('now')),
  ('valentino-uomo-bir', 118.00, datetime('now')),
  ('versace-bright-crystal', 98.00, datetime('now')),
  ('versace-crystal-noir', 158.00, datetime('now')),
  ('versace-dylan-blue', 92.00, datetime('now')),
  ('versace-eros-edp', 118.00, datetime('now')),
  ('vichy-liftactiv-c', 32.00, datetime('now'));

INSERT INTO price_history (product_id, price, recorded_at) VALUES
  ('viktor-rolf-flowerbomb', 145.00, datetime('now')),
  ('vs-bare-vanilla-mist', 22.00, datetime('now')),
  ('vs-bombshell-mist', 22.00, datetime('now')),
  ('vs-love-spell-mist', 22.00, datetime('now')),
  ('westman-baby-cheeks-petal', 48.00, datetime('now')),
  ('westman-baby-cheeks-soleil', 48.00, datetime('now')),
  ('xerjoff-erba-pura', 255.00, datetime('now')),
  ('xerjoff-naxos', 305.00, datetime('now')),
  ('ysl-black-opium', 148.00, datetime('now')),
  ('ysl-black-opium-gift', 150.00, datetime('now')),
  ('ysl-lash-clash', 34.00, datetime('now')),
  ('ysl-le-rouge', 48.00, datetime('now')),
  ('ysl-libre', 148.00, datetime('now')),
  ('ysl-libre-travel', 38.00, datetime('now')),
  ('ysl-mon-paris', 138.00, datetime('now')),
  ('ysl-myslf', 142.00, datetime('now')),
  ('ysl-tatouage-coral', 39.00, datetime('now')),
  ('ysl-tatouage-nude', 39.00, datetime('now')),
  ('ysl-y-edp', 138.00, datetime('now')),
  ('yttp-15-vitamin-c', 55.00, datetime('now'));
