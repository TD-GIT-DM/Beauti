-- The cron shortened the seeded "Fenty Hair" display name to the Shopify vendor "Fenty".
-- Put that seeded name back. Does not change last_verified_at or image_url.
-- Do not db.exec this from ensureCatalog.

UPDATE preorders
SET brand = 'Fenty Hair'
WHERE id = 'shopify:fentybeauty.com:the-bounce-besties-mini-leave-in-conditioner-spray-full-size-curl-defining-cream'
  AND brand IN ('Fenty', 'Fenty Beauty');
