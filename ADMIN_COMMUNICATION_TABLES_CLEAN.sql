-- =====================================================
-- Admin Communication System - Database Schema (CLEAN VERSION)
-- =====================================================
-- This DROPS existing tables and recreates them fresh
-- Run this in Supabase SQL Editor
-- WARNING: This will DELETE all existing announcement data!
-- =====================================================

-- Drop existing tables (CASCADE to drop dependent objects)
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;

-- 1. Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  target_ids UUID[], -- Array of user/partner IDs for specific targeting
  priority TEXT NOT NULL,
  channel TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  CONSTRAINT chk_target_audience CHECK (target_audience IN ('ALL_USERS', 'ALL_PARTNERS', 'SPECIFIC_USERS', 'SPECIFIC_PARTNERS', 'EVERYONE')),
  CONSTRAINT chk_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  CONSTRAINT chk_channel CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH', 'ALL')),
  CONSTRAINT chk_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED'))
);

-- 2. Announcement reads tracking (optional - for detailed analytics)
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 3. Direct messages table
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL, -- User or Partner ID
  recipient_type TEXT NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who sent
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  CONSTRAINT chk_dm_recipient_type CHECK (recipient_type IN ('USER', 'PARTNER')),
  CONSTRAINT chk_dm_channel CHECK (channel IN ('IN_APP', 'EMAIL', 'BOTH'))
);

-- Indexes for performance
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id, recipient_type);
CREATE INDEX idx_direct_messages_sent_at ON direct_messages(sent_at DESC);

-- RLS Policies (Security)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Admin can manage all announcements
CREATE POLICY admin_announcements_all ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Users can read announcements targeted to them
CREATE POLICY users_read_announcements ON announcements
  FOR SELECT
  TO authenticated
  USING (
    announcements.status = 'SENT'
    AND (
      announcements.target_audience = 'EVERYONE'
      OR (announcements.target_audience = 'ALL_USERS' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'CUSTOMER'))
      OR (announcements.target_audience = 'SPECIFIC_USERS' AND auth.uid() = ANY(announcements.target_ids))
    )
  );

-- Partners can read announcements targeted to them
CREATE POLICY partners_read_announcements ON announcements
  FOR SELECT
  TO authenticated
  USING (
    announcements.status = 'SENT'
    AND (
      announcements.target_audience = 'EVERYONE'
      OR (announcements.target_audience = 'ALL_PARTNERS' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'PARTNER'))
      OR (announcements.target_audience = 'SPECIFIC_PARTNERS' AND auth.uid() = ANY(announcements.target_ids))
    )
  );

-- Users can track their own reads
CREATE POLICY users_announcement_reads ON announcement_reads
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can view all announcement reads
CREATE POLICY admin_announcement_reads ON announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Users/Partners can read their direct messages
CREATE POLICY read_own_messages ON direct_messages
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Admin can send and view all messages
CREATE POLICY admin_direct_messages ON direct_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Grant permissions
GRANT ALL ON announcements TO authenticated;
GRANT ALL ON announcement_reads TO authenticated;
GRANT ALL ON direct_messages TO authenticated;

COMMENT ON TABLE announcements IS 'Admin broadcast announcements to users and partners';
COMMENT ON TABLE announcement_reads IS 'Tracks which users have read announcements';
COMMENT ON TABLE direct_messages IS 'Direct messages from admin to specific users/partners';
