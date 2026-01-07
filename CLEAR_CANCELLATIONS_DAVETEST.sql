-- =========================================================
-- CLEAR CANCELLATIONS FOR DAVETEST
-- =========================================================
-- Removes cancellation records to test expired offers
-- =========================================================

DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Verify deletion
SELECT 
  'Cancellations Remaining: ' || COUNT(*)::text as result
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Check cooldown status
SELECT 
  'Currently In Cooldown: ' || is_user_in_cooldown(id)::text as status
FROM auth.users 
WHERE email = 'davetest@gmail.com';
