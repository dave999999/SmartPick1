-- ============================================
-- SIMPLIFIED Signup Error Diagnosis
-- Run this to quickly identify the issue
-- ============================================

-- 1. Does user_stats table exist? (MOST IMPORTANT)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'user_stats'
) as user_stats_exists;

-- If FALSE ↑ then you MUST run the gamification migration!


-- 2. What triggers are active on users table?
SELECT
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Look for 'create_user_stats_trigger' ↑


-- 3. Does init_user_stats function exist?
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_name = 'init_user_stats'
) as init_user_stats_exists;


-- 4. Required columns on users table
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('referral_code', 'referred_by', 'penalty_count', 'penalty_until');

-- Should see all 4 columns ↑


-- ============================================
-- INTERPRET RESULTS
-- ============================================

-- SCENARIO 1: user_stats_exists = FALSE
-- → Run: supabase/migrations/20250106_create_gamification_tables.sql

-- SCENARIO 2: user_stats_exists = TRUE but signups still fail
-- → Run: scripts/fix-signup-error.sql (Option 2C - make function resilient)

-- SCENARIO 3: Missing columns (referral_code, etc.)
-- → Run: scripts/fix-signup-error.sql (Option 2B - add missing columns)

-- SCENARIO 4: Need signups working NOW
-- → Run: ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;
