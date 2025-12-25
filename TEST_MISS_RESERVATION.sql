-- ============================================
-- TEST: Miss Reservation & Trigger 5th Penalty
-- ============================================
-- This script simulates a user missing their reservation
-- and getting their 5th missed pickup (5-hour suspension)
-- ============================================

-- STEP 1: Check current state
SELECT 
  '=== CURRENT USER STATE ===' as step,
  u.email,
  u.name,
  up.balance as points,
  p.offense_number,
  p.penalty_type,
  p.suspended_until,
  p.is_active as penalty_active
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com';

-- STEP 2: Check active reservations
SELECT 
  '=== ACTIVE RESERVATIONS ===' as step,
  r.id,
  r.qr_code,
  r.status,
  r.created_at,
  r.expires_at,
  o.title as offer_title,
  r.quantity,
  r.total_price
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;

-- STEP 3: Expire the most recent active reservation (make it expired)
UPDATE reservations
SET 
  expires_at = NOW() - INTERVAL '1 hour',  -- Make it expired (1 hour ago)
  updated_at = NOW()
WHERE id = (
  SELECT r.id 
  FROM reservations r
  WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE'
  ORDER BY r.created_at DESC
  LIMIT 1
)
RETURNING 
  id,
  qr_code,
  status,
  expires_at,
  '✅ Reservation expired!' as result;

-- STEP 4: Manually mark as NO_SHOW to trigger penalty
-- (Normally this would be done by a cron job or when partner confirms)
UPDATE reservations
SET 
  status = 'NO_SHOW',
  updated_at = NOW()
WHERE id = (
  SELECT r.id 
  FROM reservations r
  WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE'
  AND r.expires_at < NOW()
  ORDER BY r.created_at DESC
  LIMIT 1
)
RETURNING 
  id,
  qr_code,
  status,
  '✅ Marked as NO_SHOW' as result;

-- STEP 5: Check if there's a function to auto-create penalty, or create it manually
-- Count total missed pickups
SELECT 
  '=== MISSED PICKUP COUNT ===' as step,
  COUNT(*) as total_no_shows
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'NO_SHOW';

-- STEP 6: Deactivate old penalty (4th offense)
UPDATE user_penalties
SET 
  is_active = false,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND is_active = true
RETURNING 
  offense_number,
  penalty_type,
  '✅ Old penalty deactivated' as result;

-- STEP 7: Create 5th offense penalty (5-hour suspension, 500 points to lift)
INSERT INTO user_penalties (
  user_id,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  points_to_lift,
  is_active,
  created_at
)
VALUES (
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  5,  -- 5th offense
  '5hour',  -- 5-hour suspension
  NOW() + INTERVAL '5 hours',  -- Suspend for 5 hours
  true,  -- Can lift with points
  500,  -- 500 points to lift
  true,
  NOW()
)
RETURNING 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  points_to_lift,
  '✅ 5th PENALTY CREATED - 5 HOUR SUSPENSION!' as result;

-- STEP 8: Verify final state
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  up.balance as points,
  p.offense_number,
  p.penalty_type,
  p.suspended_until,
  p.can_lift_with_points,
  p.points_to_lift,
  p.is_active,
  CASE 
    WHEN p.suspended_until > NOW() THEN 'CURRENTLY SUSPENDED ⏰'
    WHEN p.suspended_until <= NOW() THEN 'SUSPENSION EXPIRED ✅'
    ELSE 'NO ACTIVE SUSPENSION'
  END as suspension_status
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com';

-- STEP 9: Check recent reservations
SELECT 
  '=== RECENT RESERVATIONS ===' as step,
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  o.title,
  CASE 
    WHEN r.status = 'NO_SHOW' THEN '❌ MISSED'
    WHEN r.status = 'PICKED_UP' THEN '✅ PICKED UP'
    WHEN r.status = 'ACTIVE' THEN '⏳ ACTIVE'
    ELSE r.status
  END as pickup_status
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;
