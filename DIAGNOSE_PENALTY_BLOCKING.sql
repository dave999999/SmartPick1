-- ============================================
-- DIAGNOSE PENALTY BLOCKING ISSUE
-- ============================================
-- User: batumashvili.davit@gmail.com
-- Issue: Getting "active penalty" error despite only having warning
-- ============================================

-- Step 1: Check user's current penalties
SELECT 
  'USER PENALTIES:' as status,
  id as penalty_id,
  offense_number,
  penalty_type,
  is_active,
  acknowledged,
  created_at,
  suspended_until,
  CASE 
    WHEN penalty_type = 'warning' THEN '✅ Warning (should NOT block)'
    WHEN penalty_type = 'suspension' THEN '❌ Suspension (SHOULD block)'
    WHEN penalty_type IN ('1hour', '24hour', 'permanent') THEN '❌ Suspension (SHOULD block)'
    ELSE '⚠️ Unknown type'
  END as blocking_status
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true
ORDER BY created_at DESC;

-- Step 2: Check the ACTUAL function code in database
SELECT 
  'FUNCTION CHECK:' as status,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%penalty_type = ''suspension''%' THEN '✅ FIXED - Only checks suspensions'
    WHEN prosrc LIKE '%penalty_type%' THEN '⚠️ Mentions penalty_type but not sure'
    ELSE '❌ NOT FIXED - Checks all penalties'
  END as fix_status,
  CASE 
    WHEN prosrc LIKE '%penalty_type = ''suspension''%' THEN 'Function is correct'
    ELSE 'Function needs fixing'
  END as verdict
FROM pg_proc
WHERE proname = 'create_reservation_atomic';

-- Step 3: Show the exact penalty check code from function
SELECT 
  'EXACT CODE:' as status,
  substring(prosrc from 'v_has_[^;]*penalty[^;]*;') as penalty_check_code
FROM pg_proc
WHERE proname = 'create_reservation_atomic';

-- Step 4: Check user's suspended flag
SELECT
  'USER STATUS:' as status,
  email,
  is_suspended,
  penalty_count,
  reliability_score,
  CASE 
    WHEN is_suspended = true THEN '❌ SUSPENDED - Cannot reserve'
    WHEN is_suspended = false AND penalty_count > 0 THEN '⚠️ Has warnings but NOT suspended'
    ELSE '✅ Clean account'
  END as account_status
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Penalties: Should show penalty_type = 'warning'
-- Function: Should show "✅ FIXED - Only checks suspensions"  
-- User: Should show is_suspended = false
-- If function is NOT fixed, we need to reapply FORCE_RECREATE_FUNCTION.sql
-- ============================================
