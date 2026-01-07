-- ============================================
-- RESET CANCELLATION COOLDOWN SYSTEM
-- ============================================
-- Purpose: Clean slate for cancellation tracking
-- User: davetest@gmail.com
-- ============================================

-- Step 1: Check current cancellation status BEFORE reset
SELECT 
  'BEFORE RESET:' as status,
  u.email,
  COUNT(uct.id) as total_cancellations,
  COUNT(uct.id) FILTER (WHERE uct.cancelled_at >= CURRENT_DATE) as cancellations_today,
  is_user_in_cooldown(u.id) as in_cooldown
FROM users u
LEFT JOIN user_cancellation_tracking uct ON u.id = uct.user_id
WHERE u.email = 'davetest@gmail.com'
GROUP BY u.id, u.email;

-- Step 2: Show all cancellation history
SELECT 
  'CANCELLATION HISTORY:' as status,
  uct.id,
  uct.reservation_id,
  uct.cancelled_at,
  uct.reset_cooldown_used,
  uct.cooldown_duration_minutes
FROM user_cancellation_tracking uct
WHERE uct.user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
ORDER BY uct.cancelled_at DESC;

-- Step 3: Show all cooldown lift history
SELECT 
  'COOLDOWN LIFT HISTORY:' as status,
  ucl.id,
  ucl.lift_type,
  ucl.points_spent,
  ucl.created_at
FROM user_cooldown_lifts ucl
WHERE ucl.user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
ORDER BY ucl.created_at DESC;

-- Step 4: Delete all cooldown lift records
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- Step 5: Delete all cancellation records
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- Step 6: Verify clean state AFTER reset
SELECT 
  'AFTER RESET:' as status,
  u.email,
  COUNT(uct.id) as total_cancellations,
  is_user_in_cooldown(u.id) as in_cooldown,
  CASE 
    WHEN is_user_in_cooldown(u.id) = false 
    THEN '✓ User can cancel reservations'
    ELSE '✗ User is still in cooldown'
  END as status_message
FROM users u
LEFT JOIN user_cancellation_tracking uct ON u.id = uct.user_id
WHERE u.email = 'davetest@gmail.com'
GROUP BY u.id, u.email;

-- ============================================
-- RESULT
-- ============================================
-- All cooldown lifts deleted ✅
-- All cancellation records deleted ✅
-- Cancellation count = 0 ✅
-- in_cooldown = false ✅
-- Ready for fresh cancellation testing! 🚀
-- ============================================
