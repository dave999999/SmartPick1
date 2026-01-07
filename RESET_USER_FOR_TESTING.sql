-- Reset user's cancellation count for fresh testing
-- User: davetest@gmail.com

-- 1. Check current state
SELECT 
  'Before reset' as status,
  COUNT(*) as cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 2. Delete today's cancellation records
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Delete any cooldown lifts from today
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3.5. Clear rate limits for this user
DELETE FROM rate_limits
WHERE identifier = (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com');

-- 4. Verify count is 0
SELECT 
  'After reset' as status,
  COUNT(*) as cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 5. Check cooldown status (should be false)
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 6. Check balance (should still have points)
SELECT 
  u.email,
  up.balance as current_balance
FROM users u
JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'davetest@gmail.com';
