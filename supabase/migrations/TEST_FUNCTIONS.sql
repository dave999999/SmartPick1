-- =====================================================
-- TEST SCRIPT - Run this to verify functions work
-- =====================================================

-- 1. Test basic user query (should show CUSTOMER and PARTNER only)
SELECT 
  id,
  name,
  email,
  role,
  created_at
FROM public.users
WHERE role != 'ADMIN'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Should show your customer/partner users

-- 2. Test user_points table exists and has data
SELECT 
  up.user_id,
  up.balance,
  u.name,
  u.role
FROM public.user_points up
INNER JOIN public.users u ON u.id = up.user_id
WHERE u.role != 'ADMIN'
LIMIT 5;

-- Expected: Should show user points

-- 3. Test get_users_with_points_summary function directly
SELECT * FROM get_users_with_points_summary(NULL, 10, 0);

-- Expected: Should return users with points data

-- 4. Test if function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_users_with_points_summary';

-- Expected: Should show the function exists

-- 5. Check RPC permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_users_with_points_summary'
  AND routine_schema = 'public';

-- Expected: Should show EXECUTE permission for authenticated role
