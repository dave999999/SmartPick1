-- ============================================
-- Diagnose Supabase Signup Error
-- Run this in Supabase SQL Editor to find the issue
-- ============================================

-- 1. Check if users table exists and has correct structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check triggers on users table (these run on INSERT)
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 3. Check functions that might be called by triggers
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'init_user_stats',
    'handle_new_user',
    'create_user_stats',
    'add_user_points'
  );

-- 4. Check if user_stats table exists (required by gamification trigger)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'user_stats'
) as user_stats_exists;

-- 5. Check if smartpoints_balance table exists (might be required)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'smartpoints_balance'
) as smartpoints_balance_exists;

-- 6. Check RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';

-- 7. Try to see recent error logs (if available)
-- Note: This might not work depending on Supabase plan
SELECT *
FROM postgres_logs
WHERE message LIKE '%users%'
  OR message LIKE '%signup%'
ORDER BY log_time DESC
LIMIT 10;

-- ============================================
-- Common Issues and Solutions
-- ============================================

-- If init_user_stats trigger exists but user_stats table doesn't:
-- DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;

-- If referral_code column is missing:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- If smartpoints trigger exists but table doesn't:
-- Check for triggers related to smartpoints and disable if needed
