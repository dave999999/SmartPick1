-- =========================================================
-- EXPIRE DAVETEST'S ACTIVE RESERVATION (2ND MISSED PICKUP)
-- =========================================================

-- Step 1: Set expires_at to past
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Step 2: Call function to expire it and track as missed pickup
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Step 3: Verify it's FAILED_PICKUP
SELECT 
  id,
  status,
  expires_at,
  created_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Check warning status (should be 2nd warning now)
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- ✅ EXPECTED: 
-- - total_missed: 2
-- - warning_level: 2
-- - warning_message: "2 chances left - be more careful!"
-- - warning_emoji: 🧡
