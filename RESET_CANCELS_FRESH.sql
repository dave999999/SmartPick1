-- Reset batumashvili.davit@gmail.com for fresh testing

-- 1. Check current state
SELECT 
  'Current state' as info,
  COUNT(*) as cancel_count,
  (SELECT balance FROM user_points WHERE user_id = u.id) as balance
FROM users u
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.id;

-- 2. Delete today's cancellation records
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Delete today's cooldown lifts
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 4. Verify reset
SELECT 
  'After reset' as info,
  COUNT(*) as cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 5. Check cooldown status (should be false)
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 6. Check final balance
SELECT 
  u.email,
  up.balance
FROM users u
JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
