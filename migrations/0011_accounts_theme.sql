-- Accounts on the existing users table: username + PBKDF2 password + theme.
-- Sessions back the HttpOnly cookie. Wishlist keeps (device_id, product_id);
-- signed-in hearts also store user_id and a canonical acct:{userId} row.

ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN theme_main TEXT;
ALTER TABLE users ADD COLUMN theme_secondary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id, product_id);
