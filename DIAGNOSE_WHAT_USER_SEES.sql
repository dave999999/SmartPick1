-- DIAGNOSE_WHAT_USER_SEES.sql
-- Check what modals should be shown for davetest@gmail.com

-- 1. Check active penalties (MISSED PICKUP SYSTEM)
SELECT
  '=== MISSED PICKUP PENALTIES ===' as section,
  p.id as penalty_id,
  p.offense_number,
  p.penalty_type,
  p.is_active,
  p.acknowledged,
  p.suspended_until AT TIME ZONE 'Asia/Tbilisi' as suspended_until_tbilisi,
  p.can_lift_with_points,
  p.points_required,
  CASE
    WHEN p.penalty_type IN ('1hour', '5hour', '24hour', 'permanent') THEN 'SuspensionModal (z-10001)'
    ELSE 'PenaltyModal (z-10000)'
  END as expected_modal,
  CASE
    WHEN p.suspended_until > NOW() THEN 'ACTIVE - BLOCKING USER'
    WHEN NOT p.acknowledged THEN 'WAITING FOR ACKNOWLEDGMENT'
    ELSE 'RESOLVED'
  END as status
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND p.is_active = TRUE
ORDER BY p.created_at DESC;

-- 2. Check cancellation tracking (CANCELLATION COOLDOWN SYSTEM)
SELECT
  '=== CANCELLATION COOLDOWN ===' as section,
  COUNT(*) as cancellations_today,
  MAX(cancelled_at AT TIME ZONE 'Asia/Tbilisi') as last_cancellation_time,
  CASE
    WHEN COUNT(*) = 3 THEN 'CancellationCooldownCard (FREE, z-60)'
    WHEN COUNT(*) = 4 THEN 'PaidCooldownLiftModal (100 points, z-60)'
    WHEN COUNT(*) >= 5 THEN 'Blocking Dialog (no lift, z-60)'
    ELSE 'No modal'
  END as expected_modal
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Check cooldown status (1 hour after last cancellation)
SELECT
  '=== COOLDOWN STATUS ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_cancellation_tracking
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
        AND cancelled_at >= NOW() - INTERVAL '1 hour'
    ) THEN 'IN COOLDOWN (1 hour from last cancellation)'
    ELSE 'NOT IN COOLDOWN'
  END as cooldown_status;

-- 4. Check user points (for lifting penalties/cooldowns)
SELECT
  '=== USER POINTS ===' as section,
  balance as current_points
FROM user_points
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 5. FINAL VERDICT
SELECT
  '=== WHAT USER SHOULD SEE ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_penalties
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND is_active = TRUE
        AND suspended_until > NOW()
        AND penalty_type IN ('1hour', '5hour', '24hour', 'permanent')
    ) THEN '🚨 SUSPENSION MODAL (z-10001) - Blocks ALL app functionality until lifted or expired'
    WHEN EXISTS (
      SELECT 1 FROM user_penalties
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND is_active = TRUE
        AND NOT acknowledged
    ) THEN '⚠️ PENALTY MODAL (z-10000) - Warning message, must acknowledge'
    WHEN EXISTS (
      SELECT 1 FROM user_cancellation_tracking
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
        AND cancelled_at >= NOW() - INTERVAL '1 hour'
      HAVING COUNT(*) >= 3
    ) THEN '⏰ COOLDOWN MODAL (z-60) - Shows when trying to reserve, does NOT block navigation'
    ELSE '✅ NO MODALS - User can use app normally'
  END as verdict;

-- 6. Check if systems are conflicting
SELECT
  '=== CONFLICT CHECK ===' as section,
  CASE
    WHEN (
      SELECT COUNT(*) FROM user_penalties
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND is_active = TRUE
    ) > 0
    AND (
      SELECT COUNT(*) FROM user_cancellation_tracking
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
        AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
    ) >= 3
    THEN '⚠️ BOTH SYSTEMS ACTIVE - Penalty should show FIRST, cooldown should wait'
    ELSE '✅ Only one system active'
  END as conflict_status;
