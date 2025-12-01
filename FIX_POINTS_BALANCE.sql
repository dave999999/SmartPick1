-- Fix negative points balance and add test points
-- Run this in Supabase SQL Editor

-- 1. Check current balance
SELECT user_id, balance 
FROM user_points 
WHERE balance < 0 OR user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- 2. Reset balance to 1185 points (as shown in your UI)
UPDATE user_points
SET balance = 1185
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- 3. If no record exists, create one
INSERT INTO user_points (user_id, balance)
VALUES ('ed0d1c67-07b7-4901-852d-7130dd5368ab', 1185)
ON CONFLICT (user_id) 
DO UPDATE SET balance = 1185;

-- 4. Verify new balance
SELECT user_id, balance, updated_at
FROM user_points 
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Should show: balance = 1185
