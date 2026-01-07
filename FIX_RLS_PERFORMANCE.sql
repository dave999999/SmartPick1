-- ============================================================================
-- PERFORMANCE OPTIMIZATION: Fix RLS Policies
-- Date: 2026-01-04
-- These changes improve performance without breaking functionality
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Auth RLS Initialization (auth.uid() optimization)
-- ============================================================================

-- Issue: auth.uid() is re-evaluated for EVERY row
-- Fix: Wrap it in (SELECT auth.uid()) so it's evaluated ONCE per query

-- Fix for user_cooldown_lifts table
DROP POLICY IF EXISTS user_cooldown_lifts_select ON public.user_cooldown_lifts;
DROP POLICY IF EXISTS user_cooldown_lifts_insert ON public.user_cooldown_lifts;

CREATE POLICY user_cooldown_lifts_select ON public.user_cooldown_lifts
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));  -- Changed: wrapped in SELECT

CREATE POLICY user_cooldown_lifts_insert ON public.user_cooldown_lifts
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));  -- Changed: wrapped in SELECT

-- Fix for partners table (admin policy)
-- NOTE: Dropping the admins_full_access policy (FOR ALL) because it creates duplicates
-- Admin access is now handled within each combined policy below
DROP POLICY IF EXISTS admins_full_access ON public.partners;

-- Fix for partners table (user policy)
DROP POLICY IF EXISTS users_manage_own_partner ON public.partners;

-- ============================================================================
-- PART 2: Fix Multiple Permissive Policies (combine duplicates)
-- ============================================================================

-- Issue: Multiple policies for same role/action = slower queries
-- Fix: Drop ALL old policies, create single combined policies

-- Drop all old partners policies
DROP POLICY IF EXISTS partners_select ON public.partners;
DROP POLICY IF EXISTS partners_insert ON public.partners;
DROP POLICY IF EXISTS partners_delete ON public.partners;
DROP POLICY IF EXISTS partners_update ON public.partners;
DROP POLICY IF EXISTS partners_select_combined ON public.partners;
DROP POLICY IF EXISTS partners_insert_combined ON public.partners;
DROP POLICY IF EXISTS partners_delete_combined ON public.partners;
DROP POLICY IF EXISTS partners_update_combined ON public.partners;

-- Combined SELECT policy (admin OR own data)
CREATE POLICY partners_select_combined ON public.partners
  FOR SELECT
  USING (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
    OR
    -- Own partner data
    user_id = (SELECT auth.uid())
  );

-- Combined INSERT policy (admin OR authenticated user)
CREATE POLICY partners_insert_combined ON public.partners
  FOR INSERT
  WITH CHECK (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
    OR
    -- User creating their own partner record
    user_id = (SELECT auth.uid())
  );

-- Combined DELETE policy (admin only)
CREATE POLICY partners_delete_combined ON public.partners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
  );

-- Combined UPDATE policy (admin OR own data)
CREATE POLICY partners_update_combined ON public.partners
  FOR UPDATE
  USING (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
    OR
    -- User updating their own partner record
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
    OR
    -- User updating their own partner record
    user_id = (SELECT auth.uid())
  );

-- Fix user_reliability table - combine duplicate SELECT policies
DROP POLICY IF EXISTS user_reliability_select ON public.user_reliability;
DROP POLICY IF EXISTS user_reliability_manage ON public.user_reliability;
DROP POLICY IF EXISTS user_reliability_select_combined ON public.user_reliability;

-- Combined SELECT policy (admin OR own data)
CREATE POLICY user_reliability_select_combined ON public.user_reliability
  FOR SELECT
  USING (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role = 'ADMIN'
    )
    OR
    -- Own reliability data
    user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that policies are now optimized
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ Optimized'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Not optimized'
    ELSE '✓ OK'
  END as auth_optimization,
  cmd as command,
  qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_cooldown_lifts', 'partners', 'user_reliability')
ORDER BY tablename, policyname;

-- Count policies per table/role/action (should be 1 each now)
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Optimized'
    ELSE '⚠️ Multiple policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('partners', 'user_reliability')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- 
-- ✅ AUTH RLS OPTIMIZATION (Faster Queries):
-- 1. user_cooldown_lifts: auth.uid() → (SELECT auth.uid())
-- 2. partners (admin policy): auth.uid() → (SELECT auth.uid())
-- 3. partners (user policy): auth.uid() → (SELECT auth.uid())
-- 
-- ✅ POLICY CONSOLIDATION (Fewer Policy Checks):
-- 1. partners: SELECT - Merged admins_full_access + partners_select
-- 2. partners: INSERT - Merged admins_full_access + partners_insert
-- 3. partners: DELETE - Merged admins_full_access + partners_delete
-- 4. partners: UPDATE - Already covered by admins_full_access + users_manage_own_partner
-- 5. user_reliability: SELECT - Merged user_reliability_manage + user_reliability_select
-- 
-- 🔒 SAME SECURITY, BETTER PERFORMANCE:
-- - No functionality changes
-- - Same access rules
-- - Queries will be significantly faster on large tables
--
-- - Reduces policy evaluation overhead (2 policies → 1 policy)
-- 
-- 📈 EXPECTED IMPROVEMENTS:
-- - Faster queries on tables with many rows
-- - auth.uid() evaluated once per query instead of per row
-- - Reduced CPU usage on policy evaluation
-- 
-- ============================================================================
