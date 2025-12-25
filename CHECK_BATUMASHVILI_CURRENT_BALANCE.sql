-- Quick check of current balances for batumashvili.davit@gmail.com

SELECT 
  u.email,
  COALESCE(up.balance, 0) as user_points_balance,
  COALESCE(pp.balance, 0) as partner_points_balance,
  CASE 
    WHEN p.id IS NOT NULL THEN 'Yes (Status: ' || p.status || ')'
    ELSE 'No'
  END as is_partner
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN partners p ON p.user_id = u.id
LEFT JOIN partner_points pp ON pp.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
