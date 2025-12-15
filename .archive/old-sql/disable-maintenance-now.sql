-- Run this in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql/new

-- First, check current status
SELECT key, value, updated_at 
FROM system_settings 
WHERE key = 'maintenance_mode';

-- Then disable it
UPDATE system_settings 
SET value = '{"enabled": false}'::jsonb, 
    updated_at = NOW() 
WHERE key = 'maintenance_mode';

-- Verify it's disabled
SELECT key, value, updated_at 
FROM system_settings 
WHERE key = 'maintenance_mode';
