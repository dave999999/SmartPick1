-- ============================================
-- CLEAR ALL PENALTIES FOR USER
-- ============================================
-- Remove all active penalties and reset suspension status
-- ============================================

-- STEP 1: Show current penalties
SELECT 
  '=== CURRENT PENALTIES ===' as step,
  id,
  offense_number,
  penalty_type,
  suspended_until,
  is_active,
  can_lift_with_points,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;

-- STEP 2: Deactivate ALL penalties
UPDATE user_penalties
SET 
  is_active = false,
  acknowledged = true,
  acknowledged_at = NOW(),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND is_active = true
RETURNING 
  id,
  offense_number,
  penalty_type,
  '✅ PENALTY CLEARED' as result;

-- STEP 3: Update user suspended status
UPDATE users
SET 
  is_suspended = false,
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
RETURNING 
  email,
  is_suspended,
  '✅ USER UNSUSPENDED' as result;

-- STEP 4: Verify final state
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  u.is_suspended,
  up.balance as points,
  COUNT(p.id) FILTER (WHERE p.is_active = true) as active_penalties,
  COUNT(p.id) as total_penalties
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.email, u.is_suspended, up.balance;

-- ============================================
-- RESULT
-- ============================================
-- ✅ All penalties cleared
-- ✅ User unsuspended
-- ✅ Can now make reservations normally
-- ============================================
