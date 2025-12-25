-- TEST: Give batumashvili.davit@gmail.com 1st missed pickup (WARNING ONLY)
-- This will mark your ACTIVE reservation as FAILED_PICKUP and apply first warning

-- 1. Check current status
SELECT 
  u.email,
  u.penalty_count,
  u.current_penalty_level,
  u.total_missed_pickups,
  u.is_suspended,
  u.suspended_until,
  u.status
FROM users u
WHERE u.email = 'batumashvili.davit@gmail.com';

-- 2. Check for any ACTIVE reservations
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  o.title as offer_title,
  p.business_name as partner_name
FROM reservations r
JOIN offers o ON o.id = r.offer_id
JOIN partners p ON p.id = r.partner_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;

-- 3. Mark your ACTIVE reservation as FAILED_PICKUP (simulate expired/missed pickup)
WITH selected_reservation AS (
  SELECT r.id, r.partner_id, r.offer_id
  FROM reservations r
  WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND r.status = 'ACTIVE'
  ORDER BY r.created_at DESC
  LIMIT 1
)
UPDATE reservations r
SET 
  status = 'FAILED_PICKUP',
  updated_at = NOW()
FROM selected_reservation sr
WHERE r.id = sr.id
RETURNING r.id, r.status, r.partner_id, r.created_at;

-- 4. Set penalty_count to 1 (first warning)
UPDATE users
SET 
  penalty_count = 1,
  current_penalty_level = 1,
  total_missed_pickups = 1,
  is_suspended = false,  -- NO suspension for first warning!
  suspended_until = NULL,
  updated_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
RETURNING email, penalty_count, current_penalty_level, is_suspended;

-- 5. Create warning penalty record using the reservation we just changed
WITH latest_failed AS (
  SELECT r.id, r.partner_id
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
  lf.id,               -- reservation_id
  lf.partner_id,       -- partner_id
  1,                   -- offense_number
  'missed_pickup',     -- offense_type
  'warning',           -- penalty_type (WARNING ONLY!)
  NULL,                -- suspended_until (NO SUSPENSION)
  true,                -- is_active
  false,               -- can_lift_with_points (not needed for warning)
  0,                   -- points_required (FREE WARNING)
  false,               -- acknowledged
  NOW()
FROM latest_failed lf
RETURNING id, offense_number, penalty_type, suspended_until;

-- 6. Verify final status
SELECT 
  '=== FINAL STATUS ===' as section,
  u.email,
  u.penalty_count as penalties,
  u.current_penalty_level as level,
  u.is_suspended as suspended,
  u.suspended_until,
  CASE 
    WHEN u.penalty_count = 1 THEN '⚠️ WARNING 1/3 - Stay careful! 💛'
    WHEN u.penalty_count = 2 THEN '⚠️ WARNING 2/3 - Be more careful! 🧡'
    WHEN u.penalty_count = 3 THEN '🔴 WARNING 3/3 - LAST CHANCE!'
    WHEN u.penalty_count = 4 THEN '🚫 1-HOUR SUSPENSION'
    WHEN u.penalty_count = 5 THEN '🚫 24-HOUR SUSPENSION'
    WHEN u.penalty_count >= 6 THEN '⛔ PERMANENT BAN'
    ELSE '✅ CLEAN'
  END as status_message
FROM users u
WHERE u.email = 'batumashvili.davit@gmail.com';

-- 7. Check recent FAILED_PICKUP reservations
SELECT 
  '=== FAILED PICKUPS ===' as section,
  COUNT(*) as failed_pickup_count,
  MAX(r.updated_at) as last_failed_pickup
FROM reservations r
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'FAILED_PICKUP';

-- 8. Check active penalties
SELECT 
  '=== ACTIVE PENALTIES ===' as section,
  up.offense_number,
  up.penalty_type,
  up.suspended_until,
  up.is_active,
  up.acknowledged,
  up.created_at
FROM user_penalties up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND up.is_active = true
ORDER BY up.created_at DESC;

-- EXPECTED RESULTS:
-- ✅ penalty_count = 1
-- ✅ current_penalty_level = 1
-- ✅ is_suspended = FALSE (no suspension for first warning!)
-- ✅ penalty_type = 'warning'
-- ✅ Status message: "⚠️ WARNING 1/3 - Stay careful! 💛"
-- ✅ User CAN still make reservations!
