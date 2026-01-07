-- ============================================================================
-- CLEANUP: Remove Duplicate Policies
-- Run this FIRST to clean up the mess, then run FIX_RLS_PERFORMANCE.sql
-- ============================================================================

-- Drop ALL old policies on partners table
DROP POLICY IF EXISTS partners_select ON public.partners;
DROP POLICY IF EXISTS partners_insert ON public.partners;
DROP POLICY IF EXISTS partners_delete ON public.partners;
DROP POLICY IF EXISTS partners_update ON public.partners;
DROP POLICY IF EXISTS partners_select_combined ON public.partners;
DROP POLICY IF EXISTS partners_insert_combined ON public.partners;
DROP POLICY IF EXISTS partners_delete_combined ON public.partners;
DROP POLICY IF EXISTS admins_full_access ON public.partners;
DROP POLICY IF EXISTS users_manage_own_partner ON public.partners;

-- Drop ALL old policies on user_reliability table  
DROP POLICY IF EXISTS user_reliability_select ON public.user_reliability;
DROP POLICY IF EXISTS user_reliability_manage ON public.user_reliability;
DROP POLICY IF EXISTS user_reliability_select_combined ON public.user_reliability;

-- Drop ALL old policies on user_cooldown_lifts table
DROP POLICY IF EXISTS user_cooldown_lifts_select ON public.user_cooldown_lifts;
DROP POLICY IF EXISTS user_cooldown_lifts_insert ON public.user_cooldown_lifts;

-- Verify cleanup (should return empty)
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('partners', 'user_reliability', 'user_cooldown_lifts')
ORDER BY tablename, policyname;
