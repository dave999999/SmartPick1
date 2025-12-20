-- ============================================================================
-- Fix RLS Performance Warnings
-- Date: 2024-12-21
-- Description: Optimize RLS policies for better query performance
-- ============================================================================

-- ============================================================================
-- ISSUE 1: auth_rls_initplan
-- Problem: auth.uid() is re-evaluated for EACH row (slow)
-- Solution: Wrap in SELECT to evaluate only ONCE per query
-- ============================================================================

-- 1. Fix partner_points policy
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
CREATE POLICY "partners_view_own_points"
ON public.partner_points
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())  -- Wrapped in SELECT for performance
);

-- 2. Fix partner_point_transactions policy
DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
CREATE POLICY "partners_view_own_transactions"
ON public.partner_point_transactions
FOR SELECT
TO authenticated
USING (
  partner_id = (SELECT auth.uid())  -- Wrapped in SELECT for performance
);

-- 3. Fix user_cancellation_tracking policy
DROP POLICY IF EXISTS "user_cancellation_tracking_select" ON public.user_cancellation_tracking;
CREATE POLICY "user_cancellation_tracking_select"
ON public.user_cancellation_tracking
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())  -- Wrapped in SELECT for performance
);

-- 4. Fix partners admin update policy
DROP POLICY IF EXISTS "partners_admin_update" ON public.partners;
CREATE POLICY "partners_admin_update"
ON public.partners
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())  -- Wrapped in SELECT for performance
    AND role = 'ADMIN'
  )
);

-- ============================================================================
-- ISSUE 2: multiple_permissive_policies
-- Problem: partners table has TWO UPDATE policies for authenticated role
-- Solution: Combine into ONE policy with OR logic
-- ============================================================================

-- Drop the two separate policies
DROP POLICY IF EXISTS "partners_update" ON public.partners;
DROP POLICY IF EXISTS "partners_admin_update" ON public.partners;

-- Create single combined policy
CREATE POLICY "partners_update_combined"
ON public.partners
FOR UPDATE
TO authenticated
USING (
  -- Either: Partner updating their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Or: Admin updating any partner
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role = 'ADMIN'
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies on affected tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'partner_points',
  'partner_point_transactions',
  'user_cancellation_tracking',
  'partners'
)
ORDER BY tablename, policyname;

-- Verify no duplicate policies
SELECT 
  schemaname,
  tablename,
  cmd,
  roles,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, cmd, roles
HAVING COUNT(*) > 1
ORDER BY tablename;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- 
-- ✅ PERFORMANCE OPTIMIZATIONS:
-- 1. partner_points: auth.uid() → (SELECT auth.uid())
-- 2. partner_point_transactions: auth.uid() → (SELECT auth.uid())
-- 3. user_cancellation_tracking: auth.uid() → (SELECT auth.uid())
-- 4. partners admin policy: auth.uid() → (SELECT auth.uid())
-- 
-- ✅ POLICY CONSOLIDATION:
-- - Merged partners_update + partners_admin_update → partners_update_combined
-- - Reduces policy evaluation overhead (2 policies → 1 policy)
-- 
-- 📈 EXPECTED IMPROVEMENTS:
-- - Faster queries on tables with many rows
-- - auth.uid() evaluated once per query instead of per row
-- - Reduced CPU usage on policy evaluation
-- 
-- ============================================================================
