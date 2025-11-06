-- ============================================
-- EMERGENCY: Disable ALL Triggers Blocking Signup
-- Run this to allow signups immediately
-- ============================================

-- This will disable ALL custom triggers on the users table
-- so we can identify which one is causing the 500 error

-- 1. First, let's see what triggers exist
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Copy the trigger names from above, then disable them:

-- ============================================
-- DISABLE TRIGGERS ONE BY ONE
-- ============================================

-- Gamification trigger
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;

-- SmartPoints trigger (if it exists)
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_smartpoints_trigger;
ALTER TABLE users DISABLE TRIGGER IF EXISTS init_smartpoints_balance_trigger;

-- Any other custom triggers (check output from query above)
-- ALTER TABLE users DISABLE TRIGGER IF EXISTS your_trigger_name_here;

-- ============================================
-- Now test signup - it should work
-- ============================================

-- After signup works, you can re-enable triggers one by one:
-- ALTER TABLE users ENABLE TRIGGER create_user_stats_trigger;
-- Test signup again after each enable to find which one fails

-- ============================================
-- VERIFICATION
-- ============================================

-- Check which triggers are now disabled
SELECT
  trigger_name,
  status
FROM information_schema.triggers
WHERE event_object_table = 'users';
