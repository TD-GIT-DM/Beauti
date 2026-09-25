-- Pre-order rows verified on 2026-09-25 from Shopify product JSON and the brand page.
-- Coming soon: Fenty Hair, Makeup by Mario, Olive & June, Patrick Ta.
-- No upcoming sale had a retailer-stated future start and discount that day.
-- Do not db.exec this from ensureCatalog. Apply with wrangler migrations.

CREATE TABLE IF NOT EXISTS preorders (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('upcoming_deal', 'coming_soon')),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  product_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  price REAL,
  list_price REAL,
  announced_percent INTEGER,
  discount_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (discount_confirmed IN (0, 1)),
  currency TEXT NOT NULL DEFAULT 'USD',
  starts_at TEXT,
  ends_at TEXT,
  date_precision TEXT NOT NULL CHECK (date_precision IN ('datetime', 'date', 'month', 'unconfirmed')),
  date_label TEXT,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'live', 'removed')),
  linked_product_id TEXT,
  last_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preorders_status ON preorders(status, last_verified_at);

CREATE TABLE IF NOT EXISTS preorder_wishlist (
  device_id TEXT NOT NULL,
  preorder_id TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (device_id, preorder_id)
);

INSERT OR IGNORE INTO preorders (
  id, kind, name, brand, description, image_url, product_url, source_url,
  price, list_price, announced_percent, discount_confirmed, currency,
  starts_at, ends_at, date_precision, date_label, status, linked_product_id,
  last_verified_at, created_at, updated_at
) VALUES
(
  'shopify:fentybeauty.com:the-bounce-besties-mini-leave-in-conditioner-spray-full-size-curl-defining-cream',
  'coming_soon',
  'The Bounce Besties Mini Leave-In Conditioner Spray + Full Size Curl-Defining Cream',
  'Fenty Hair',
  'Put your best curls on display. The Homecurl Curl-Defining Cream, an award-winning silicone-free gel-cream, shapes, defines + enhances curls all at once. While The Water Boi Reparative Leave-In Conditioner Spray, made with multi-molecular weight Hyaluronic Acid, serves up lightweight, all-day hydration.',
  'https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FH_HOL26_T2PRODUCT_ECOMM_THE_BOUNCE_BESTIES_1200x1500_72DPI.jpg',
  'https://fentybeauty.com/products/the-bounce-besties-mini-leave-in-conditioner-spray-full-size-curl-defining-cream',
  'https://fentybeauty.com/products/the-bounce-besties-mini-leave-in-conditioner-spray-full-size-curl-defining-cream',
  37, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:makeupbymario.com:marios-face-eye-brush-trio',
  'coming_soon',
  'Mario''s Face & Eye Brush Trio',
  'Makeup by Mario',
  'Limited-edition set of three dual-ended face & eye brushes with matte black handles & custom nylon case. Perfect for travel & creating a full look effortlessly.',
  'https://cdn.shopify.com/s/files/1/0275/4822/1505/files/MBM_H26_PACKSHOT_BBRUSH_SET_BAG_NOBOX_03_MBM.jpg',
  'https://www.makeupbymario.com/products/marios-face-eye-brush-trio',
  'https://www.makeupbymario.com/products/marios-face-eye-brush-trio',
  79, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:makeupbymario.com:cream-eyeshadow-duo',
  'coming_soon',
  'Cream Eyeshadow Duo',
  'Makeup by Mario',
  'Limited-edition gift set featuring Mario''s Master Mattes & Soft Shimmer long-wear cream eyeshadows. Swipe to sculpt & add reflective dimension.',
  'https://cdn.shopify.com/s/files/1/0275/4822/1505/files/MBM_H26_PACKSHOT_BOX_CREAM_SHADOW_DUO_08_ESPRESSO_BRONZEBADDIE_MBM.jpg',
  'https://www.makeupbymario.com/products/cream-eyeshadow-duo',
  'https://www.makeupbymario.com/products/cream-eyeshadow-duo',
  35, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:makeupbymario.com:mini-blush-veil-skin-enhancer-duo',
  'coming_soon',
  'Mini Blush Veil & Skin Enhancer Duo',
  'Makeup by Mario',
  'Mini compact featuring Mario''s dewy blush & bronzer balms in artist-approved pairs. Softly sculpt with natural warmth & a pop of color.',
  'https://cdn.shopify.com/s/files/1/0275/4822/1505/files/MBM_H26_PACKSHOT_BOX_ENHANCER_BLUSHVEIL_DUO_04_SIMPLIFED__PERFECTPINK_LIGHTMEDIUM_MBM.jpg',
  'https://www.makeupbymario.com/products/mini-blush-veil-skin-enhancer-duo',
  'https://www.makeupbymario.com/products/mini-blush-veil-skin-enhancer-duo',
  32, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:makeupbymario.com:mini-lip-liner-trio',
  'coming_soon',
  'Mini Lip Liner Trio',
  'Makeup by Mario',
  'Mini lip liner trio in best-selling shades of Mario''s Ultra Suede Sculpting Lip Pencil to define, sculpt & shape the lips.',
  'https://cdn.shopify.com/s/files/1/0275/4822/1505/files/MBM_H26_PACKSHOT_BOX_LIP_SET_04_SIMPLIFIED_MBM2.jpg',
  'https://www.makeupbymario.com/products/mini-lip-liner-trio',
  'https://www.makeupbymario.com/products/mini-lip-liner-trio',
  30, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:oliveandjune.com:12-days-of-mani-magic-holiday-calendar',
  'coming_soon',
  '12 Days of Mani Magic - Holiday Calendar',
  'Olive & June',
  'Olive & June''s merriest holiday calendar now has an all-new look and format. With 11 exclusive and sold out polish shades, plus a duo of top coats, this handpicked collection is a must for every polish collector and mani obsessed.',
  'https://cdn.shopify.com/s/files/1/2665/7478/files/Xmas-Cal-PDP-1_2ac46f73-06f7-45d3-b6d1-aef3dfd95ea1.png',
  'https://oliveandjune.com/products/12-days-of-mani-magic-holiday-calendar',
  'https://oliveandjune.com/products/12-days-of-mani-magic-holiday-calendar',
  60, 128, NULL, 0, 'USD',
  NULL, NULL, 'month', 'Ships in October', 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:oliveandjune.com:pressies-12-days-of-mani-magic-holiday-calendar',
  'coming_soon',
  'Pressies 12 Days of Mani Magic - Holiday Calendar',
  'Olive & June',
  'For the first time ever: a holiday calendar for your minis. Olive & June''s most requested gift is now made for the littles on your gift list, packed with 12 exclusive gifts including Pressies press-ons.',
  'https://cdn.shopify.com/s/files/1/2665/7478/files/Pressies-Cal-PDP-1.png',
  'https://oliveandjune.com/products/pressies-12-days-of-mani-magic-holiday-calendar',
  'https://oliveandjune.com/products/pressies-12-days-of-mani-magic-holiday-calendar',
  50, 72, NULL, 0, 'USD',
  NULL, NULL, 'month', 'Ships in October', 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:oliveandjune.com:8-nights-of-mani-magic-hanukkah-set',
  'coming_soon',
  '8 Nights of Mani Magic - Hanukkah Set',
  'Olive & June',
  'The 8 Nights of Mani Magic, exclusive 2026 edition. A set packed with gifts, including full size special edition shades and exclusive minis.',
  'https://cdn.shopify.com/s/files/1/2665/7478/files/HK-Cal-PDP-1_34a0c4fe-f07a-405b-9bff-3c8da65a074c.png',
  'https://oliveandjune.com/products/8-nights-of-mani-magic-hanukkah-set',
  'https://oliveandjune.com/products/8-nights-of-mani-magic-hanukkah-set',
  50, 72, NULL, 0, 'USD',
  NULL, NULL, 'month', 'Ships in October', 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
),
(
  'shopify:patrickta.com:pro-signature-brush-collection',
  'coming_soon',
  'Pro Signature Brush Collection',
  'Patrick Ta Beauty',
  'The brand page does not include a description yet.',
  NULL,
  'https://patrickta.com/products/pro-signature-brush-collection',
  'https://patrickta.com/products/pro-signature-brush-collection',
  NULL, NULL, NULL, 0, 'USD',
  NULL, NULL, 'unconfirmed', NULL, 'upcoming', NULL,
  '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z', '2026-09-25T05:25:51Z'
);
