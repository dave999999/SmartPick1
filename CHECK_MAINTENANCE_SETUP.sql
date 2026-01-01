-- Check if system_settings table exists and has maintenance_mode row
SELECT 
  key, 
  value, 
  updated_at,
  updated_by
FROM system_settings 
WHERE key = 'maintenance_mode';

-- Check current user's role (run this when logged in as admin)
SELECT 
  id,
  email,
  role,
  name
FROM users 
WHERE id = auth.uid();

-- Test: Try to update maintenance mode (should work for admins)
UPDATE system_settings 
SET 
  value = '{"enabled": true}'::jsonb,
  updated_at = NOW()
WHERE key = 'maintenance_mode';

-- Verify the update
SELECT key, value, updated_at FROM system_settings WHERE key = 'maintenance_mode';
