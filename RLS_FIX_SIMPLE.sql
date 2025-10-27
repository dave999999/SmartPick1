-- ============================================================================
-- SIMPLE FIX FOR 403 ERROR - COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- ============================================================================
-- Go to: https://***REMOVED_PROJECT_ID***.supabase.co/project/***REMOVED_PROJECT_ID***/sql/new
-- Then paste this entire script and click RUN
-- ============================================================================

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "partners_can_create_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_view_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "anyone_can_view_public_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_update_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_delete_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can view own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can create offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON public.offers;

-- Create new policies
CREATE POLICY "Partners can create offers" ON public.offers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = partner_id AND partners.user_id = auth.uid() AND partners.status = 'APPROVED'));

CREATE POLICY "Partners can view own offers" ON public.offers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

CREATE POLICY "Partners can update own offers" ON public.offers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Partners can delete own offers" ON public.offers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()));

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'offers';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'offers';
