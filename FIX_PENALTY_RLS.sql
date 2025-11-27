-- Fix RLS policies for penalty_offense_history table
-- This allows the trigger to insert/update offense history when penalties are acknowledged

-- Add INSERT policy for penalty_offense_history (for trigger)
DROP POLICY IF EXISTS "System can insert offense history" ON public.penalty_offense_history;
CREATE POLICY "System can insert offense history"
  ON public.penalty_offense_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for penalty_offense_history (for trigger)
DROP POLICY IF EXISTS "System can update offense history" ON public.penalty_offense_history;
CREATE POLICY "System can update offense history"
  ON public.penalty_offense_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add UPDATE policy for users to acknowledge their own penalties
DROP POLICY IF EXISTS "Users can acknowledge own penalties" ON public.user_penalties;
CREATE POLICY "Users can acknowledge own penalties"
  ON public.user_penalties FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant INSERT and UPDATE on penalty_offense_history
GRANT INSERT, UPDATE ON public.penalty_offense_history TO authenticated;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('user_penalties', 'penalty_offense_history')
ORDER BY tablename, policyname;
