-- Give user enough points to test the paid lift feature

-- Check current balance
SELECT 
  u.email,
  COALESCE(up.balance, 0) as current_balance
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';

-- Add 500 points for testing
INSERT INTO user_points (user_id, balance)
VALUES ('ceb0217b-26f6-445a-a8b2-3807401deca9', 500)
ON CONFLICT (user_id) 
DO UPDATE SET balance = user_points.balance + 500;

-- Verify new balance
SELECT 
  u.email,
  up.balance as new_balance
FROM users u
JOIN user_points up ON up.user_id = u.id
WHERE u.id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';
