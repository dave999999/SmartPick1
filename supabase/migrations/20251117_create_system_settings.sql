-- Create system_settings table for maintenance mode and other system-wide settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode setting
INSERT INTO system_settings (key, value, description)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb, 'Controls whether the site is in maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read system settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update system settings" ON system_settings;

-- Allow anyone to read system settings
CREATE POLICY "Anyone can read system settings"
  ON system_settings
  FOR SELECT
  USING (true);

-- Only admins can update system settings
CREATE POLICY "Only admins can update system settings"
  ON system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Function to update system setting
CREATE OR REPLACE FUNCTION update_system_setting(
  setting_key VARCHAR,
  setting_value JSONB,
  admin_user_id UUID
)
RETURNS system_settings AS $$
DECLARE
  result system_settings;
BEGIN
  UPDATE system_settings
  SET 
    value = setting_value,
    updated_by = admin_user_id,
    updated_at = NOW()
  WHERE key = setting_key
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE system_settings IS 'System-wide configuration settings including maintenance mode';
