-- =========================================================
-- DELETE TODAY'S LIFT RECORD FOR DAVETEST (Test Paid Lift)
-- =========================================================
-- This allows testing lift_cooldown_with_points (100 points)
-- after already using the FREE lift once today
-- =========================================================

DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::date = '2026-01-07';

-- Verify deletion
SELECT 
  'Lift Records Remaining: ' || COUNT(*)::text as result
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- ⚠️ NOTE: This removes the unique constraint protection for today
-- After running this, you can test lift_cooldown_with_points()
-- In production, users should only be able to lift once per day
