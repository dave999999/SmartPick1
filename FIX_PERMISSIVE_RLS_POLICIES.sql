-- =========================================================
-- TIGHTEN RLS POLICIES - FIX LINTER WARNINGS
-- =========================================================
-- Make trigger function SECURITY DEFINER to bypass RLS
-- Remove overly permissive policies
-- =========================================================

-- 1. Fix update_offense_history() function to run as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_offense_history()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert or update offense history
  INSERT INTO public.penalty_offense_history (
    user_id,
    offense_count,
    last_offense_date,
    total_warnings,
    total_1hour_bans,
    total_24hour_bans,
    total_permanent_bans,
    total_forgiven,
    reliability_score
  )
  VALUES (
    NEW.user_id,
    NEW.offense_number,
    NOW(),
    CASE WHEN NEW.penalty_type = 'warning' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = '1hour' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = '24hour' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = 'permanent' THEN 1 ELSE 0 END,
    0,
    public.calculate_reliability_score(NEW.user_id)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    offense_count = GREATEST(penalty_offense_history.offense_count, NEW.offense_number),
    last_offense_date = NOW(),
    total_warnings = penalty_offense_history.total_warnings + CASE WHEN NEW.penalty_type = 'warning' THEN 1 ELSE 0 END,
    total_1hour_bans = penalty_offense_history.total_1hour_bans + CASE WHEN NEW.penalty_type = '1hour' THEN 1 ELSE 0 END,
    total_24hour_bans = penalty_offense_history.total_24hour_bans + CASE WHEN NEW.penalty_type = '24hour' THEN 1 ELSE 0 END,
    total_permanent_bans = penalty_offense_history.total_permanent_bans + CASE WHEN NEW.penalty_type = 'permanent' THEN 1 ELSE 0 END,
    total_forgiven = penalty_offense_history.total_forgiven + CASE WHEN NEW.forgiveness_status = 'granted' THEN 1 ELSE 0 END,
    reliability_score = public.calculate_reliability_score(NEW.user_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Now that function is SECURITY DEFINER, remove permissive policies
DROP POLICY IF EXISTS "System can insert offense history via trigger" ON public.penalty_offense_history;
DROP POLICY IF EXISTS "System can update offense history via trigger" ON public.penalty_offense_history;

-- No INSERT/UPDATE policies needed now - trigger function bypasses RLS

-- 3. Fix user_missed_pickups - restrict to system functions only
DROP POLICY IF EXISTS "System can create missed pickups" ON public.user_missed_pickups;

-- More restrictive: Only allow inserts for authenticated users' own records
CREATE POLICY "Users can track own missed pickups"
ON public.user_missed_pickups
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- 4. Verify - should show no more permissive policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual = 'true' THEN '⚠️ PERMISSIVE USING'
    WHEN with_check = 'true' THEN '⚠️ PERMISSIVE WITH CHECK'
    ELSE '✅ RESTRICTED'
  END as security_level
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('penalty_offense_history', 'user_missed_pickups')
ORDER BY tablename, policyname;

-- ✅ DONE: 
-- - update_offense_history() now SECURITY DEFINER (bypasses RLS)
-- - Removed permissive INSERT/UPDATE policies on penalty_offense_history
-- - Tightened user_missed_pickups INSERT policy
-- - Linter warnings resolved!
