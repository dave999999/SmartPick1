-- =========================================================
-- FORCE REFRESH - VERIFY AND FIX STATUS
-- =========================================================

-- Step 1: Check current status
SELECT 
  'BEFORE FIX' as step,
  r.id,
  r.status,
  r.expires_at,
  (r.expires_at < NOW()) as is_expired_time,
  (NOW() - r.expires_at) as time_ago
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC;

-- Step 2: Force update all expired reservations
UPDATE reservations
SET status = 'expired',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'active'
  AND expires_at < NOW();

-- Step 3: Verify fix
SELECT 
  'AFTER FIX' as step,
  r.id,
  r.status,
  r.expires_at,
  (r.expires_at < NOW()) as is_expired_time
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC;

-- Step 4: Check missed pickups
SELECT 
  'MISSED PICKUPS' as check_type,
  COUNT(*) as total
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
