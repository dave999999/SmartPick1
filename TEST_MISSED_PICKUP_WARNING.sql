-- =========================================================
-- TEST MISSED PICKUP WARNING SYSTEM FOR DAVETEST
-- =========================================================

-- 1. Check current missed pickups
SELECT 
  'Missed Pickups' as check_name,
  COUNT(*) as count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 2. Get warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 3. Check FAILED_PICKUP reservations
SELECT 
  id,
  status,
  expires_at,
  created_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC;

-- ✅ EXPECTED RESULTS:
-- - 1 missed pickup (from expired reservation)
-- - Warning level: 1
-- - Warning message: "You have 3 chances - stay careful!"
-- - Warning emoji: 💛
-- - needs_warning: TRUE
