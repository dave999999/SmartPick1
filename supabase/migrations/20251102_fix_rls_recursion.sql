-- FIX: Remove infinite recursion in RLS policies
-- The problem: Policies were checking users table from within users table policies
-- The solution: Use auth.jwt() claims or create a helper function

-- ============================================================================
-- STEP 1: Drop all existing policies (they have recursion issues)
-- ============================================================================

-- Drop users policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Drop partners policies
DROP POLICY IF EXISTS "Anyone can read approved partners" ON partners;
DROP POLICY IF EXISTS "Partners can read own profile" ON partners;
DROP POLICY IF EXISTS "Partners can update own profile" ON partners;
DROP POLICY IF EXISTS "Authenticated users can create partner application" ON partners;
DROP POLICY IF EXISTS "Admins can read all partners" ON partners;
DROP POLICY IF EXISTS "Admins can update any partner" ON partners;
DROP POLICY IF EXISTS "Admins can delete partners" ON partners;

-- Drop offers policies
DROP POLICY IF EXISTS "Anyone can read active offers" ON offers;
DROP POLICY IF EXISTS "Partners can read own offers" ON offers;
DROP POLICY IF EXISTS "Approved partners can create offers" ON offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON offers;
DROP POLICY IF EXISTS "Admins can manage all offers" ON offers;

-- Drop reservations policies
DROP POLICY IF EXISTS "Customers can read own reservations" ON reservations;
DROP POLICY IF EXISTS "Partners can read own reservations" ON reservations;
DROP POLICY IF EXISTS "Customers can create reservations" ON reservations;
DROP POLICY IF EXISTS "Customers can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Partners can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;

-- ============================================================================
-- STEP 2: Create helper function to check admin role (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ============================================================================
-- STEP 3: Recreate policies WITHOUT recursion
-- ============================================================================

-- =============================================================================
-- USERS TABLE POLICIES (FIXED)
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users (using helper function - NO RECURSION)
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile (except role and status)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    (status IS NULL OR status = (SELECT status FROM users WHERE id = auth.uid()))
  );

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (public.is_admin());

-- Admins can delete users
CREATE POLICY "Admins can delete any user"
  ON users FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- PARTNERS TABLE POLICIES (FIXED)
-- =============================================================================

-- Anyone (even non-authenticated) can read approved partners
CREATE POLICY "Anyone can read approved partners"
  ON partners FOR SELECT
  USING (status = 'APPROVED');

-- Partners can read their own profile (regardless of status)
CREATE POLICY "Partners can read own profile"
  ON partners FOR SELECT
  USING (auth.uid() = user_id);

-- Partners can update their own profile (except status)
CREATE POLICY "Partners can update own profile"
  ON partners FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (status = (SELECT status FROM partners WHERE user_id = auth.uid()) OR public.is_admin())
  );

-- Authenticated users can create partner applications
CREATE POLICY "Authenticated users can create partner application"
  ON partners FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'PENDING'
  );

-- Admins can read all partners
CREATE POLICY "Admins can read all partners"
  ON partners FOR SELECT
  USING (public.is_admin());

-- Admins can update any partner
CREATE POLICY "Admins can update any partner"
  ON partners FOR UPDATE
  USING (public.is_admin());

-- Admins can delete partners
CREATE POLICY "Admins can delete partners"
  ON partners FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- OFFERS TABLE POLICIES (FIXED)
-- =============================================================================

-- Anyone can read active offers from approved partners
CREATE POLICY "Anyone can read active offers"
  ON offers FOR SELECT
  USING (
    status IN ('ACTIVE', 'SOLD_OUT', 'EXPIRED') AND
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = offers.partner_id AND partners.status = 'APPROVED'
    )
  );

-- Partners can read their own offers (regardless of status)
CREATE POLICY "Partners can read own offers"
  ON offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()
    )
  );

-- Approved partners can create offers
CREATE POLICY "Approved partners can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = partner_id
        AND partners.user_id = auth.uid()
        AND partners.status = 'APPROVED'
    )
  );

-- Partners can update their own offers
CREATE POLICY "Partners can update own offers"
  ON offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()
    )
  );

-- Partners can delete their own offers
CREATE POLICY "Partners can delete own offers"
  ON offers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()
    )
  );

-- Admins can do anything with offers
CREATE POLICY "Admins can manage all offers"
  ON offers FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- RESERVATIONS TABLE POLICIES (FIXED)
-- =============================================================================

-- Customers can read their own reservations
CREATE POLICY "Customers can read own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = customer_id);

-- Partners can read reservations for their offers
CREATE POLICY "Partners can read own reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = reservations.partner_id AND partners.user_id = auth.uid()
    )
  );

-- Customers can create reservations
CREATE POLICY "Customers can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own active reservations (for cancellation)
CREATE POLICY "Customers can update own reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = customer_id AND status = 'ACTIVE')
  WITH CHECK (auth.uid() = customer_id);

-- Partners can update reservations for their offers (for pickup confirmation)
CREATE POLICY "Partners can update own reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = reservations.partner_id AND partners.user_id = auth.uid()
    )
  );

-- Admins can do anything with reservations
CREATE POLICY "Admins can manage all reservations"
  ON reservations FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute on helper function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_admin IS 'Helper function to check if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON TABLE users IS 'RLS enabled (FIXED): uses helper function to prevent recursion';
COMMENT ON TABLE partners IS 'RLS enabled (FIXED): uses helper function to prevent recursion';
COMMENT ON TABLE offers IS 'RLS enabled (FIXED): uses helper function to prevent recursion';
COMMENT ON TABLE reservations IS 'RLS enabled (FIXED): uses helper function to prevent recursion';
