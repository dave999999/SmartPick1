-- ============================================
-- TEST 4TH OFFENSE - 1-HOUR SUSPENSION! 🚨
-- ============================================
-- User: batumashvili.davit@gmail.com
-- Current state: 3 warnings, 1 active reservation
-- Action: Mark reservation as FAILED_PICKUP and apply 1-HOUR SUSPENSION
-- ============================================

-- Step 1: Find and update the active reservation
WITH active_res AS (
  SELECT r.id, r.offer_id, r.partner_id
  FROM reservations r
  JOIN users u ON r.customer_id = u.id
  WHERE u.email = 'batumashvili.davit@gmail.com'
    AND r.status = 'ACTIVE'
  LIMIT 1
)
UPDATE reservations
SET 
  status = 'FAILED_PICKUP',
  updated_at = NOW()
FROM active_res
WHERE reservations.id = active_res.id
RETURNING reservations.id as reservation_id, reservations.offer_id, reservations.partner_id;

-- Step 2: Update user penalty count (3 → 4) and SET SUSPENDED!
UPDATE users
SET 
  penalty_count = 4,
  is_suspended = true,  -- 🚨 NOW SUSPENDED!
  reliability_score = GREATEST(0, reliability_score - 15),
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
RETURNING id as user_id, penalty_count, is_suspended, reliability_score;

-- Step 3: Insert 1-HOUR SUSPENSION penalty!
WITH user_data AS (
  SELECT id as user_id FROM users WHERE email = 'batumashvili.davit@gmail.com'
),
reservation_data AS (
  SELECT r.id as reservation_id, r.offer_id, r.partner_id
  FROM reservations r
  JOIN users u ON r.customer_id = u.id
  WHERE u.email = 'batumashvili.davit@gmail.com'
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
  acknowledged,
  can_lift_with_points,
  created_at
)
SELECT 
  u.user_id,
  r.reservation_id,
  r.partner_id,
  4,  -- 4th offense - SUSPENSION TIME!
  'missed_pickup',
  '1hour',  -- 🚨 SUSPENSION! Not 'warning' anymore!
  NOW() + INTERVAL '1 hour',  -- Suspended until 1 hour from now
  true,  -- Active
  false,  -- Not acknowledged yet
  true,  -- CAN lift this with points (100 points)
  NOW()
FROM user_data u
CROSS JOIN reservation_data r
RETURNING 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  '🚨 1-HOUR SUSPENSION APPLIED!' as status;

-- Step 4: Verify final state
SELECT 
  '🚨 SUSPENDED STATE:' as info,
  u.email,
  u.penalty_count,
  u.is_suspended,
  u.reliability_score,
  COUNT(CASE WHEN up.is_active THEN 1 END) as active_penalties,
  STRING_AGG(DISTINCT up.penalty_type::text, ', ') as penalty_types,
  MAX(up.suspended_until) as suspended_until,
  '🚨 CANNOT MAKE RESERVATIONS FOR 1 HOUR!' as restriction
FROM users u
LEFT JOIN user_penalties up ON up.user_id = u.id AND up.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.id, u.email, u.penalty_count, u.is_suspended, u.reliability_score;

-- ============================================
-- RESULT
-- ============================================
-- 🚨 1-HOUR SUSPENSION applied! 🚨
-- User is now SUSPENDED and CANNOT make reservations! 🚫
-- Try making a reservation - it should BLOCK with error message ✅
-- Suspension will auto-expire in 1 hour ⏰
-- User can lift suspension with 100 points 💰
-- ============================================
