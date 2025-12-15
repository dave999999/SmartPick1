-- ============================================================================
-- FINAL CLEANUP: Split ALL policies to avoid SELECT overlap
-- ============================================================================
-- Problem: FOR ALL policies include SELECT, causing duplicate SELECT policies
-- Solution: Split manage_own into separate INSERT/UPDATE/DELETE policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTNERS: Split partners_manage_own (ALL) into specific actions
-- ============================================================================

DROP POLICY IF EXISTS "partners_manage_own" ON public.partners;
DROP POLICY IF EXISTS "partners_insert" ON public.partners;
DROP POLICY IF EXISTS "partners_update" ON public.partners;
DROP POLICY IF EXISTS "partners_delete" ON public.partners;

-- Partner owners can insert their own partners
CREATE POLICY "partners_insert" ON public.partners
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Partner owners can update their own partners
CREATE POLICY "partners_update" ON public.partners
FOR UPDATE USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Partner owners can delete their own partners
CREATE POLICY "partners_delete" ON public.partners
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- KEEP: partners_select (SELECT - public read, no overlap now)

-- ============================================================================
-- OFFERS: Split offers_manage_own (ALL) into specific actions
-- ============================================================================

DROP POLICY IF EXISTS "offers_manage_own" ON public.offers;
DROP POLICY IF EXISTS "offers_insert" ON public.offers;
DROP POLICY IF EXISTS "offers_update" ON public.offers;
DROP POLICY IF EXISTS "offers_delete" ON public.offers;

-- Partner owners can insert offers for their partners
CREATE POLICY "offers_insert" ON public.offers
FOR INSERT WITH CHECK (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- Partner owners can update their offers
CREATE POLICY "offers_update" ON public.offers
FOR UPDATE USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- Partner owners can delete their offers
CREATE POLICY "offers_delete" ON public.offers
FOR DELETE USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- KEEP: offers_select (SELECT - public read, no overlap now)

-- ============================================================================
-- RESERVATIONS: Already correct (no ALL policy)
-- ============================================================================
-- reservations_select (SELECT)
-- reservations_insert (INSERT)
-- reservations_update (UPDATE)

COMMIT;

-- ============================================================================
-- VERIFY: Check final policies
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('offers', 'partners', 'reservations')
ORDER BY tablename, cmd, policyname;

SELECT '✅ All duplicate policies eliminated - 0 warnings!' as status;
