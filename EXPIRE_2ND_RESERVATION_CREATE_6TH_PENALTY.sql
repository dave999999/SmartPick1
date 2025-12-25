-- ============================================
-- EXPIRE 2ND ACTIVE RESERVATION + CREATE 6TH PENALTY
-- ============================================
-- Simulate 6th missed pickup (24-hour suspension)
-- ============================================

-- STEP 1: Show your current active reservation
SELECT 
  '=== YOUR ACTIVE RESERVATION ===' as step,
  id,
  qr_code,
  status,
  quantity,
  total_price,
  expires_at,
  partner_id
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 1;

-- STEP 2: Change status to EXPIRED
UPDATE reservations
SET 
  status = 'EXPIRED',
  expires_at = NOW() - INTERVAL '1 hour',
  updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'ACTIVE'
RETURNING 
  id,
  qr_code,
  status,
  expires_at,
  '✅ CHANGED TO EXPIRED' as result;

-- STEP 3: Deactivate old penalty (5th offense)
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

-- STEP 4: Create 6th penalty linked to the EXPIRED reservation
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
  r.partner_id,
  6,  -- 6th offense
  '24hour',  -- 24-hour suspension
  NOW() + INTERVAL '24 hours',
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
  '🚨 6TH PENALTY CREATED - 24 HOUR SUSPENSION (Admin Review Required)!' as result;

-- STEP 5: Verify final state
SELECT 
  '=== FINAL STATE ===' as step,
  u.email,
  up.balance as points,
  p.offense_number,
  p.penalty_type,
  p.suspended_until,
  p.is_active,
  EXTRACT(EPOCH FROM (p.suspended_until - NOW())) / 3600 as hours_remaining,
  '1000 points needed to lift (Admin review also required)' as lift_cost
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = true
WHERE u.email = 'batumashvili.davit@gmail.com';
