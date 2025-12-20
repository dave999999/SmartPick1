-- Deep investigation of balance issue for batuamshvili.davit@gmail.com

-- Step 1: Get the actual user_id
SELECT 
  'User ID' as info,
  id as user_id,
  email
FROM auth.users 
WHERE email = 'batuamshvili.davit@gmail.com';

-- Step 2: Check BOTH wallet balances with the actual user_id
SELECT 
  'Wallet Balances' as info,
  'user_points' as table_name,
  balance,
  updated_at
FROM user_points 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
UNION ALL
SELECT 
  'Wallet Balances' as info,
  'partner_points' as table_name,
  balance,
  updated_at
FROM partner_points 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';

-- Step 3: Get ALL point transactions
SELECT 
  'Transactions' as info,
  created_at,
  change,
  balance_before,
  balance_after,
  reason
FROM point_transactions 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
ORDER BY created_at DESC;

-- Step 4: Calculate total points spent vs earned
SELECT 
  'Summary' as info,
  SUM(CASE WHEN change > 0 THEN change ELSE 0 END) as total_earned,
  SUM(CASE WHEN change < 0 THEN change ELSE 0 END) as total_spent,
  SUM(change) as net_change
FROM point_transactions 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';

-- Step 5: Check if there's a mismatch
SELECT 
  'Balance Check' as info,
  COALESCE(up.balance, 0) as user_points_balance,
  COALESCE(pp.balance, 0) as partner_points_balance,
  COALESCE(up.balance, 0) + COALESCE(pp.balance, 0) as total_balance,
  (SELECT COALESCE(SUM(change), 0) FROM point_transactions WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid) as transaction_sum
FROM user_points up
FULL OUTER JOIN partner_points pp ON up.user_id = pp.user_id
WHERE up.user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid 
   OR pp.user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid;
