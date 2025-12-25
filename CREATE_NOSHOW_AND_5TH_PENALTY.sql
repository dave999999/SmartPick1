-- ============================================
-- CREATE NO_SHOW RESERVATION + 5TH PENALTY
-- ============================================
-- Step 1: Create a fake NO_SHOW reservation
-- Step 2: Create 5th penalty linked to it
-- ============================================

-- STEP 1: Check if you have any EXPIRED reservations
SELECT 
  '=== EXPIRED RESERVATIONS ===' as step,
  COUNT(*) as total_expired
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'EXPIRED';

-- STEP 2: Get your most recent reservation (any status)
SELECT 
  '=== MOST RECENT RESERVATION ===' as step,
  id,
  status,
  created_at,
  expires_at
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC
LIMIT 1;

-- STEP 3: Create an EXPIRED reservation (since NO_SHOW is not a valid status)
INSERT INTO reservations (
  offer_id,
  customer_id,
  partner_id,
  qr_code,
  quantity,
  total_price,
  status,
  expires_at,
  points_spent,
  created_at,
  updated_at
)
VALUES (
  (SELECT offer_id FROM reservations WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com') ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'),
  (SELECT partner_id FROM reservations WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com') ORDER BY created_at DESC LIMIT 1),
  'EXPIRED-TEST-' || substring(md5(random()::text) from 1 for 8),
  1,
  5.00,
  'EXPIRED',  -- Use EXPIRED status instead
  NOW() - INTERVAL '2 hours',  -- Expired 2 hours ago
  5,
  NOW() - INTERVAL '3 hours',  -- Created 3 hours ago
  NOW() - INTERVAL '2 hours'
)
RETURNING 
  id,
  qr_code,
  status,
  '✅ EXPIRED RESERVATION CREATED (simulating missed pickup)' as result;

-- STEP 4: Deactivate old penalty
UPDATE user_penalties
SET 
  is_active = false,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND is_active = true
RETURNING 
  offense_number,
  penalty_type,
  '✅ OLD PENALTY DEACTIVATED' as result;

-- STEP 5: Create 5th penalty linked to the EXPIRED reservation
INSERT INTO user_penalties (
  user_id,
  reservation_id,
  partner_id,
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
  r.id,
  r.partner_id,  -- Get partner_id from the reservation
  5,
  '5hour',
  NOW() + INTERVAL '5 hours',
  true,
  true,
  NOW(),
  NOW()
FROM reservations r
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND r.status = 'EXPIRED'
ORDER BY r.created_at DESC
LIMIT 1
RETURNING 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  '🚨 5TH PENALTY CREATED - 5 HOUR SUSPENSION!' as result;

-- STEP 6: Verify
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  up.balance as points,
  p.offense_number,
  p.penalty_type,
  p.suspended_until,
  p.is_active,
  EXTRACT(EPOCH FROM (p.suspended_until - NOW())) / 3600 as hours_remaining
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com';
