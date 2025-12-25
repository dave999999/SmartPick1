-- Check what happened with the lift

-- 1. Check current balance in database
SELECT 
  'Database balance' as source,
  up.balance
FROM user_points up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com');

-- 2. Check if lift was recorded
SELECT 
  'Lift records' as info,
  COUNT(*) as lift_count,
  MAX(lifted_at) as latest_lift,
  SUM(points_spent) as total_points_spent
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Check today's cancellation count
SELECT COUNT(*) as cancel_count_now
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 4. Try calling the function again to see what it returns
SELECT * FROM lift_cooldown_with_points(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);
