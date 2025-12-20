-- RESTORE EXPIRED OFFERS WITH NEW VALID DATES
-- This will make all your offers active again with fresh pickup windows

-- Restore offers that were just expired and give them new dates
UPDATE offers
SET 
  status = 'ACTIVE',
  pickup_start = NOW(),
  pickup_end = NOW() + INTERVAL '7 days',
  expires_at = NOW() + INTERVAL '7 days',
  updated_at = NOW()
WHERE status = 'EXPIRED'
  AND updated_at > NOW() - INTERVAL '1 hour';  -- Only restore recently expired offers

-- Show what was restored
SELECT 
  COUNT(*) as offers_restored,
  '✅ Offers restored with 7-day pickup windows' as message
FROM offers
WHERE status = 'ACTIVE'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Verify they have valid dates now
SELECT 
  id,
  title,
  status,
  quantity_available,
  pickup_start,
  pickup_end,
  expires_at,
  CASE 
    WHEN pickup_end > NOW() THEN '✅ VALID'
    ELSE '❌ STILL EXPIRED'
  END as pickup_status
FROM offers
WHERE updated_at > NOW() - INTERVAL '2 minutes'
ORDER BY title
LIMIT 20;

-- Final success message
SELECT 
  '✅ ALL OFFERS RESTORED!' as status,
  'Refresh your browser (Ctrl+Shift+R) to see all offers on the map' as next_step;
