-- =========================================================
-- CHECK IF MISSED PICKUP IS TRACKED AS CANCELLATION
-- =========================================================

-- Check davetest's cancellations after expired reservation
SELECT 
  'Cancellations' as type,
  COUNT(*) as count,
  STRING_AGG(
    'Created: ' || (created_at AT TIME ZONE 'Asia/Tbilisi')::text,
    '; '
  ) as details
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
SELECT 
  'Failed Pickups' as type,
  COUNT(*) as count,
  STRING_AGG(
    'ID: ' || id::text || ' | Status: ' || status,
    '; '
  ) as details
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- Check cooldown status
SELECT 
  'Cooldown Status' as check_name,
  is_user_in_cooldown((SELECT id FROM auth.users WHERE email = 'davetest@gmail.com'))::text as result;
