-- Full investigation of points for batuamshvili.davit@gmail.com

-- 1. Current state in BOTH tables
SELECT 
  'Current Balances' as info,
  u.email,
  up.balance as user_points_balance,
  pp.balance as partner_points_balance
FROM auth.users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN partner_points pp ON pp.user_id = u.id
WHERE u.email = 'batuamshvili.davit@gmail.com';

-- 2. ALL transactions (to see where points went)
SELECT 
  'All Transactions' as info,
  pt.created_at,
  pt.change as points_change,
  pt.balance_before,
  pt.balance_after,
  pt.reason,
  pt.metadata
FROM point_transactions pt
JOIN auth.users u ON u.id = pt.user_id
WHERE u.email = 'batuamshvili.davit@gmail.com'
ORDER BY pt.created_at DESC
LIMIT 50;
