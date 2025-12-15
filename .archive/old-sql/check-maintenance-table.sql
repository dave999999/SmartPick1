-- Check if system_settings table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'system_settings'
) as table_exists;

-- If it exists, show current maintenance mode setting
SELECT * FROM system_settings WHERE key = 'maintenance_mode';
