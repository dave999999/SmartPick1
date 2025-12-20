-- Check which offers have expired pickup windows
-- Run this in Supabase SQL Editor to see the problem

SELECT 
  id,
  title,
  status,
  quantity_available,
  expires_at,
  pickup_start,
  pickup_end,
  CASE 
    WHEN pickup_end IS NULL THEN 'No pickup end time'
    WHEN pickup_end > NOW() THEN 'Valid'
    ELSE 'EXPIRED PICKUP WINDOW'
  END as pickup_status,
  CASE 
    WHEN expires_at > NOW() THEN 'Valid'
    ELSE 'EXPIRED OFFER'
  END as offer_status
FROM offers
WHERE status = 'ACTIVE'
ORDER BY pickup_end ASC NULLS LAST
LIMIT 20;

-- After seeing the expired offers, apply the fix:
-- Run the contents of APPLY_FIX_EXPIRED_OFFERS.sql
