-- Check current maintenance mode status
SELECT * FROM system_settings WHERE key = 'maintenance_mode';

-- To DISABLE maintenance mode (allow everyone to access):
UPDATE system_settings 
SET value = jsonb_set(value, '{enabled}', 'false')
WHERE key = 'maintenance_mode';

-- To ENABLE maintenance mode (show maintenance page to non-admins):
UPDATE system_settings 
SET value = jsonb_set(value, '{enabled}', 'true')
WHERE key = 'maintenance_mode';

-- If the setting doesn't exist, create it (disabled by default):
INSERT INTO system_settings (key, value, description)
VALUES (
  'maintenance_mode',
  '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon."}',
  'Enable/disable maintenance mode for the site'
)
ON CONFLICT (key) DO NOTHING;
