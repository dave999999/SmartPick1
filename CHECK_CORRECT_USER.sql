-- Check the CORRECT user: batumashvili.davit@gmail.com

-- 1. Check today's cancellation count
SELECT COUNT(*) as todays_cancels
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 2. Check balance
SELECT 
  u.email,
  COALESCE(up.balance, 0) as balance
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';

-- 3. Check cooldown status
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 4. Try lift function
SELECT * FROM lift_cooldown_with_points(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 5. If balance is 0, add points
INSERT INTO user_points (user_id, balance)
VALUES (
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  500
)
ON CONFLICT (user_id) DO UPDATE 
SET balance = GREATEST(user_points.balance, 500);
