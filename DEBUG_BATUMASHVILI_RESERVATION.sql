-- ============================================
-- DEBUG: Check Batumashvili's Reservation Status
-- ============================================
-- This query checks why an expired reservation might show as active
-- ============================================

-- STEP 1: Get user ID
SELECT 
  '=== USER INFO ===' as step,
  id as user_id,
  email,
  is_suspended
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- STEP 2: Check ALL reservations for this user
SELECT 
  '=== ALL RESERVATIONS ===' as step,
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  -- Check if expired based on expires_at
  CASE 
    WHEN r.expires_at < NOW() THEN '❌ EXPIRED (expires_at in past)'
    WHEN r.expires_at >= NOW() THEN '✅ NOT EXPIRED (expires_at in future)'
    ELSE '⚠️ NO expires_at'
  END as expiration_check,
  -- Time calculations
  EXTRACT(EPOCH FROM (NOW() - r.expires_at)) / 60 as minutes_since_expiry,
  EXTRACT(EPOCH FROM (r.expires_at - NOW())) / 60 as minutes_until_expiry,
  -- Offer details
  o.title as offer_title,
  o.pickup_start as offer_pickup_start,
  o.pickup_end as offer_pickup_end,
  p.business_name as partner_name
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
LEFT JOIN partners p ON p.id = o.partner_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;

-- STEP 3: Check specifically for ACTIVE reservations
SELECT 
  '=== ACTIVE RESERVATIONS (FILTERED) ===' as step,
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  NOW() as current_time,
  r.expires_at - NOW() as time_until_expiry,
  CASE 
    WHEN r.expires_at < NOW() THEN '❌ SHOULD BE EXPIRED'
    ELSE '✅ VALID'
  END as should_be_expired,
  o.title as offer_title
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE';

-- STEP 4: Test the expire_user_reservations function
-- This should mark expired ACTIVE reservations as FAILED_PICKUP
SELECT 
  '=== RUNNING EXPIRE FUNCTION ===' as step,
  expire_user_reservations((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')) as expired_count;

-- STEP 5: Check reservations AFTER running expire function
SELECT 
  '=== AFTER EXPIRE FUNCTION ===' as step,
  r.id,
  r.status,
  r.expires_at,
  NOW() as current_time,
  CASE 
    WHEN r.status = 'ACTIVE' AND r.expires_at < NOW() THEN '❌ BUG: Still ACTIVE but expired'
    WHEN r.status = 'FAILED_PICKUP' THEN '✅ Correctly marked as FAILED_PICKUP'
    WHEN r.status = 'ACTIVE' AND r.expires_at >= NOW() THEN '✅ Correctly ACTIVE (not expired)'
    ELSE r.status
  END as status_check,
  o.title as offer_title
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- If a reservation has:
-- - status = 'ACTIVE'
-- - expires_at < NOW()
-- - pickup_window_duration_minutes = 60 (1 hour)
-- 
-- It should have been changed to 'FAILED_PICKUP' by expire_user_reservations()
--
-- POSSIBLE CAUSES:
-- 1. expire_user_reservations() is not being called
-- 2. The function has a bug and isn't updating the status
-- 3. The expires_at timestamp is incorrectly calculated
-- 4. There's a timezone issue
-- ============================================
