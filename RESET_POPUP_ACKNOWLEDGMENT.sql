-- ============================================
-- RESET POPUP ACKNOWLEDGMENT
-- ============================================
-- Purpose: Reset the acknowledged flag so the popup shows again
-- User: batumashvili.davit@gmail.com
-- Created: 2025-12-26
-- ============================================

-- Step 1: Check current state BEFORE reset
SELECT 
  'BEFORE RESET:' as status,
  up.id,
  up.offense_number,
  up.penalty_type,
  up.is_active,
  up.acknowledged,
  up.suspended_until,
  up.created_at,
  u.email,
  u.penalty_count,
  u.is_suspended
FROM user_penalties up
JOIN users u ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
ORDER BY up.created_at DESC
LIMIT 3;

-- Step 2: Reset the acknowledged flag on the most recent ACTIVE penalty
UPDATE user_penalties
SET acknowledged = false
WHERE id = (
  SELECT up.id
  FROM user_penalties up
  WHERE up.user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND up.is_active = true
  ORDER BY up.created_at DESC
  LIMIT 1
);

-- Step 3: Verify the change AFTER reset
SELECT 
  'AFTER RESET:' as status,
  up.id,
  up.offense_number,
  up.penalty_type,
  up.is_active,
  up.acknowledged,
  up.suspended_until,
  up.created_at,
  u.email,
  u.penalty_count,
  u.is_suspended
FROM user_penalties up
JOIN users u ON up.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND up.is_active = true
ORDER BY up.created_at DESC
LIMIT 1;

-- Step 4: Test what the frontend will see (same function App.tsx uses)
SELECT 
  'FRONTEND WILL SEE:' as status,
  *
FROM get_active_penalty(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

