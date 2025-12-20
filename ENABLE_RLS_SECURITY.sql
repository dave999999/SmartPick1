-- ============================================================================
-- Fix Supabase RLS Security Warnings
-- Date: 2024-12-21
-- Description: Enable Row Level Security on tables missing RLS
-- Safe: Only adds security restrictions, doesn't modify data
-- ============================================================================

-- ============================================================================
-- NOTE: spatial_ref_sys is a PostGIS system table
-- We can't modify it (requires superuser). This is safe to ignore.
-- Supabase manages PostGIS tables - the warning can be ignored.
-- ============================================================================

-- ============================================================================
-- 1. PARTNER_POINTS (Balance Table)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.partner_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
DROP POLICY IF EXISTS "service_role_full_access_points" ON public.partner_points;

-- Partners can view their own points
CREATE POLICY "partners_view_own_points"
ON public.partner_points
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Service role has full access (needed for backend functions)
CREATE POLICY "service_role_full_access_points"
ON public.partner_points
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Functions with SECURITY DEFINER automatically bypass RLS
-- No additional policy needed

-- ============================================================================
-- 2. PARTNER_POINT_TRANSACTIONS (Transaction History)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.partner_point_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
DROP POLICY IF EXISTS "service_role_full_access_transactions" ON public.partner_point_transactions;

-- Partners can view their own transactions
-- NOTE: This table uses 'partner_id' column, not 'user_id'
CREATE POLICY "partners_view_own_transactions"
ON public.partner_point_transactions
FOR SELECT
TO authenticated
USING (
  partner_id = auth.uid()
);

-- Service role has full access
CREATE POLICY "service_role_full_access_transactions"
ON public.partner_point_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. VERIFY PERMISSIONS ARE CORRECT
-- ============================================================================

-- Revoke excessive permissions if any
REVOKE ALL ON public.partner_points FROM authenticated;
REVOKE ALL ON public.partner_point_transactions FROM authenticated;

-- Grant only SELECT (RLS policies control what they can see)
GRANT SELECT ON public.partner_points TO authenticated;
GRANT SELECT ON public.partner_point_transactions TO authenticated;

-- Service role keeps full access
GRANT ALL ON public.partner_points TO service_role;
GRANT ALL ON public.partner_point_transactions TO service_role;

-- ============================================================================
-- 4. VERIFY RLS IS ENABLED
-- ============================================================================

DO $$
DECLARE
  points_rls boolean;
  trans_rls boolean;
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO points_rls
  FROM pg_class
  WHERE relname = 'partner_points';
  
  SELECT relrowsecurity INTO trans_rls
  FROM pg_class
  WHERE relname = 'partner_point_transactions';
  
  -- Verify all enabled
  IF NOT points_rls THEN
    RAISE EXCEPTION 'CRITICAL: RLS not enabled on partner_points!';
  ELSE
    RAISE NOTICE '✅ RLS enabled on partner_points';
  END IF;
  
  IF NOT trans_rls THEN
    RAISE EXCEPTION 'CRITICAL: RLS not enabled on partner_point_transactions!';
  ELSE
    RAISE NOTICE '✅ RLS enabled on partner_point_transactions';
  END IF;
  
  RAISE NOTICE '✅ All RLS security enabled successfully!';
  RAISE NOTICE '✅ Partners can only see their own data';
  RAISE NOTICE '✅ Service role maintains full access for backend functions';
  RAISE NOTICE 'ℹ️  Note: spatial_ref_sys is a PostGIS system table managed by Supabase';
END $$;

-- ============================================================================
-- 5. TEST QUERIES (for verification)
-- ============================================================================

-- Show current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('partner_points', 'partner_point_transactions')
ORDER BY tablename;

-- Show policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('partner_points', 'partner_point_transactions')
ORDER BY tablename, policyname;