-- Reset user's cancellation count for fresh testing

-- 1. Check current state
SELECT 
  'Before reset' as status,
  COUNT(*) as cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 2. Delete today's cancellation records
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Delete any cooldown lifts from today
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 4. Verify count is 0
SELECT 
  'After reset' as status,
  COUNT(*) as cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 5. Check cooldown status (should be false)
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 6. Check balance (should still have points)
SELECT 
  u.email,
  up.balance as current_balance
FROM users u
JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
