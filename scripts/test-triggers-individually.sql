-- ============================================
-- Test Which Trigger Is Failing
-- ============================================

-- First, disable BOTH triggers so signups work
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_points_trigger;

-- Signups should work now


-- ============================================
-- Test Trigger Functions Manually
-- ============================================

-- Test 1: Can we manually call init_user_stats?
-- Replace 'TEST_USER_ID' with a real user ID from your users table

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a real user ID to test with
  SELECT id INTO test_user_id FROM users LIMIT 1;

  RAISE NOTICE 'Testing with user ID: %', test_user_id;

  -- Try to create user_stats
  INSERT INTO user_stats (user_id, last_activity_date)
  VALUES (test_user_id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'user_stats created successfully!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating user_stats: %', SQLERRM;
END $$;


-- Test 2: Can we manually call init_user_points?

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a real user ID to test with
  SELECT id INTO test_user_id FROM users LIMIT 1;

  RAISE NOTICE 'Testing with user ID: %', test_user_id;

  -- Try to create user_points
  INSERT INTO user_points (user_id, balance)
  VALUES (test_user_id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'user_points created successfully!';

  -- Try to create transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (test_user_id, 100, 'test', 0, 100, '{"test": true}');

  RAISE NOTICE 'point_transaction created successfully!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating points/transaction: %', SQLERRM;
END $$;


-- ============================================
-- Enable ONE Trigger at a Time
-- ============================================

-- Test Approach 1: Enable ONLY gamification trigger
ALTER TABLE users ENABLE TRIGGER create_user_stats_trigger;
-- Now try signup in your app - does it work?
-- If YES: gamification trigger is fine
-- If NO: gamification trigger is the problem

-- After testing, disable it again
ALTER TABLE users DISABLE TRIGGER create_user_stats_trigger;


-- Test Approach 2: Enable ONLY smartpoints trigger
ALTER TABLE users ENABLE TRIGGER create_user_points_trigger;
-- Now try signup in your app - does it work?
-- If YES: smartpoints trigger is fine
-- If NO: smartpoints trigger is the problem

-- After testing, disable it again
ALTER TABLE users DISABLE TRIGGER create_user_points_trigger;


-- ============================================
-- Alternative: Keep Triggers Disabled
-- ============================================

-- If you can't fix the triggers, just keep them disabled
-- and manually create stats/points for new users:

-- After a new user signs up, run this (replace USER_ID):

INSERT INTO user_stats (user_id, last_activity_date)
VALUES ('NEW_USER_ID', CURRENT_DATE)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_points (user_id, balance)
VALUES ('NEW_USER_ID', 100)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
VALUES ('NEW_USER_ID', 100, 'registration', 0, 100, '{"manual": true}');


-- ============================================
-- Check For Specific Errors
-- ============================================

-- Check if tables have correct structure
\d user_stats
\d user_points
\d point_transactions

-- Check for any constraints that might be failing
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('user_stats', 'user_points', 'point_transactions')
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK');
