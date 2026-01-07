-- Test get_active_penalty function for davetest@gmail.com

-- Get user ID
SELECT 
  'User ID' as test,
  id as user_id
FROM auth.users 
WHERE email = 'davetest@gmail.com';

-- Call the function
SELECT 
  'get_active_penalty result' as test,
  *
FROM get_active_penalty(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- Check the penalty details directly
SELECT 
  'Direct penalty query' as test,
  p.id as penalty_id,
  p.offense_number,
  p.offense_type,
  p.penalty_type,
  p.suspended_until,
  p.is_active,
  p.acknowledged,
  u.is_suspended,
  u.suspended_until as user_suspended_until
FROM user_penalties p
JOIN users u ON u.id = p.user_id
WHERE u.email = 'davetest@gmail.com'
  AND p.is_active = TRUE
ORDER BY p.created_at DESC
LIMIT 1;
