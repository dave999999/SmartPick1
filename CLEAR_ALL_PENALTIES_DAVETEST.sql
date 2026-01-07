-- =========================================================
-- CLEAR ALL MISSED PICKUPS FOR DAVETEST (FRESH START)
-- =========================================================

-- Delete all missed pickup records
DELETE FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Optionally: Change FAILED_PICKUP to CANCELLED (so they don't auto-migrate)
UPDATE reservations
SET status = 'CANCELLED'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- Clear cancellation tracking too
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Clear cooldown lifts
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Verify everything is cleared
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
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
SELECT 
  'Cooldown Lifts',
  COUNT(*)
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
SELECT 
  'FAILED_PICKUP Reservations',
  COUNT(*)
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- ✅ RESULT: All should be 0
-- Now you can test from scratch!
