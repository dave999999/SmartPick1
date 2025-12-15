-- ============================================================================
-- FIX FINAL SUPABASE LINTER WARNINGS
-- ============================================================================
-- This script fixes the remaining policy overlaps by changing FOR ALL policies
-- to only cover INSERT/UPDATE/DELETE, leaving SELECT to dedicated policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX: app_metadata - Remove "Anyone can read app metadata" and keep only one SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can read app metadata" ON public.app_metadata;
DROP POLICY IF EXISTS "app_metadata_select" ON public.app_metadata;
DROP POLICY IF EXISTS "app_metadata_manage" ON public.app_metadata;

-- Single SELECT policy
CREATE POLICY "app_metadata_select" ON public.app_metadata
FOR SELECT USING (true);

-- Separate INSERT/UPDATE/DELETE policies for admins
CREATE POLICY "app_metadata_insert" ON public.app_metadata
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "app_metadata_update" ON public.app_metadata
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "app_metadata_delete" ON public.app_metadata
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- ============================================================================
-- FIX: faqs - Remove overlapping policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published FAQs" ON public.faqs;
DROP POLICY IF EXISTS "faqs_manage" ON public.faqs;

-- Single SELECT policy
CREATE POLICY "faqs_select" ON public.faqs
FOR SELECT USING (
  is_published = true OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- Separate INSERT/UPDATE/DELETE policies for admins
CREATE POLICY "faqs_insert" ON public.faqs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "faqs_update" ON public.faqs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "faqs_delete" ON public.faqs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- ============================================================================
-- FIX: offers - Remove FOR ALL from offers_modify
-- ============================================================================
DROP POLICY IF EXISTS "offers_select" ON public.offers;
DROP POLICY IF EXISTS "offers_modify" ON public.offers;

-- Keep SELECT separate
CREATE POLICY "offers_select" ON public.offers
FOR SELECT USING (
  (status = 'active' AND is_flagged = false) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- Split INSERT/UPDATE/DELETE
CREATE POLICY "offers_insert" ON public.offers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "offers_update" ON public.offers
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "offers_delete" ON public.offers
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- FIX: partners - Remove FOR ALL from partners_modify
-- ============================================================================
DROP POLICY IF EXISTS "partners_select" ON public.partners;
DROP POLICY IF EXISTS "partners_modify" ON public.partners;

-- Keep SELECT separate
CREATE POLICY "partners_select" ON public.partners
FOR SELECT USING (
  status = 'approved' OR
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- Split INSERT/UPDATE/DELETE
CREATE POLICY "partners_insert" ON public.partners
FOR INSERT WITH CHECK (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "partners_update" ON public.partners
FOR UPDATE USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "partners_delete" ON public.partners
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- ============================================================================
-- FIX: user_points - Split FOR ALL policies into separate ones
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_manage_user_points" ON public.user_points;
DROP POLICY IF EXISTS "service_role_manage_user_points" ON public.user_points;

-- SELECT policy
CREATE POLICY "user_points_select" ON public.user_points
FOR SELECT USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'partner')
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- INSERT policy
CREATE POLICY "user_points_insert" ON public.user_points
FOR INSERT WITH CHECK (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'partner')
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- UPDATE policy
CREATE POLICY "user_points_update" ON public.user_points
FOR UPDATE USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'partner')
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- DELETE policy
CREATE POLICY "user_points_delete" ON public.user_points
FOR DELETE USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'partner')
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================
SELECT 
  'Final Warnings Fixed' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('app_metadata', 'faqs', 'offers', 'partners', 'user_points')
ORDER BY tablename, cmd, policyname;
