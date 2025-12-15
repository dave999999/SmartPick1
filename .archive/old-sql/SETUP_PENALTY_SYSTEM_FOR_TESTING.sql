-- COMPLETE DATABASE CLEANUP AND SETUP FOR NEW PENALTY SYSTEM

-- Step 1: Clean up ALL old penalty data from both systems
UPDATE user_penalties SET is_active = false WHERE is_active = true;

UPDATE users SET 
  penalty_count = 0,
  penalty_until = NULL,
  is_banned = false,
  penalty_warning_shown = false,
  is_suspended = false,
  suspended_until = NULL,
  current_penalty_level = 0,
  total_missed_pickups = 0;

-- Step 2: Verify all users are clean
SELECT 
  id,
  email,
  is_suspended,
  suspended_until,
  current_penalty_level,
  total_missed_pickups
FROM users
WHERE is_suspended = true OR suspended_until IS NOT NULL OR current_penalty_level > 0;
-- Should return 0 rows

-- Step 3: Verify no active penalties
SELECT COUNT(*) as active_penalties FROM user_penalties WHERE is_active = true;
-- Should return 0

-- Step 4: Test the RPC functions
SELECT 
  'Test can_user_reserve for batumashvili.davit@gmail.com' as test,
  can_reserve,
  reason,
  suspended_until,
  penalty_id
FROM can_user_reserve((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'));
-- Should return: can_reserve=true, reason=null, suspended_until=null, penalty_id=null

SELECT 
  'Test get_active_penalty for batumashvili.davit@gmail.com' as test,
  penalty_id,
  offense_number,
  penalty_type,
  suspended_until
FROM get_active_penalty((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'));
-- Should return 0 rows

-- Step 5: Verify Edge Function cron job
SELECT 
  command,
  schedule,
  active
FROM cron.job
WHERE command LIKE '%detect-missed-pickups%';
-- Should show the cron job is active

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database is clean and ready for penalty system testing!';
END $$;
