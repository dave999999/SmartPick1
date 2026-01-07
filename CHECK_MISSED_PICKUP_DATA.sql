-- =========================================================
-- CHECK MISSED PICKUP DATA FOR DAVETEST
-- =========================================================

-- 1. Check all missed pickups
SELECT 
  id,
  user_id,
  reservation_id,
  created_at,
  warning_level,
  warning_shown
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;

-- 2. Get warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 3. Count FAILED_PICKUP reservations
SELECT COUNT(*) as failed_pickup_count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- 4. Check if warning needs to be shown
SELECT 
  ump.*,
  r.status as reservation_status,
  (ump.warning_shown = false) as should_show_warning
FROM user_missed_pickups ump
LEFT JOIN reservations r ON r.id = ump.reservation_id
WHERE ump.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND ump.warning_shown = false
ORDER BY ump.created_at DESC;
