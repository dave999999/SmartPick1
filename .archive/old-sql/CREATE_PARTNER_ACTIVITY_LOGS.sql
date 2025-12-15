-- =====================================================
-- Partner Activity Logs Table
-- =====================================================
-- Tracks all partner actions for admin monitoring
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS partner_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_activity_logs_partner_id ON partner_activity_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_activity_logs_created_at ON partner_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_activity_logs_action ON partner_activity_logs(action);

-- RLS Policies
ALTER TABLE partner_activity_logs ENABLE ROW LEVEL SECURITY;

-- Partners can view their own activity logs
DROP POLICY IF EXISTS partners_view_own_activity ON partner_activity_logs;
CREATE POLICY partners_view_own_activity ON partner_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

-- Partners can insert their own activity logs
DROP POLICY IF EXISTS partners_insert_own_activity ON partner_activity_logs;
CREATE POLICY partners_insert_own_activity ON partner_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

-- Admins can view all activity logs
DROP POLICY IF EXISTS admins_view_all_activity ON partner_activity_logs;
CREATE POLICY admins_view_all_activity ON partner_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Grant permissions
GRANT ALL ON partner_activity_logs TO authenticated;

COMMENT ON TABLE partner_activity_logs IS 'Tracks partner actions for admin monitoring and analytics';
