-- =====================================================
-- DEBUG: Check why admin check is failing
-- =====================================================

-- 1. Check your current user
SELECT 
  auth.uid() as your_user_id,
  'Current logged in user' as status;

-- 2. Check if you're in the users table
SELECT 
  id,
  email,
  name,
  role,
  'Your user record' as status
FROM public.users
WHERE id = auth.uid();

-- 3. Check if you're an admin
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    ) THEN 'YES - You are ADMIN'
    ELSE 'NO - You are NOT admin'
  END as admin_check;

-- 4. Check all admins in the system
SELECT 
  id,
  email,
  role,
  'All admin users' as status
FROM public.users
WHERE role = 'ADMIN';

-- If you're not showing as admin, run this:
-- UPDATE public.users SET role = 'ADMIN' WHERE id = auth.uid();
