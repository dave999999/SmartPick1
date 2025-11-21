-- ============================================
-- Verify and Fix Profile Update RLS Policies
-- Run this to ensure users can update their own profiles
-- ============================================

-- 1. Check current RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 2. Ensure users can SELECT their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 3. Ensure users can UPDATE their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Verify the policies were created
SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN 'Allows users to view their profile'
    WHEN cmd = 'UPDATE' THEN 'Allows users to update name, phone, etc.'
    ELSE 'Other policy'
  END as description
FROM pg_policies
WHERE tablename = 'users'
  AND policyname LIKE '%own profile%';

-- ============================================
-- Test the UPDATE policy (safe test)
-- ============================================
-- This query shows if your current user can update
-- Run this while logged in to test permissions:
--
-- SELECT
--   CASE
--     WHEN auth.uid() IS NOT NULL THEN 'You are logged in, UPDATE should work'
--     ELSE 'You are not logged in'
--   END as status,
--   auth.uid() as your_user_id;

-- ============================================
-- DONE!
-- ============================================
SELECT '✅ Profile update RLS policies verified/created' as message;
