-- =====================================================
-- Fix Partner Points RLS for Admin Slot Grants
-- =====================================================
-- Allow admins to update partner_points
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS admin_full_access_partner_points ON partner_points;
DROP POLICY IF EXISTS partners_read_own_points ON partner_points;
DROP POLICY IF EXISTS partners_cannot_modify_points ON partner_points;

-- Enable RLS if not already enabled
ALTER TABLE partner_points ENABLE ROW LEVEL SECURITY;

-- Admin full access to partner_points
CREATE POLICY admin_full_access_partner_points ON partner_points
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Partners can read their own points
CREATE POLICY partners_read_own_points ON partner_points
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role has full access
CREATE POLICY service_role_partner_points ON partner_points
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE partner_points IS 'Partner points and slot management - admins can modify';
