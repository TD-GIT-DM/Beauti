-- Cached retailer and brand review snapshots.
-- Filled by the reviews cron. Do not db.exec this from ensureCatalog.

CREATE TABLE IF NOT EXISTS product_reviews (
  product_id TEXT PRIMARY KEY,
  rating REAL,
  review_count INTEGER,
  source TEXT,
  source_url TEXT,
  fetched_at TEXT,
  checked_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'none', 'no_source', 'error')),
  last_error TEXT,
  positive_json TEXT NOT NULL DEFAULT '[]',
  negative_json TEXT NOT NULL DEFAULT '[]',
  negative_label TEXT CHECK (negative_label IS NULL OR negative_label IN ('negative', 'mixed')),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_checked ON product_reviews(checked_at);
