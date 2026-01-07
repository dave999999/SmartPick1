-- =========================================================
-- DIAGNOSE MAINTENANCE TOGGLE ISSUE
-- =========================================================

-- 1. Check if function exists
SELECT 
  '=== FUNCTION CHECK ===' as section;

SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proargnames as parameter_names,
  proargtypes::regtype[] as parameter_types
FROM pg_proc
WHERE proname = 'update_system_setting';

-- 2. Check system_settings table structure
SELECT 
  '=== TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;

-- 3. Check if system_settings table has data
SELECT 
  '=== CURRENT DATA ===' as section;

SELECT * FROM system_settings;

-- 4. Check users table structure first
SELECT 
  '=== USERS TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 5. Check your user data
SELECT 
  '=== USER DATA CHECK ===' as section;

SELECT 
  u.id,
  u.email,
  usr.*
FROM auth.users u
LEFT JOIN users usr ON u.id = usr.id
WHERE u.email = 'davetest@gmail.com';  -- Replace with your admin email

-- 6. Try to manually create the setting if it doesn't exist
SELECT 
  '=== CREATE IF NOT EXISTS ===' as section;

INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES (
  'maintenance_mode',
  '{"enabled": false}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT * FROM system_settings WHERE key = 'maintenance_mode';
