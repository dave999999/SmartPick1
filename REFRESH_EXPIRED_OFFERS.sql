-- OPTION 2: Refresh all expired offers with NEW pickup windows
-- Use this if you want to keep the offers active with new dates
-- Run this in Supabase SQL Editor

-- Update ALL expired offers with fresh pickup windows (today + 7 days)
UPDATE offers
SET 
  pickup_start = NOW(),
  pickup_end = NOW() + INTERVAL '7 days',
  expires_at = NOW() + INTERVAL '7 days',
  updated_at = NOW()
WHERE status = 'ACTIVE'
  AND pickup_end IS NOT NULL 
  AND pickup_end <= NOW();

-- Show what was updated
SELECT 
  COUNT(*) as offers_refreshed,
  'Offers updated with new 7-day pickup windows' as message
FROM offers
WHERE status = 'ACTIVE'
  AND updated_at > NOW() - INTERVAL '1 minute'
  AND pickup_end > NOW();

-- Verify results
SELECT 
  id,
  title,
  pickup_start,
  pickup_end,
  expires_at,
  CASE 
    WHEN pickup_end > NOW() THEN '✅ NOW VALID'
    ELSE '❌ STILL EXPIRED'
  END as status
FROM offers
WHERE updated_at > NOW() - INTERVAL '2 minutes'
ORDER BY title
LIMIT 10;

SELECT 
  '✅ Offers Refreshed!' as status,
  'All offers now have valid 7-day pickup windows' as result;
