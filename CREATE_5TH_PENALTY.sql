-- ============================================
-- CREATE 5TH PENALTY DIRECTLY
-- ============================================
-- You already have 4 missed pickups
-- This creates the 5th offense penalty (5-hour suspension)
-- ============================================

-- STEP 1: Check current state
SELECT 
  '=== CURRENT STATE ===' as step,
  u.email,
  up.balance as points,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'NO_SHOW') as total_missed_pickups,
  p.offense_number as current_penalty_offense,
  p.penalty_type as current_penalty_type,
  p.suspended_until,
  p.is_active
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN reservations r ON r.customer_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.email, up.balance, p.offense_number, p.penalty_type, p.suspended_until, p.is_active;

-- STEP 2: Deactivate current penalty (4th offense)
UPDATE user_penalties
SET 
  is_active = false,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND is_active = true
RETURNING 
  offense_number,
  penalty_type,
  suspended_until,
  '✅ OLD PENALTY DEACTIVATED' as result;

-- STEP 3: Create 5th offense penalty (5-hour suspension, 500 points to lift)
-- First, get a recent NO_SHOW reservation to link
WITH recent_no_show AS (
  SELECT id as reservation_id
  FROM reservations
  WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'NO_SHOW'
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO user_penalties (
  user_id,
  reservation_id,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  is_active,
  created_at,
  updated_at
)
SELECT
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  reservation_id,
  5,  -- 5th offense
  '5hour',  -- 5-hour suspension
  NOW() + INTERVAL '5 hours',  -- Suspend for 5 hours from now
  true,  -- Can lift with points (costs 500 points based on offense number)
  true,
  NOW(),
  NOW()
FROM recent_no_show
RETURNING 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  '🚨 5TH PENALTY CREATED - 5 HOUR SUSPENSION (500 points to lift)!' as result;

-- STEP 4: Verify final state
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  up.balance as points,
  p.offense_number,
  p.penalty_type,
  p.suspended_until,
  p.can_lift_with_points,
  CASE 
    WHEN p.offense_number = 4 THEN 100
    WHEN p.offense_number = 5 THEN 500
    WHEN p.offense_number >= 6 THEN 1000
    ELSE 0
  END as points_needed_to_lift,
  p.is_active,
  EXTRACT(EPOCH FROM (p.suspended_until - NOW())) / 3600 as hours_remaining,
  CASE 
    WHEN p.suspended_until > NOW() THEN '🚨 CURRENTLY SUSPENDED'
    WHEN p.suspended_until <= NOW() THEN '✅ SUSPENSION EXPIRED'
    ELSE 'NO ACTIVE SUSPENSION'
  END as suspension_status
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com';

-- STEP 5: Check all penalties history
SELECT 
  '=== PENALTY HISTORY ===' as step,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  CASE 
    WHEN offense_number = 4 THEN 100
    WHEN offense_number = 5 THEN 500
    WHEN offense_number >= 6 THEN 1000
    ELSE 0
  END as points_needed,
  is_active,
  created_at,
  CASE 
    WHEN is_active AND suspended_until > NOW() THEN '🚨 ACTIVE'
    WHEN is_active AND suspended_until <= NOW() THEN '⏰ EXPIRED'
    WHEN NOT is_active THEN '✅ RESOLVED'
    ELSE 'UNKNOWN'
  END as status
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;
