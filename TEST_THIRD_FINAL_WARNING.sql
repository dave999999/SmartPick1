-- ============================================
-- TEST 3RD WARNING - FINAL WARNING BEFORE SUSPENSION
-- ============================================
-- User: batumashvili.davit@gmail.com
-- Current state: 2 warnings, 1 active reservation
-- Action: Mark reservation as FAILED_PICKUP and apply 3rd (FINAL) warning
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

-- Step 2: Update user penalty count (2 → 3)
UPDATE users
SET 
  penalty_count = 3,
  reliability_score = GREATEST(0, reliability_score - 10),
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
RETURNING id as user_id, penalty_count, reliability_score;

-- Step 3: Insert 3rd warning penalty (FINAL WARNING!)
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
  3,  -- 3rd offense - FINAL WARNING!
  'missed_pickup',
  'warning',  -- Still a warning, but this is the LAST one!
  NULL,  -- No suspension yet
  true,  -- Active
  false,  -- Not acknowledged yet
  false,  -- Can't lift warnings with points
  NOW()
FROM user_data u
CROSS JOIN reservation_data r
RETURNING 
  id,
  offense_number,
  penalty_type,
  '⚠️ 3RD (FINAL) WARNING APPLIED!' as status;

-- Step 4: Verify final state
SELECT 
  '⚠️ FINAL STATE:' as info,
  u.email,
  u.penalty_count,
  u.reliability_score,
  u.is_suspended,
  COUNT(CASE WHEN up.is_active THEN 1 END) as active_penalties,
  STRING_AGG(DISTINCT up.penalty_type::text, ', ') as penalty_types,
  '⚠️ NEXT OFFENSE = 1-HOUR SUSPENSION!' as warning
FROM users u
LEFT JOIN user_penalties up ON up.user_id = u.id AND up.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.id, u.email, u.penalty_count, u.reliability_score, u.is_suspended;

-- ============================================
-- RESULT
-- ============================================
-- ⚠️ 3rd (FINAL) WARNING applied! ⚠️
-- Refresh app to see the FINAL WARNING popup with extended explanation 🔔
-- Next missed pickup = 1-HOUR SUSPENSION! 🚨
-- ============================================
