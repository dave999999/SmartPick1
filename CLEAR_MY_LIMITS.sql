-- ============================================
-- CLEAR ALL LIMITS AND PENALTIES
-- ============================================
-- Clears cancellation counts, penalties, and suspension
-- ============================================

-- STEP 1: Show current state
SELECT 
  '=== CURRENT STATE ===' as step,
  u.email,
  u.is_suspended,
  COUNT(uct.id) as today_cancellations,
  COUNT(p.id) FILTER (WHERE p.is_active = true) as active_penalties
FROM users u
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id AND uct.cancelled_at >= CURRENT_DATE
LEFT JOIN user_penalties p ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.email, u.is_suspended;

-- STEP 2: Clear today's cancellation count
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND cancelled_at >= CURRENT_DATE;

-- STEP 3: Deactivate ALL penalties
UPDATE user_penalties
SET 
  is_active = false,
  acknowledged = true,
  acknowledged_at = NOW(),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND is_active = true
RETURNING 
  offense_number,
  penalty_type,
  '✅ PENALTY CLEARED' as result;

-- STEP 4: Update user suspended status
UPDATE users
SET 
  is_suspended = false,
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
RETURNING 
  email,
  is_suspended,
  '✅ USER UNSUSPENDED' as result;

-- STEP 5: Verify final state
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  u.is_suspended,
  up.balance as points,
  COUNT(uct.id) as today_cancellations,
  COUNT(p.id) FILTER (WHERE p.is_active = true) as active_penalties
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id AND uct.cancelled_at >= CURRENT_DATE
LEFT JOIN user_penalties p ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.email, u.is_suspended, up.balance;

-- ============================================
-- RESULT
-- ============================================
-- ✅ Cancellation count cleared (0 today)
-- ✅ All penalties cleared
-- ✅ User unsuspended
-- ✅ Can now make reservations normally
-- ============================================
