-- Each pre-order re-check, including failures that must not refresh last_verified_at.
-- Wrangler applies this file as one migration (both ALTERs in this batch).
-- Do not db.exec it from ensureCatalog.

ALTER TABLE preorders ADD COLUMN last_checked_at TEXT;
ALTER TABLE preorders ADD COLUMN last_check_error TEXT;
