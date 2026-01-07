-- =========================================================
-- EXPIRE 3RD ACTIVE RESERVATION FOR DAVETEST
-- =========================================================

-- Step 1: Set expires_at to past
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Step 2: Call function to expire it and track as 3rd missed pickup
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Step 3: Check all missed pickups
SELECT 
  id,
  created_at,
  warning_level,
  warning_shown,
  CASE warning_level
    WHEN 1 THEN '💛 You have 3 chances - stay careful!'
    WHEN 2 THEN '🧡 2 chances left - be more careful!'
    WHEN 3 THEN '🔴 1 chance left - this is important!'
    ELSE '🚫 Suspended'
  END as expected_message
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;

-- Step 4: Get warning status (should be 3rd now)
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- ✅ EXPECTED: 
-- - total_missed: 3
-- - warning_level: 3
-- - warning_message: "1 chance left - this is important!"
-- - warning_emoji: 🔴
