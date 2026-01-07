-- =========================================================
-- EXPIRE 1ST ACTIVE RESERVATION (TEST WARNING DIALOG)
-- =========================================================

-- Step 1: Set expires_at to past
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Step 2: Call function to expire it and track as 1st missed pickup
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Step 3: Verify missed pickup was tracked
SELECT 
  id,
  created_at,
  warning_level,
  warning_shown,
  '💛 You have 3 chances - stay careful!' as expected_message
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;

-- Step 4: Get warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- ✅ EXPECTED: 
-- - total_missed: 1
-- - warning_level: 1
-- - warning_message: "You have 3 chances - stay careful!"
-- - warning_emoji: 💛
-- - needs_warning: TRUE
-- - warning_shown: FALSE

-- Now refresh your app - warning dialog should appear! 💛
