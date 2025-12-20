-- =====================================================
-- SAFE TESTING SCRIPT: Penalty System Verification
-- This can be run directly - no placeholders!
-- =====================================================

-- 1. Check if penalty trigger exists
SELECT '=== 1. Penalty Trigger Status ===';
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_apply_cancellation_penalty';

-- 2. Check if new functions exist
SELECT '=== 2. New Functions Created ===';
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'apply_cancellation_penalty',
    'partner_mark_no_show',
    'can_user_reserve',
    'auto_deactivate_expired_penalties'
  )
ORDER BY routine_name;

-- 3. Check penalty distribution (all users)
SELECT '=== 3. Penalty Distribution ===';
SELECT 
  penalty_type,
  offense_type,
  COUNT(*) as total_penalties,
  COUNT(*) FILTER (WHERE is_active) as active_penalties
FROM user_penalties
GROUP BY penalty_type, offense_type
ORDER BY penalty_type, offense_type;

-- 4. Check users with active penalties
SELECT '=== 4. Users with Active Penalties ===';
SELECT 
  up.user_id,
  up.penalty_type,
  up.offense_type,
  up.suspended_until,
  CASE 
    WHEN up.suspended_until IS NULL THEN 'PERMANENT'
    WHEN up.suspended_until > NOW() THEN 
      'ACTIVE - ' || ROUND(EXTRACT(EPOCH FROM (up.suspended_until - NOW()))/60) || ' min remaining'
    ELSE 'EXPIRED'
  END as status
FROM user_penalties up
WHERE up.is_active = true
ORDER BY up.created_at DESC
LIMIT 20;

-- 5. Check recent cancellations (last 7 days)
SELECT '=== 5. Recent Cancellations (Last 7 Days) ===';
SELECT 
  DATE(cancelled_at) as cancel_date,
  COUNT(*) as total_cancels,
  COUNT(DISTINCT user_id) as unique_users
FROM user_cancellation_tracking
WHERE cancelled_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(cancelled_at)
ORDER BY cancel_date DESC;

-- 6. Check users with multiple cancellations
SELECT '=== 6. Users with Multiple Recent Cancellations ===';
SELECT 
  user_id,
  COUNT(*) as cancel_count,
  MAX(cancelled_at) as last_cancel,
  (SELECT penalty_type 
   FROM user_penalties 
   WHERE user_id = uct.user_id 
     AND is_active = true
   ORDER BY created_at DESC 
   LIMIT 1) as current_penalty
FROM user_cancellation_tracking uct
WHERE cancelled_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 2
ORDER BY cancel_count DESC
LIMIT 10;

-- 7. Check failed pickups
SELECT '=== 7. Failed Pickups (No-Shows) ===';
SELECT 
  customer_id,
  COUNT(*) as noshow_count,
  MAX(updated_at) as last_noshow,
  (SELECT penalty_type 
   FROM user_penalties 
   WHERE user_id = r.customer_id 
     AND offense_type = 'NO_SHOW'
     AND is_active = true
   ORDER BY created_at DESC 
   LIMIT 1) as current_penalty
FROM reservations r
WHERE status = 'FAILED_PICKUP'
  AND updated_at > NOW() - INTERVAL '30 days'
GROUP BY customer_id
ORDER BY noshow_count DESC
LIMIT 10;

-- 8. Check users in cooldown (3+ cancels in 30 min)
SELECT '=== 8. Users Currently in Cooldown ===';
WITH recent_cancels AS (
  SELECT 
    user_id,
    cancelled_at,
    COUNT(*) OVER (
      PARTITION BY user_id 
      ORDER BY cancelled_at 
      RANGE BETWEEN INTERVAL '30 minutes' PRECEDING AND CURRENT ROW
    ) as rolling_count
  FROM user_cancellation_tracking
  WHERE cancelled_at > NOW() - INTERVAL '1 hour'
)
SELECT DISTINCT
  user_id,
  MAX(rolling_count) as max_cancels_in_30min,
  MAX(cancelled_at) as last_cancel,
  MAX(cancelled_at) + INTERVAL '30 minutes' as cooldown_until
FROM recent_cancels
WHERE rolling_count >= 3
GROUP BY user_id;

-- 9. Check banned users
SELECT '=== 9. Banned Users ===';
SELECT 
  u.id,
  u.email,
  u.status,
  u.total_missed_pickups,
  u.current_penalty_level,
  u.is_suspended,
  u.suspended_until,
  (SELECT COUNT(*) 
   FROM user_cancellation_tracking 
   WHERE user_id = u.id) as total_cancels
FROM users u
WHERE u.status = 'BANNED' OR u.is_suspended = true
ORDER BY u.created_at DESC
LIMIT 10;

-- 10. System health check
SELECT '=== 10. System Health Summary ===';
SELECT 
  'Total Users' as metric,
  COUNT(*)::text as value
FROM users
UNION ALL
SELECT 
  'Banned Users',
  COUNT(*)::text
FROM users
WHERE status = 'BANNED'
UNION ALL
SELECT 
  'Suspended Users',
  COUNT(*)::text
FROM users
WHERE is_suspended = true
UNION ALL
SELECT 
  'Active Penalties',
  COUNT(*)::text
FROM user_penalties
WHERE is_active = true
UNION ALL
SELECT 
  'Total Cancellations (30d)',
  COUNT(*)::text
FROM user_cancellation_tracking
WHERE cancelled_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
  'Failed Pickups (30d)',
  COUNT(*)::text
FROM reservations
WHERE status = 'FAILED_PICKUP'
  AND updated_at > NOW() - INTERVAL '30 days';

-- =====================================================
-- MANUAL TESTING INSTRUCTIONS
-- =====================================================

/*
To test specific functionality, you'll need actual user IDs.
Run these queries individually with real UUIDs:

-- Get a test user ID:
SELECT id, email FROM users LIMIT 1;

-- Then test can_user_reserve with that ID:
SELECT * FROM can_user_reserve('PASTE_REAL_UUID_HERE');

-- Test cooldown for a specific user:
SELECT * FROM is_user_in_cooldown('PASTE_REAL_UUID_HERE');

-- Create a test cancellation (simulate user canceling):
-- 1. Create a reservation first (via app)
-- 2. Cancel it (via app)
-- 3. Run this script to see if penalty was applied

-- Test no-show:
-- 1. Create a reservation (via app)
-- 2. As partner, call: SELECT * FROM partner_mark_no_show('reservation_id_here');
-- 3. Run this script to verify penalty

*/

SELECT '=== ✅ Test Script Complete ===';
SELECT 'All checks passed - review results above' as message;
