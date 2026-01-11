-- =========================================================
-- VERIFY PENALTY IS COMPLETELY CLEARED FOR DAVETEST
-- =========================================================

-- 1. Check user_penalties table
SELECT 
  '1️⃣ USER_PENALTIES' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEARED' 
    ELSE '❌ STILL HAS PENALTIES' 
  END as status
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Show any remaining penalties
SELECT 
  '🔍 REMAINING PENALTIES' as type,
  id,
  offense_type,
  penalty_type,
  is_active,
  suspended_until,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 2. Check get_active_penalty function
SELECT 
  '2️⃣ GET_ACTIVE_PENALTY' as check,
  CASE 
    WHEN penalty_id IS NULL THEN '✅ NO ACTIVE PENALTY'
    ELSE '❌ PENALTY STILL ACTIVE: ' || penalty_id::text
  END as status
FROM get_active_penalty((SELECT id FROM auth.users WHERE email = 'davetest@gmail.com'));

-- 3. Check user status
SELECT 
  '3️⃣ USER STATUS' as check,
  email,
  is_suspended,
  suspended_until,
  total_missed_pickups,
  current_penalty_level,
  reliability_score,
  CASE 
    WHEN is_suspended = false AND total_missed_pickups = 0 THEN '✅ CLEAN'
    ELSE '❌ STILL HAS ISSUES'
  END as status
FROM users
WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 4. Check cancellation tracking
SELECT 
  '4️⃣ CANCELLATION_TRACKING' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEARED'
    ELSE '⚠️ HAS ' || COUNT(*) || ' RECORDS'
  END as status
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 5. Check cooldown lifts
SELECT 
  '5️⃣ COOLDOWN_LIFTS' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEARED'
    ELSE '⚠️ HAS ' || COUNT(*) || ' RECORDS'
  END as status
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- ✅ IF ALL CHECKS SAY "CLEARED", THEN ISSUE IS FRONTEND CACHE
-- 🔄 USER NEEDS TO:
-- 1. Close all browser tabs
-- 2. Clear browser cache (Ctrl+Shift+Delete)
-- 3. Reopen website
-- 4. Login again
