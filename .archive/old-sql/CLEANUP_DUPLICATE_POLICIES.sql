-- ============================================================================
-- CLEANUP: Remove Duplicate Policies
-- ============================================================================
-- Problem: Multiple permissive policies on same table/action cause 40 warnings
-- Solution: Remove old duplicate policies, keep only the new consolidated ones
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTNERS: Remove duplicate INSERT/UPDATE/DELETE policies
-- ============================================================================
-- We have partners_manage_own (ALL) which covers INSERT/UPDATE/DELETE
-- So we can remove the individual policies

DROP POLICY IF EXISTS "partners_insert" ON public.partners;
DROP POLICY IF EXISTS "partners_update" ON public.partners;
DROP POLICY IF EXISTS "partners_delete" ON public.partners;

-- KEEP: partners_select (SELECT - public read)
-- KEEP: partners_manage_own (ALL - partner owners manage their own)

-- ============================================================================
-- RESERVATIONS: Remove old ALL policy and duplicate INSERT
-- ============================================================================
-- We have specific policies for INSERT/SELECT/UPDATE
-- So we can remove the old ALL policy

DROP POLICY IF EXISTS "reservations_manage" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;

-- KEEP: reservations_select (SELECT)
-- KEEP: reservations_update (UPDATE)
-- Need to recreate INSERT since we dropped the duplicate:

CREATE POLICY "reservations_insert" ON public.reservations
FOR INSERT WITH CHECK (customer_id = (SELECT auth.uid()));

-- ============================================================================
-- OFFERS: Already clean, no changes needed
-- ============================================================================
-- offers_select (SELECT - public read)
-- offers_manage_own (ALL - partner owners manage their offers)

COMMIT;

-- ============================================================================
-- VERIFY: Check remaining policies
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('offers', 'partners', 'reservations')
ORDER BY tablename, cmd, policyname;

SELECT '✅ Duplicate policies cleaned up - 40 warnings should be gone!' as status;
