-- ============================================
-- TEST: FIRST MISSED PICKUP (CLEAN START)
-- ============================================
-- Purpose: Mark current ACTIVE reservation as FAILED_PICKUP
--          Apply 1st warning (no suspension)
-- User: batumashvili.davit@gmail.com
-- Created: 2025-12-26
-- ============================================

-- Step 1: Find the current ACTIVE reservation
SELECT 
  'CURRENT ACTIVE RESERVATION:' as status,
  r.id,
  r.customer_id,
  r.partner_id,
  r.offer_id,
  r.status,
  r.quantity,
  r.created_at,
  r.expires_at,
  u.email,
  u.penalty_count as current_penalty_count
FROM reservations r
JOIN users u ON r.customer_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 1;

-- Step 2: Mark the ACTIVE reservation as FAILED_PICKUP
UPDATE reservations
SET 
  status = 'FAILED_PICKUP',
  updated_at = NOW()
WHERE id = (
  SELECT r.id
  FROM reservations r
  WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND r.status = 'ACTIVE'
  ORDER BY r.created_at DESC
  LIMIT 1
);

-- Step 3: Update user's penalty_count to 1 (1st warning)
UPDATE users
SET 
  penalty_count = 1,
  current_penalty_level = 1,
  is_suspended = false,  -- NO suspension (warning only)
  suspended_until = NULL,
  reliability_score = GREATEST(0, reliability_score - 5),
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com';

-- Step 4: Create the 1st penalty record (WARNING, not suspension)
WITH latest_failed AS (
  SELECT r.id as reservation_id, r.partner_id
  FROM reservations r
  WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND r.status = 'FAILED_PICKUP'
  ORDER BY r.updated_at DESC
  LIMIT 1
)
INSERT INTO user_penalties (
  user_id,
  reservation_id,
  partner_id,
  offense_number,
  offense_type,
  penalty_type,
  suspended_until,
  is_active,
  can_lift_with_points,
  points_required,
  acknowledged,
  created_at
)
SELECT 
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  lf.reservation_id,
  lf.partner_id,
  1,  -- 1st offense
  'missed_pickup',
  'warning',  -- Warning (no suspension)
  NULL,  -- No suspension time
  true,  -- Active
  false,  -- Cannot lift with points (it's just a warning)
  0,  -- No points required
  false,  -- Not acknowledged yet (popup will show)
  NOW()
FROM latest_failed lf;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check updated user status
SELECT 
  'USER STATUS:' as status,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Check the reservation was marked as FAILED_PICKUP
SELECT 
  'FAILED RESERVATION:' as status,
  r.id,
  r.status,
  r.updated_at
FROM reservations r
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'FAILED_PICKUP'
ORDER BY r.updated_at DESC
LIMIT 1;

-- Check the new penalty record
SELECT 
  'NEW PENALTY RECORD:' as status,
  up.id,
  up.offense_number,
  up.penalty_type,
  up.is_active,
  up.acknowledged,
  up.suspended_until,
  up.created_at
FROM user_penalties up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY up.created_at DESC
LIMIT 1;

-- Test what frontend will see
SELECT 
  'FRONTEND WILL SEE:' as status,
  *
FROM get_active_penalty(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- Popup message: "3 chances left — plenty of room! ✨"
-- Header: "No stress — these things happen 😊"
-- Hearts: [USED] [ACTIVE] [ACTIVE]
-- No suspension - user can continue making reservations ✅
-- Next offense will be 2nd warning
-- ============================================
