-- =====================================================
-- EMERGENCY: CREATE ADMIN USER
-- =====================================================
-- Run this to make yourself an admin

-- 1. First, check what users exist
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Find YOUR user by email (check auth.users table)
SELECT 
  au.id,
  au.email,
  u.role as current_role
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE au.email = (
  -- This gets the currently logged in user's email
  SELECT email FROM auth.users WHERE id = auth.uid()
)
LIMIT 1;

-- 3. UPDATE YOUR USER TO ADMIN
-- Replace 'your-email@example.com' with your actual email
UPDATE public.users 
SET role = 'ADMIN' 
WHERE id = auth.uid();

-- 4. Verify you're now an admin
SELECT 
  id,
  email,
  role,
  'You are now admin!' as status
FROM public.users
WHERE id = auth.uid();

-- If the update didn't work, manually update by email:
-- UPDATE public.users SET role = 'ADMIN' WHERE email = 'your-actual-email@example.com';
