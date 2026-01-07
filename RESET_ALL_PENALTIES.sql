-- ============================================
-- RESET ALL PENALTIES FOR USER
-- ============================================
-- Purpose: Clean slate - remove all penalties and reset counts
-- User: davetest@gmail.com
-- Created: 2025-12-26
-- ============================================

-- Step 1: Check current state BEFORE reset
SELECT 
  'BEFORE RESET:' as status,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'davetest@gmail.com';

-- Step 2: Show all current penalties
SELECT 
  'CURRENT PENALTIES:' as status,
  up.id,
  up.offense_number,
  up.penalty_type,
  up.is_active,
  up.acknowledged,
  up.created_at
FROM user_penalties up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
ORDER BY up.created_at DESC;

-- Step 3: Delete ALL penalty records
DELETE FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- Step 4: Reset user's penalty counts and status
UPDATE users
SET 
  penalty_count = 0,
  current_penalty_level = 0,
  is_suspended = false,
  suspended_until = NULL,
  reliability_score = 100,  -- Reset to perfect score
  updated_at = NOW()
WHERE email = 'davetest@gmail.com';

-- Step 5: Verify clean state AFTER reset
SELECT 
  'AFTER RESET:' as status,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'davetest@gmail.com';

-- Step 6: Verify no penalties exist
SELECT 
  'REMAINING PENALTIES:' as status,
  COUNT(*) as penalty_count
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- Step 7: Check if user can now reserve
SELECT 
  'CAN USER RESERVE:' as status,
  *
FROM can_user_reserve(
  (SELECT id FROM users WHERE email = 'davetest@gmail.com')
);

-- ============================================
-- RESULT
-- ============================================
-- All penalties deleted ✅
-- penalty_count = 0 ✅
-- is_suspended = false ✅
-- reliability_score = 100 ✅
-- Ready for fresh testing! 🚀
-- ============================================
