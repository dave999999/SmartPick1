-- ============================================
-- FIX: ENSURE 3RD WARNING DOESN'T BLOCK RESERVATIONS
-- ============================================
-- Purpose: Make sure user is NOT suspended after 3rd warning
-- User: batumashvili.davit@gmail.com
-- Created: 2025-12-26
-- ============================================

-- Check current user status
SELECT 
  'BEFORE FIX:' as status,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Fix: Ensure user is NOT suspended (warnings don't suspend)
UPDATE users
SET 
  is_suspended = false,
  suspended_until = NULL,
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
  AND penalty_count <= 3;  -- Only for warnings (1-3)

-- Check after fix
SELECT 
  'AFTER FIX:' as status,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Verify active penalties
SELECT 
  'ACTIVE PENALTIES:' as status,
  up.offense_number,
  up.penalty_type,
  up.is_active,
  up.acknowledged,
  up.suspended_until,
  u.is_suspended as user_is_suspended
FROM user_penalties up
JOIN users u ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND up.is_active = true
ORDER BY up.created_at DESC;

-- Test if user can now make reservations
SELECT 
  'CAN USER RESERVE:' as status,
  *
FROM can_user_reserve(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- ============================================
-- EXPLANATION
-- ============================================
-- Warnings (offenses 1-3) should NOT suspend the user
-- Only suspensions (offense 4+) should block reservations
-- The fix ensures is_suspended = false for all warnings
-- ============================================
