-- =========================================================
-- FIX RLS FOR penalty_offense_history
-- =========================================================
-- Allow trigger function to insert into penalty_offense_history
-- =========================================================

-- 1. Add INSERT/UPDATE policies for system (trigger runs as authenticated user)
DROP POLICY IF EXISTS "System can insert offense history via trigger" ON public.penalty_offense_history;
CREATE POLICY "System can insert offense history via trigger"
ON public.penalty_offense_history
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow inserts from triggers

DROP POLICY IF EXISTS "System can update offense history via trigger" ON public.penalty_offense_history;
CREATE POLICY "System can update offense history via trigger"
ON public.penalty_offense_history
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); -- Allow updates from triggers

-- 2. Grant necessary permissions
GRANT INSERT ON public.penalty_offense_history TO authenticated;
GRANT UPDATE ON public.penalty_offense_history TO authenticated;

-- 3. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'penalty_offense_history'
ORDER BY policyname;

-- ✅ DONE: Triggers can now insert/update penalty_offense_history
