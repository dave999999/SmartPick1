-- Add notification_preferences and busy_mode columns to partners table
-- This enables partners to customize their notification settings

-- Add notification_preferences JSONB column to store notification settings
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "newOrder": true,
  "lowStock": true,
  "cancellation": true,
  "telegram": true,
  "sms": false,
  "email": false
}'::jsonb;

-- Add busy_mode boolean column
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS busy_mode BOOLEAN DEFAULT false;

-- Add comment to describe the columns
COMMENT ON COLUMN partners.notification_preferences IS 'Partner notification preferences including critical alerts and communication channels';
COMMENT ON COLUMN partners.busy_mode IS 'When true, all partner offers are automatically paused';

-- Update existing partners to have default notification preferences
UPDATE partners 
SET notification_preferences = '{
  "newOrder": true,
  "lowStock": true,
  "cancellation": true,
  "telegram": true,
  "sms": false,
  "email": false
}'::jsonb
WHERE notification_preferences IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_partners_busy_mode ON partners(busy_mode) WHERE busy_mode = true;

COMMENT ON INDEX idx_partners_busy_mode IS 'Index for quickly finding partners in busy mode';
