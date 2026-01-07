-- =========================================================
-- EXPIRE ACTIVE RESERVATION FOR DAVETEST
-- =========================================================

-- Expire active reservation
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Track as missed pickup
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Show warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- Show all missed pickups
SELECT 
  ROW_NUMBER() OVER (ORDER BY created_at) as pickup_number,
  created_at,
  warning_level,
  warning_shown
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;
