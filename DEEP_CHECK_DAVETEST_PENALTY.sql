-- =========================================================
-- DEEP CHECK: Find ALL penalty-related data for davetest
-- =========================================================

-- Store user ID for reuse
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  RAISE NOTICE '🔍 Checking user ID: %', v_user_id;
END $$;

-- =================
-- 1. USER_PENALTIES TABLE (MOST IMPORTANT)
-- =================
SELECT 
  '1️⃣ USER_PENALTIES TABLE' as section,
  id,
  user_id,
  offense_type,
  penalty_type,
  offense_number,
  is_active,
  suspended_until,
  acknowledged,
  can_lift_with_points,
  points_required,
  created_at,
  updated_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- Count check
SELECT 
  '📊 PENALTY COUNT' as check,
  COUNT(*) as total_penalties,
  COUNT(*) FILTER (WHERE is_active = true) as active_penalties,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_penalties
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- =================
-- 2. GET_ACTIVE_PENALTY FUNCTION (What app calls)
-- =================
SELECT 
  '2️⃣ GET_ACTIVE_PENALTY() OUTPUT' as section,
  *
FROM get_active_penalty((SELECT id FROM auth.users WHERE email = 'davetest@gmail.com'));

-- =================
-- 3. USERS TABLE STATUS
-- =================
SELECT 
  '3️⃣ USERS TABLE' as section,
  id,
  email,
  name,
  is_suspended,
  suspended_until,
  total_missed_pickups,
  current_penalty_level,
  reliability_score,
  created_at,
  updated_at
FROM users
WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- =================
-- 4. USER_MISSED_PICKUPS
-- =================
SELECT 
  '4️⃣ USER_MISSED_PICKUPS' as section,
  id,
  reservation_id,
  created_at,
  warning_shown,
  warning_level
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- Count
SELECT 
  '📊 MISSED PICKUP COUNT' as check,
  COUNT(*) as total_missed_pickups
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- =================
-- 5. PENALTY_OFFENSE_HISTORY
-- =================
SELECT 
  '5️⃣ PENALTY_OFFENSE_HISTORY' as section,
  id,
  offense_count,
  last_offense_date,
  total_warnings,
  total_1hour_bans,
  total_24hour_bans,
  total_permanent_bans,
  reliability_score,
  created_at
FROM penalty_offense_history
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- =================
-- 6. RESERVATIONS (Failed pickups)
-- =================
SELECT 
  '6️⃣ FAILED_PICKUP RESERVATIONS' as section,
  id,
  status,
  pickup_window_start,
  pickup_window_end,
  created_at,
  updated_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC
LIMIT 5;

-- =================
-- 7. USER_CANCELLATION_TRACKING
-- =================
SELECT 
  '7️⃣ CANCELLATION_TRACKING' as section,
  COUNT(*) as total_cancellations
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- =================
-- 8. USER_COOLDOWN_LIFTS
-- =================
SELECT 
  '8️⃣ COOLDOWN_LIFTS' as section,
  COUNT(*) as total_lifts
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- =================
-- 9. CAN_USER_RESERVE FUNCTION (Comprehensive check)
-- =================
SELECT 
  '9️⃣ CAN_USER_RESERVE() OUTPUT' as section,
  *
FROM can_user_reserve((SELECT id FROM auth.users WHERE email = 'davetest@gmail.com'));

-- =================
-- 10. SUMMARY
-- =================
SELECT 
  '📋 SUMMARY' as section,
  (SELECT COUNT(*) FROM user_penalties WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as total_penalties,
  (SELECT COUNT(*) FROM user_penalties WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com') AND is_active = true) as active_penalties,
  (SELECT is_suspended FROM users WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as is_suspended,
  (SELECT total_missed_pickups FROM users WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as total_missed_pickups,
  (SELECT COUNT(*) FROM user_missed_pickups WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as missed_pickup_records;

-- =================
-- 🚨 IF YOU SEE ANY PENALTIES, DELETE THEM NOW:
-- =================
-- Uncomment these lines to force delete everything:

-- DELETE FROM user_penalties 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- DELETE FROM penalty_offense_history
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- DELETE FROM user_missed_pickups
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- UPDATE users
-- SET 
--   is_suspended = false,
--   suspended_until = NULL,
--   total_missed_pickups = 0,
--   current_penalty_level = 0,
--   reliability_score = 100,
--   updated_at = NOW()
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- RAISE NOTICE '✅ All penalty data force-deleted!';
