-- Check user_points for batumashvili.davit@gmail.com
SELECT 
  u.email,
  up.balance as points,
  up.updated_at
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';
