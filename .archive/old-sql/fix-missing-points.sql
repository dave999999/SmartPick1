-- Check if transactions were created for the claimed achievements
SELECT 
    pt.id,
    pt.change,
    pt.reason,
    pt.balance_before,
    pt.balance_after,
    pt.created_at,
    pt.metadata
FROM point_transactions pt
WHERE pt.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND pt.reason = 'achievement_reward'
ORDER BY pt.created_at DESC;

-- Check current balance
SELECT balance FROM user_points WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- If no transactions exist, manually add the missing points
UPDATE user_points 
SET balance = balance + 20,
    updated_at = NOW()
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Add the missing transactions
INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
VALUES 
  ('ed0d1c67-07b7-4901-852d-7130dd5368ab', 10, 'achievement_reward', 75, 85),
  ('ed0d1c67-07b7-4901-852d-7130dd5368ab', 10, 'achievement_reward', 85, 95);

-- Verify final balance
SELECT balance FROM user_points WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';
