-- =====================================================
-- ROLLBACK: Restore Original RLS Policies
-- =====================================================
-- This restores the original policies that were working
-- Run this in Supabase SQL Editor to fix everything
-- =====================================================

-- Drop the policies we just created
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can read all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can read all offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can read all partners" ON public.partners;

-- Restore original working policies

-- Users table
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can select all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Reservations table
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Partners can view their reservations"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers
      JOIN public.partners ON partners.id = offers.partner_id
      WHERE offers.id = reservations.offer_id
      AND partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reservations"
  ON public.reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Offers table
CREATE POLICY "Anyone can view active offers"
  ON public.offers FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "Partners can manage own offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.id = offers.partner_id
      AND partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Partners table
CREATE POLICY "Anyone can view approved partners"
  ON public.partners FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "Partners can view own profile"
  ON public.partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Partners can update own profile"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all partners"
  ON public.partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this:
-- 1. Refresh homepage - should show offers
-- 2. Admin dashboard should work
-- =====================================================
