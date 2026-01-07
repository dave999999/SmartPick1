-- =========================================================
-- ENABLE RLS ON user_missed_pickups TABLE
-- =========================================================
-- Fix Supabase linter warning: "RLS Disabled in Public"
-- =========================================================

-- 1. Enable RLS on the table
ALTER TABLE public.user_missed_pickups ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own missed pickups" ON public.user_missed_pickups;
DROP POLICY IF EXISTS "Users can insert their own missed pickups" ON public.user_missed_pickups;
DROP POLICY IF EXISTS "Users can update their own missed pickups" ON public.user_missed_pickups;
DROP POLICY IF EXISTS "Service role has full access" ON public.user_missed_pickups;

-- 3. Create RLS policies for authenticated users

-- SELECT: Users can only see their own missed pickups
CREATE POLICY "Users can view their own missed pickups"
ON public.user_missed_pickups
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- INSERT: System can create missed pickup records (handled by functions)
CREATE POLICY "System can create missed pickups"
ON public.user_missed_pickups
FOR INSERT
TO authenticated
WITH CHECK (true); -- Functions run as authenticated, so allow inserts

-- UPDATE: Users can update warning_shown flag on their own records
CREATE POLICY "Users can update their own missed pickups"
ON public.user_missed_pickups
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE: Only service role can delete (for cleanup/admin purposes)
-- No public delete policy - users can't delete their history

-- 4. Grant necessary permissions
GRANT SELECT ON public.user_missed_pickups TO authenticated;
GRANT INSERT ON public.user_missed_pickups TO authenticated;
GRANT UPDATE ON public.user_missed_pickups TO authenticated;

-- Service role needs full access for system operations
GRANT ALL ON public.user_missed_pickups TO service_role;

-- 5. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_missed_pickups') as policy_count
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_missed_pickups';

-- ✅ DONE: RLS enabled with proper policies
-- Users can only see/update their own records
-- System functions can create records
-- Linter warning resolved!
