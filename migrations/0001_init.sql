-- Beauti core schema: catalog, wishlist, notifications, price history.
-- Designed so a future `users` account can attach to the same device-scoped rows.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  device_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  product_url TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  promo_codes TEXT NOT NULL DEFAULT '[]',
  deal_score INTEGER NOT NULL DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (availability IN ('in_stock', 'out_of_stock', 'limited')),
  restock_estimate TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  price REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  device_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (device_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restock', 'price_drop')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  device_id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_deal_score ON products(deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_device ON wishlist(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device ON notifications(device_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id);
