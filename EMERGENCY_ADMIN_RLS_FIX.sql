-- =====================================================
-- EMERGENCY FIX: Admin RLS Policies
-- =====================================================
-- This allows admins to SELECT from all tables
-- Run this in Supabase SQL Editor NOW
-- =====================================================

-- Users table - Admin can select all
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Reservations table - Admin can select all
DROP POLICY IF EXISTS "Admins can read all reservations" ON public.reservations;
CREATE POLICY "Admins can read all reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Offers table - Admin can select all
DROP POLICY IF EXISTS "Admins can read all offers" ON public.offers;
CREATE POLICY "Admins can read all offers"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Partners table - Admin can select all
DROP POLICY IF EXISTS "Admins can read all partners" ON public.partners;
CREATE POLICY "Admins can read all partners"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Point purchases table - Admin can select all (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'point_purchases') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all purchases" ON public.point_purchases';
    EXECUTE 'CREATE POLICY "Admins can read all purchases"
      ON public.point_purchases
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = ''ADMIN''
        )
      )';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, test with these queries as admin:
-- SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER';
-- SELECT COUNT(*) FROM reservations;
-- SELECT COUNT(*) FROM offers;
-- =====================================================
