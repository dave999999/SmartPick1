-- Add 1000 partner points to batumashvili.davit@gmail.com

-- 1. Check current partner points balance
SELECT 
  u.email,
  COALESCE(pp.balance, 0) as current_partner_balance
FROM users u
LEFT JOIN partner_points pp ON pp.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';

-- 2. Add 1000 points to partner_points
INSERT INTO partner_points (user_id, balance)
VALUES (
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  1000
)
ON CONFLICT (user_id) DO UPDATE 
SET balance = partner_points.balance + 1000;

-- 3. Verify new partner balance
SELECT 
  u.email,
  pp.balance as new_partner_balance
FROM users u
JOIN partner_points pp ON pp.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
