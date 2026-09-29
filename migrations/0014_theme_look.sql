-- Sparkle background and site font on the account.
-- Wrangler applies this file as one migration (both ALTERs in this batch).
-- Do not db.exec it from ensureCatalog.

ALTER TABLE users ADD COLUMN theme_background TEXT;
ALTER TABLE users ADD COLUMN theme_font TEXT;
