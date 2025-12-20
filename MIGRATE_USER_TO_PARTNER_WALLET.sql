-- Migrate balance from user_points to partner_points for batuamshvili.davit@gmail.com
-- This creates or updates the partner_points record with the balance from user_points

WITH user_balance AS (
  SELECT 
    up.user_id,
    up.balance,
    up.id as user_points_id
  FROM user_points up
  JOIN auth.users u ON u.id = up.user_id
  WHERE u.email = 'batuamshvili.davit@gmail.com'
)
INSERT INTO partner_points (user_id, balance, updated_at)
SELECT 
  user_id,
  balance,
  NOW()
FROM user_balance
ON CONFLICT (user_id) 
DO UPDATE SET 
  balance = partner_points.balance + EXCLUDED.balance,
  updated_at = NOW();

-- Verify the migration
SELECT 
  u.email,
  up.balance as old_user_wallet,
  pp.balance as new_partner_wallet
FROM auth.users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN partner_points pp ON pp.user_id = u.id
WHERE u.email = 'batuamshvili.davit@gmail.com';
