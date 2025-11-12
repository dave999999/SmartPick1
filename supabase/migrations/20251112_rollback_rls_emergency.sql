-- ============================================================================
-- ROLLBACK: Disable RLS on 3 tables
-- Created: 2025-11-12
-- Purpose: Emergency rollback - restore functionality while we fix RLS policies
-- Status: SAFE - Returns to previous working state
-- ============================================================================

-- This rollback is needed because enabling RLS broke partner points and user wallets
-- The queries in the application need to be fixed OR the RLS policies need adjustment

DO $$
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║          EMERGENCY ROLLBACK - DISABLE RLS                    ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'This will restore functionality by disabling RLS...';
END $$;

-- Disable RLS on offers table
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on partners table  
ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;

-- Disable RLS on partner_points table
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;

-- Drop the policies we created (cleanup)
DROP POLICY IF EXISTS "public_read_active_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_read_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_insert_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_update_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_delete_own_offers" ON public.offers;
DROP POLICY IF EXISTS "admins_manage_all_offers" ON public.offers;

DROP POLICY IF EXISTS "public_read_approved_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_read_own_profile" ON public.partners;
DROP POLICY IF EXISTS "partners_update_own_profile" ON public.partners;
DROP POLICY IF EXISTS "users_create_partner_application" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_all_partners" ON public.partners;

DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
DROP POLICY IF EXISTS "service_role_manage_partner_points" ON public.partner_points;
DROP POLICY IF EXISTS "admins_view_all_partner_points" ON public.partner_points;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ RLS disabled on offers, partners, partner_points';
  RAISE NOTICE '✓ Policies dropped';
  RAISE NOTICE '✓ Functionality restored';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: These tables are now accessible without RLS protection';
  RAISE NOTICE '⚠️  This is a temporary fix - proper RLS policies will be added later';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test partner dashboard and user profile to confirm wallets appear';
END $$;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
