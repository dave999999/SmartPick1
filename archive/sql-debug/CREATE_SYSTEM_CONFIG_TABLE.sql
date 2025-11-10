-- =====================================================
-- CREATE SYSTEM_CONFIG TABLE FOR ADMIN DASHBOARD
-- =====================================================
-- This table stores all platform-wide configuration settings
-- Only one row should exist (enforced by unique constraint)
-- =====================================================

-- Drop existing table if needed (uncomment to reset)
-- DROP TABLE IF EXISTS system_config CASCADE;

CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- Points & Economy
  welcome_points INTEGER DEFAULT 100 NOT NULL CHECK (welcome_points >= 0),
  referral_bonus INTEGER DEFAULT 50 NOT NULL CHECK (referral_bonus >= 0),
  min_points_to_reserve INTEGER DEFAULT 10 NOT NULL CHECK (min_points_to_reserve >= 0),
  points_expiry_days INTEGER DEFAULT 365 NOT NULL CHECK (points_expiry_days > 0),
  partner_commission_rate DECIMAL DEFAULT 15.0 NOT NULL CHECK (partner_commission_rate >= 0 AND partner_commission_rate <= 100),
  platform_fee DECIMAL DEFAULT 5.0 NOT NULL CHECK (platform_fee >= 0 AND platform_fee <= 100),
  cancellation_fee DECIMAL DEFAULT 10.0 NOT NULL CHECK (cancellation_fee >= 0),
  
  -- Reservations
  max_reservations_per_user INTEGER DEFAULT 5 NOT NULL CHECK (max_reservations_per_user > 0),
  reservation_expiry_hours INTEGER DEFAULT 24 NOT NULL CHECK (reservation_expiry_hours > 0),
  min_pickup_time_hours INTEGER DEFAULT 2 NOT NULL CHECK (min_pickup_time_hours >= 0),
  
  -- Partner Settings
  auto_approve_partners BOOLEAN DEFAULT FALSE NOT NULL,
  require_partner_verification BOOLEAN DEFAULT TRUE NOT NULL,
  min_partner_rating DECIMAL DEFAULT 3.0 NOT NULL CHECK (min_partner_rating >= 0 AND min_partner_rating <= 5),
  
  -- Features
  enable_referrals BOOLEAN DEFAULT TRUE NOT NULL,
  enable_achievements BOOLEAN DEFAULT TRUE NOT NULL,
  enable_push_notifications BOOLEAN DEFAULT TRUE NOT NULL,
  enable_email_notifications BOOLEAN DEFAULT TRUE NOT NULL,
  maintenance_mode BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Email Templates
  welcome_email_subject TEXT DEFAULT 'Welcome to SmartPick!' NOT NULL,
  welcome_email_body TEXT DEFAULT 'Thank you for joining SmartPick. We''re excited to help you reduce food waste and save money!' NOT NULL,
  partner_approval_email_subject TEXT DEFAULT 'Your Partner Application has been Approved' NOT NULL,
  partner_approval_email_body TEXT DEFAULT 'Congratulations! Your partner application has been approved. You can now start adding offers to the platform.' NOT NULL,
  
  -- Security
  max_login_attempts INTEGER DEFAULT 5 NOT NULL CHECK (max_login_attempts > 0),
  session_timeout_minutes INTEGER DEFAULT 60 NOT NULL CHECK (session_timeout_minutes > 0),
  enable_captcha BOOLEAN DEFAULT TRUE NOT NULL,
  enable_rate_limiting BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS system_config_singleton ON system_config ((id = 1));

-- Insert default config if not exists
INSERT INTO system_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_config_updated_at ON system_config;
CREATE TRIGGER system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read config
DROP POLICY IF EXISTS "Admins can read system config" ON system_config;
CREATE POLICY "Admins can read system config"
  ON system_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Only admins can update config
DROP POLICY IF EXISTS "Admins can update system config" ON system_config;
CREATE POLICY "Admins can update system config"
  ON system_config
  FOR UPDATE
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


-- Verify the table was created
SELECT 'system_config table created successfully!' as message, COUNT(*) as row_count FROM system_config;
SELECT * FROM system_config;

-- Show current configuration
SELECT 
  'Current Configuration' as section,
  to_jsonb(system_config) as config
FROM system_config;
