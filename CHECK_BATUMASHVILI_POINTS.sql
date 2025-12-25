-- Check all points for batumashvili.davit@gmail.com (both user and partner)

-- 1. Check user existence
SELECT 
  'User Info' as type,
  id,
  email,
  created_at
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- 2. Check if they are a partner
SELECT 
  'Partner Status' as type,
  id as partner_id,
  user_id,
  status,
  created_at
FROM partners 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
);

-- 3. Check user_points table (regular customer points)
SELECT 
  'User Points' as type,
  user_id,
  balance,
  updated_at
FROM user_points 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
);

-- 4. Check partner_points table
SELECT 
  'Partner Points' as type,
  user_id,
  balance,
  updated_at
FROM partner_points 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
);

-- 5. Check recent transactions
SELECT 
  'Recent Transactions' as type,
  id,
  user_id,
  change,
  reason,
  created_at
FROM point_transactions 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;
