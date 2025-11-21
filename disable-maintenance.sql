-- Check current maintenance mode status
SELECT key, value, updated_at 
FROM system_settings 
WHERE key = 'maintenance_mode';

-- Force disable maintenance mode
UPDATE system_settings 
SET value = '{"enabled": false}'::jsonb,
    updated_at = NOW()
WHERE key = 'maintenance_mode';

-- Verify it's disabled
SELECT key, value, updated_at 
FROM system_settings 
WHERE key = 'maintenance_mode';
