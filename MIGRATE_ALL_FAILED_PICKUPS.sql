-- =========================================================
-- MIGRATE ALL FAILED_PICKUPS TO MISSED_PICKUPS TABLE
-- =========================================================

-- Insert ALL FAILED_PICKUP reservations that aren't already tracked
INSERT INTO user_missed_pickups (user_id, reservation_id, created_at, warning_level, warning_shown)
SELECT 
  customer_id as user_id,
  id as reservation_id,
  updated_at as created_at,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at) as warning_level,
  false as warning_shown
FROM reservations
WHERE status = 'FAILED_PICKUP'
  AND customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND id NOT IN (
    SELECT COALESCE(reservation_id, '00000000-0000-0000-0000-000000000000'::uuid) 
    FROM user_missed_pickups
  )
ON CONFLICT DO NOTHING;

-- Check all missed pickups now
SELECT 
  id,
  created_at,
  warning_level,
  warning_shown,
  CASE warning_level
    WHEN 1 THEN '💛 You have 3 chances - stay careful!'
    WHEN 2 THEN '🧡 2 chances left - be more careful!'
    WHEN 3 THEN '🔴 1 chance left - this is important!'
    WHEN 4 THEN '🚫 Account suspended (1 hour)'
    ELSE '🚫 Suspended'
  END as expected_message
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;

-- Get warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- Count totals
SELECT 
  'Total FAILED_PICKUP' as type,
  COUNT(*) as count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
UNION ALL
SELECT 
  'Total Tracked in missed_pickups',
  COUNT(*)
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
