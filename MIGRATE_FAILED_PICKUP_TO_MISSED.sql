-- =========================================================
-- MIGRATE EXISTING FAILED_PICKUP TO MISSED_PICKUPS
-- =========================================================

-- Move existing FAILED_PICKUP reservations to user_missed_pickups table
INSERT INTO user_missed_pickups (user_id, reservation_id, created_at, warning_level)
SELECT 
  customer_id as user_id,
  id as reservation_id,
  updated_at as created_at,
  1 as warning_level
FROM reservations
WHERE status = 'FAILED_PICKUP'
  AND customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND id NOT IN (SELECT COALESCE(reservation_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM user_missed_pickups)
ON CONFLICT DO NOTHING;

-- Remove from cancellation tracking (it shouldn't be there for missed pickups)
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND created_at >= (
    SELECT MIN(updated_at) 
    FROM reservations 
    WHERE status = 'FAILED_PICKUP' 
      AND customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  );

-- Check results
SELECT 
  'Missed Pickups' as type,
  COUNT(*) as count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
SELECT 
  'Cancellations',
  COUNT(*)
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Get warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
