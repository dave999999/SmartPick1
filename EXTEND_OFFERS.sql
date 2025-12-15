-- ===================================================================
-- EXTEND ALL OFFER EXPIRATION DATES
-- ===================================================================
-- All offers expired on 2025-12-15, this will extend them by 7 days
-- ===================================================================

UPDATE offers
SET expires_at = expires_at + INTERVAL '7 days'
WHERE expires_at < NOW();

-- Verify the update
SELECT COUNT(*) as updated_offers FROM offers WHERE expires_at > NOW();

-- Show sample updated offers
SELECT 
  id,
  title,
  expires_at,
  expires_at > NOW() as is_active
FROM offers
ORDER BY expires_at DESC
LIMIT 10;
