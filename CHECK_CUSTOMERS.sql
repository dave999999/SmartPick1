-- Check how many users exist by role
SELECT 
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY role;

-- Check all non-admin users
SELECT 
  id,
  name,
  email,
  role,
  created_at
FROM public.users
WHERE role != 'ADMIN'
ORDER BY role, created_at DESC;

-- Test the function with CUSTOMER filter
SELECT COUNT(*) as customer_count
FROM get_users_with_points_summary('CUSTOMER', 100, 0);

-- Test the function with PARTNER filter
SELECT COUNT(*) as partner_count
FROM get_users_with_points_summary('PARTNER', 100, 0);

-- Test the function with NULL (all) filter
SELECT COUNT(*) as all_count
FROM get_users_with_points_summary(NULL, 100, 0);
