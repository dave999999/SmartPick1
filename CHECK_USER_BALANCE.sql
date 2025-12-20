-- Check balance for user batuamshvili.davit@gmail.com
-- First, get the user_id from auth.users
SELECT 
  'User Auth ID' as type,
  id,
  email
FROM auth.users 
WHERE email = 'batuamshvili.davit@gmail.com';

-- Check if user is a partner
SELECT 
  'Partner Profile' as type,
  id as partner_id,
  user_id,
  status
FROM partners 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'batuamshvili.davit@gmail.com'
);

-- Check partner_points table
SELECT 
  'Partner Points' as type,
  user_id,
  balance,
  updated_at
FROM partner_points 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'batuamshvili.davit@gmail.com'
);

-- Check user_points table (regular customer points)
SELECT 
  'User Points' as type,
  user_id,
  balance,
  updated_at
FROM user_points 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'batuamshvili.davit@gmail.com'
);

-- Check recent transactions
SELECT 
  'Recent Transactions' as type,
  id,
  user_id,
  change,
  reason,
  created_at
FROM point_transactions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'batuamshvili.davit@gmail.com'
)
ORDER BY created_at DESC
LIMIT 10;
