-- CRITICAL: Add Row Level Security policies to protect all tables
-- This migration MUST be applied immediately to production

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role and status)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid()) AND -- Cannot change own role
    (status IS NULL OR status = (SELECT status FROM users WHERE id = auth.uid())) -- Cannot change own status
  );

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- PARTNERS TABLE POLICIES
-- =============================================================================

-- Anyone can read approved partners (for public display)
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
    status = (SELECT status FROM partners WHERE user_id = auth.uid()) -- Cannot change own status
  );

-- Authenticated users can insert partner applications
CREATE POLICY "Authenticated users can create partner application"
  ON partners FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'PENDING' -- New applications must start as PENDING
  );

-- Admins can read all partners
CREATE POLICY "Admins can read all partners"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update any partner
CREATE POLICY "Admins can update any partner"
  ON partners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can delete partners
CREATE POLICY "Admins can delete partners"
  ON partners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- OFFERS TABLE POLICIES
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

-- Partners can insert their own offers (only if approved)
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
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- RESERVATIONS TABLE POLICIES
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
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add indexes to speed up policy checks
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'ADMIN';
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_offers_partner_id ON partners(id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_partner_id ON reservations(partner_id);

COMMENT ON TABLE users IS 'RLS enabled: users can read/update own profile, admins can manage all';
COMMENT ON TABLE partners IS 'RLS enabled: public can read approved partners, owners can manage own, admins can manage all';
COMMENT ON TABLE offers IS 'RLS enabled: public can read active offers, partners can manage own, admins can manage all';
COMMENT ON TABLE reservations IS 'RLS enabled: customers and partners can see their own, admins can manage all';
