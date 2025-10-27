-- ============================================================================
-- SmartPick Database Setup - STEP 2: ROW LEVEL SECURITY
-- ============================================================================
-- Run this ONLY AFTER Step 1 is complete and verified
-- Make sure all 4 tables exist before running this script
-- Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PARTNERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Public can view approved partners" ON public.partners;
CREATE POLICY "Public can view approved partners" ON public.partners
  FOR SELECT 
  USING (status = 'APPROVED');

DROP POLICY IF EXISTS "Users can view own partner profile" ON public.partners;
CREATE POLICY "Users can view own partner profile" ON public.partners
  FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create partner application" ON public.partners;
CREATE POLICY "Users can create partner application" ON public.partners
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own partner profile" ON public.partners;
CREATE POLICY "Users can update own partner profile" ON public.partners
  FOR UPDATE 
  USING (user_id = auth.uid());

-- ============================================================================
-- OFFERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers" ON public.offers
  FOR SELECT 
  USING (status = 'ACTIVE' AND expires_at > NOW());

DROP POLICY IF EXISTS "Partners can view own offers" ON public.offers;
CREATE POLICY "Partners can view own offers" ON public.offers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = offers.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners can create offers" ON public.offers;
CREATE POLICY "Partners can create offers" ON public.offers
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = partner_id 
      AND partners.user_id = auth.uid() 
      AND partners.status = 'APPROVED'
    )
  );

DROP POLICY IF EXISTS "Partners can update own offers" ON public.offers;
CREATE POLICY "Partners can update own offers" ON public.offers
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = offers.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners can delete own offers" ON public.offers;
CREATE POLICY "Partners can delete own offers" ON public.offers
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = offers.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RESERVATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations
  FOR SELECT 
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Partners can view their reservations" ON public.reservations;
CREATE POLICY "Partners can view their reservations" ON public.reservations
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = reservations.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
CREATE POLICY "Users can create reservations" ON public.reservations
  FOR INSERT 
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
CREATE POLICY "Users can update own reservations" ON public.reservations
  FOR UPDATE 
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update their reservations" ON public.reservations;
CREATE POLICY "Partners can update their reservations" ON public.reservations
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.partners 
      WHERE partners.id = reservations.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 2 COMPLETE!
-- ============================================================================
-- Verify RLS is enabled by running:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 
-- All tables should show rowsecurity = true
-- 
-- If RLS is enabled on all tables, proceed to STEP 3 (supabase-step3-storage.sql)
-- ============================================================================