-- =====================================================
-- COMPREHENSIVE RLS POLICY CLEANUP
-- =====================================================
-- This removes ALL policies and recreates only the essential ones
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Remove ALL existing policies
-- =====================================================

-- Offers table - remove all policies
DROP POLICY IF EXISTS "Admins can manage all offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can manage own offers" ON public.offers;
DROP POLICY IF EXISTS "admins_manage_all_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_delete_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_insert_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_manage_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_read_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_update_own_offers" ON public.offers;
DROP POLICY IF EXISTS "public_read_active_offers" ON public.offers;
DROP POLICY IF EXISTS "service_role_all_offers" ON public.offers;

-- Partners table - remove all policies
DROP POLICY IF EXISTS "Admins can manage all partners" ON public.partners;
DROP POLICY IF EXISTS "Anyone can view approved partners" ON public.partners;
DROP POLICY IF EXISTS "Partners can update own profile" ON public.partners;
DROP POLICY IF EXISTS "Partners can view own profile" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_all_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_read_own_profile" ON public.partners;
DROP POLICY IF EXISTS "partners_update_own_profile" ON public.partners;
DROP POLICY IF EXISTS "public_read_approved_partners" ON public.partners;
DROP POLICY IF EXISTS "service_role_all_partners" ON public.partners;
DROP POLICY IF EXISTS "users_create_partner_application" ON public.partners;
DROP POLICY IF EXISTS "users_manage_own_partner_profile" ON public.partners;
DROP POLICY IF EXISTS "users_read_own_partner_profile" ON public.partners;

-- Reservations table - remove all policies
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners can view their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can request forgiveness for their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert_customer" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_customer" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_partner" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update_customer" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update_partner" ON public.reservations;

-- Users table - remove all policies
DROP POLICY IF EXISTS "Admins can select all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- =====================================================
-- STEP 2: Create clean, minimal policies
-- =====================================================

-- USERS TABLE
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "admins_read_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- OFFERS TABLE (CRITICAL FOR HOMEPAGE)
CREATE POLICY "public_view_active_offers"
  ON public.offers FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "partners_manage_own_offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = offers.partner_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- PARTNERS TABLE
CREATE POLICY "public_view_approved_partners"
  ON public.partners FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "partners_view_own"
  ON public.partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "partners_update_own"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "users_create_partner"
  ON public.partners FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_manage_partners"
  ON public.partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- RESERVATIONS TABLE
CREATE POLICY "users_view_own_reservations"
  ON public.reservations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_create_reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_reservations"
  ON public.reservations FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "partners_view_their_reservations"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.partners p ON p.id = o.partner_id
      WHERE o.id = reservations.offer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "partners_update_their_reservations"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.partners p ON p.id = o.partner_id
      WHERE o.id = reservations.offer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_reservations"
  ON public.reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, verify with:
-- SELECT tablename, policyname, cmd FROM pg_policies 
-- WHERE schemaname = 'public' ORDER BY tablename, policyname;
-- =====================================================
