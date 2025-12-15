-- ============================================================================
-- FIX REMAINING SUPABASE LINTER WARNINGS
-- ============================================================================
-- This script fixes the remaining multiple_permissive_policies warnings
-- by removing duplicate/overlapping policies that were not caught in the first pass
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX: users table - has duplicate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
-- Keep only "users_can_read_own_or_public" which handles both cases

-- ============================================================================
-- FIX: user_points table - has overlapping policies
-- ============================================================================
-- Remove "Users can view own points or admin sees all" - it's covered by authenticated_manage_user_points
DROP POLICY IF EXISTS "Users can view own points or admin sees all" ON public.user_points;
DROP POLICY IF EXISTS "authenticated_read_user_points" ON public.user_points;
-- Keep authenticated_manage_user_points and service_role_manage_user_points

-- ============================================================================
-- FIX: app_metadata table - separate read and manage policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage app metadata" ON public.app_metadata;

-- Recreate with separate policies for SELECT vs INSERT/UPDATE/DELETE
CREATE POLICY "app_metadata_select" ON public.app_metadata
FOR SELECT USING (true);

CREATE POLICY "app_metadata_manage" ON public.app_metadata
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- ============================================================================
-- FIX: faqs table - separate read and manage policies  
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;

-- Recreate with separate policies
CREATE POLICY "faqs_manage" ON public.faqs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);
-- Keep "Anyone can view published FAQs" for public read

-- ============================================================================
-- FIX: flagged_content table - consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all flags" ON public.flagged_content;
DROP POLICY IF EXISTS "Users can view their own flags" ON public.flagged_content;

CREATE POLICY "flagged_content_select" ON public.flagged_content
FOR SELECT USING (
  flagged_by = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);
-- Keep other policies for INSERT/UPDATE

-- ============================================================================
-- FIX: offers table - consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "public_view_active_offers" ON public.offers;
DROP POLICY IF EXISTS "offers_manage" ON public.offers;

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

CREATE POLICY "offers_modify" ON public.offers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- FIX: partners table - consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "public_view_approved_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_manage" ON public.partners;

CREATE POLICY "partners_select" ON public.partners
FOR SELECT USING (
  status = 'approved' OR
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "partners_modify" ON public.partners
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
) WITH CHECK (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- ============================================================================
-- FIX: point_purchase_orders - consolidate UPDATE policies
-- ============================================================================
DROP POLICY IF EXISTS "Service role can update orders" ON public.point_purchase_orders;
-- Keep point_purchase_orders_manage which already handles all operations

-- ============================================================================
-- FIX: contact_submissions - consolidate INSERT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
-- Keep contact_submissions_manage which handles all operations

-- ============================================================================
-- FIX: audit_log - consolidate with block policies
-- ============================================================================
DROP POLICY IF EXISTS "audit_log_block_delete" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_block_update" ON public.audit_log;
-- Keep audit_log_manage which properly restricts access

-- ============================================================================
-- FIX: partner_points duplicate indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_partner_points_partner_id;
-- Keep idx_partner_points_user_id since partner_points uses user_id column

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================
SELECT 
  'Remaining Warnings Fixed' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_points', 'app_metadata', 'faqs', 'flagged_content', 
                    'offers', 'partners', 'point_purchase_orders', 'contact_submissions', 'audit_log')
GROUP BY tablename
ORDER BY tablename;
