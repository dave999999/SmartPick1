-- ============================================================================
-- CRITICAL SECURITY FIX: Enable RLS on Partner Points Tables
-- Date: 2025-11-23
-- Description: Re-enable Row Level Security on partner_points and 
--              partner_point_transactions with proper policies
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE RLS
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.partner_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP OLD POLICIES (if any exist)
-- ============================================================================

DROP POLICY IF EXISTS "Partners view own points" ON public.partner_points;
DROP POLICY IF EXISTS "Partners view own transactions" ON public.partner_point_transactions;
DROP POLICY IF EXISTS "Service role full access" ON public.partner_points;
DROP POLICY IF EXISTS "Allow functions to modify" ON public.partner_points;
DROP POLICY IF EXISTS "Users can view own partner points" ON public.partner_points;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.partner_point_transactions;
DROP POLICY IF EXISTS "Service role manages points" ON public.partner_points;
DROP POLICY IF EXISTS "Service role manages transactions" ON public.partner_point_transactions;

-- ============================================================================
-- STEP 3: CREATE SECURE RLS POLICIES
-- ============================================================================

-- Partner Points Policies
-- ----------------------

-- 1. Partners can view their own points
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
CREATE POLICY "partners_view_own_points"
ON public.partner_points
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Service role has full access (for backend functions)
DROP POLICY IF EXISTS "service_role_full_access_points" ON public.partner_points;
CREATE POLICY "service_role_full_access_points"
ON public.partner_points
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Allow database functions to modify (SECURITY DEFINER functions)
-- Functions run as the definer (service_role), so they bypass RLS automatically
-- No additional policy needed for functions

-- Partner Point Transactions Policies
-- ----------------------------------

-- 1. Partners can view their own transactions
-- NOTE: Column is named 'partner_id' in this table, not 'user_id'
DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
CREATE POLICY "partners_view_own_transactions"
ON public.partner_point_transactions
FOR SELECT
TO authenticated
USING (partner_id = auth.uid());

-- 2. Service role has full access
DROP POLICY IF EXISTS "service_role_full_access_transactions" ON public.partner_point_transactions;
CREATE POLICY "service_role_full_access_transactions"
ON public.partner_point_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 4: REVOKE OVERLY PERMISSIVE GRANTS
-- ============================================================================

-- Remove ALL access from authenticated users
REVOKE ALL ON public.partner_points FROM authenticated;
REVOKE ALL ON public.partner_point_transactions FROM authenticated;

-- Grant only SELECT (RLS policies will control what they can see)
GRANT SELECT ON public.partner_points TO authenticated;
GRANT SELECT ON public.partner_point_transactions TO authenticated;

-- Keep service role with full access (needed for functions)
GRANT ALL ON public.partner_points TO service_role;
GRANT ALL ON public.partner_point_transactions TO service_role;

-- ============================================================================
-- STEP 5: VERIFY SECURITY
-- ============================================================================

DO $$
DECLARE
  points_rls_enabled boolean;
  trans_rls_enabled boolean;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO points_rls_enabled
  FROM pg_class
  WHERE relname = 'partner_points';
  
  SELECT relrowsecurity INTO trans_rls_enabled
  FROM pg_class
  WHERE relname = 'partner_point_transactions';
  
  IF NOT points_rls_enabled THEN
    RAISE EXCEPTION 'SECURITY ERROR: RLS not enabled on partner_points!';
  END IF;
  
  IF NOT trans_rls_enabled THEN
    RAISE EXCEPTION 'SECURITY ERROR: RLS not enabled on partner_point_transactions!';
  END IF;
  
  RAISE NOTICE '✅ Row Level Security successfully enabled on partner points tables';
  RAISE NOTICE '✅ Secure policies created for user_id = auth.uid()';
  RAISE NOTICE '✅ Service role maintains full access for backend functions';
END $$;
