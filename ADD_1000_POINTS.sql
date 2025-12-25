-- Give batumashvili.davit@gmail.com 1000 points

-- 1. Check current balance
SELECT 
  u.email,
  COALESCE(up.balance, 0) as current_balance
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';

-- 2. Set balance to 1000
INSERT INTO user_points (user_id, balance)
VALUES (
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  1000
)
ON CONFLICT (user_id) DO UPDATE 
SET balance = 1000;

-- 3. Verify new balance
SELECT 
  u.email,
  up.balance as new_balance
FROM users u
JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
