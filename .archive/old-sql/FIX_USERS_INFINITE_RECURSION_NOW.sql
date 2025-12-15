-- ============================================================================
-- URGENT: FIX INFINITE RECURSION IN USERS TABLE POLICIES
-- ============================================================================
-- The users table policies are checking the users table itself, causing
-- "infinite recursion detected in policy for relation 'users'"
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX: Remove recursive policies on users table
-- ============================================================================

-- Drop ALL existing users SELECT policies
DROP POLICY IF EXISTS "users_can_read_own_or_public" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile or public profiles" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;

-- Create NON-RECURSIVE SELECT policy
-- Allow reading users when:
-- 1. Reading own record (authenticated users)
-- 2. User is a partner owner (for public offers to show partner info)
-- 3. Anonymous access for partner owners (so unauthenticated users can see offers)
CREATE POLICY "users_select" ON public.users
FOR SELECT USING (
  -- Authenticated: own record
  (auth.uid() IS NOT NULL AND id = auth.uid())
  OR
  -- Anyone: users who are partner owners (needed for offers -> partner -> user lookup)
  id IN (SELECT user_id FROM public.partners WHERE user_id IS NOT NULL)
);

-- Keep UPDATE policy (no recursion issue here)
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
FOR UPDATE USING (id = (SELECT auth.uid()));

-- Keep INSERT policy for registration
DROP POLICY IF EXISTS "users_can_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY FIX
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd, policyname;

SELECT '✅ Users table policies fixed - no more recursion!' as status;
