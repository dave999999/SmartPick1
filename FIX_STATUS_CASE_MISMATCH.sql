-- =========================================================
-- CHECK EXACT STATUS VALUES (CASE SENSITIVE)
-- =========================================================

-- Check what status values actually exist
SELECT 
  '=== EXACT STATUS VALUES ===' as check_type,
  r.status,
  COUNT(*) as count
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY r.status
ORDER BY count DESC;

-- Check for 'active' vs 'ACTIVE' vs 'Active'
SELECT 
  '=== CASE SENSITIVE CHECK ===' as check_type,
  r.id,
  r.status,
  CASE 
    WHEN r.status = 'active' THEN '✅ lowercase active'
    WHEN r.status = 'ACTIVE' THEN '✅ uppercase ACTIVE'
    WHEN r.status = 'expired' THEN '✅ lowercase expired'
    WHEN r.status = 'EXPIRED' THEN '✅ uppercase EXPIRED'
    ELSE '❌ unknown: ' || r.status
  END as status_type,
  r.expires_at
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;

-- Force update ALL to uppercase (match what frontend expects)
UPDATE reservations
SET status = CASE
  WHEN status ILIKE 'active' THEN 'ACTIVE'
  WHEN status ILIKE 'expired' THEN 'EXPIRED'
  WHEN status ILIKE 'cancelled' THEN 'CANCELLED'
  WHEN status ILIKE 'picked_up' THEN 'PICKED_UP'
  ELSE UPPER(status)
END
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Now check active count with UPPERCASE
SELECT 
  '=== ACTIVE COUNT (UPPERCASE) ===' as check_type,
  COUNT(*) as count
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND r.status = 'ACTIVE';

-- Final verification
SELECT 
  '=== FINAL STATE ===' as check_type,
  r.id,
  r.status,
  r.expires_at,
  (r.expires_at < NOW()) as should_be_expired
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;
