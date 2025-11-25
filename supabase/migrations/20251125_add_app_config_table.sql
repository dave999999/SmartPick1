-- Create app_config table for storing application configuration
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read config (public configs only)
CREATE POLICY "Anyone can read app config"
  ON app_config
  FOR SELECT
  USING (true);

-- Only admins can insert/update config
CREATE POLICY "Only admins can modify app config"
  ON app_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Insert MapTiler API key placeholder
INSERT INTO app_config (config_key, config_value, description)
VALUES (
  'maptiler_api_key',
  'lbc0oIt12XmRGOSqhQUx',
  'MapTiler API key for vector map rendering'
)
ON CONFLICT (config_key) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_config_updated_at();
