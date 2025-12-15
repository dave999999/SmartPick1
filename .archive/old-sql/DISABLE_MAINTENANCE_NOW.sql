-- =====================================================
-- URGENT: DISABLE MAINTENANCE MODE
-- =====================================================
-- Copy and paste this into Supabase SQL Editor

-- 1. Disable maintenance mode
UPDATE system_settings 
SET value = '{"enabled": false}'::jsonb,
    updated_at = NOW()
WHERE key = 'maintenance_mode';

-- 2. Verify it's disabled
SELECT 
  key,
  value,
  value->>'enabled' as enabled_status,
  CASE 
    WHEN (value->>'enabled')::boolean THEN '🔴 MAINTENANCE ON'
    ELSE '✅ MAINTENANCE OFF - Site is now accessible'
  END as status
FROM system_settings
WHERE key = 'maintenance_mode';
