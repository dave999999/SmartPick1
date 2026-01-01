-- ============================================
-- FIX: Expired Reservations Showing as Active
-- ============================================
-- PROBLEM: Reservation expired (1 hour passed) but still shows
-- as ACTIVE in my-picks page instead of history
-- ============================================

-- ROOT CAUSE ANALYSIS:
-- 1. Reservation created with expires_at = now + 60 minutes
-- 2. After 1 hour, expires_at < NOW() but status still = 'ACTIVE'
-- 3. MyPicks filters: ACTIVE tab shows status='ACTIVE' only
-- 4. The expire_user_reservations() should change ACTIVE→FAILED_PICKUP
-- 5. But it's either not running OR not working correctly

-- ============================================
-- STEP 1: Diagnose the specific reservation
-- ============================================

-- Check user's current reservations
SELECT 
  '=== CURRENT STATUS ===' as step,
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  NOW() as current_server_time,
  -- Calculate time difference
  CASE 
    WHEN r.expires_at < NOW() THEN 
      '❌ EXPIRED ' || ROUND(EXTRACT(EPOCH FROM (NOW() - r.expires_at)) / 60, 1) || ' minutes ago'
    ELSE 
      '✅ ACTIVE for ' || ROUND(EXTRACT(EPOCH FROM (r.expires_at - NOW())) / 60, 1) || ' more minutes'
  END as expiration_status,
  -- Offer info
  o.title as offer_title,
  o.pickup_start,
  o.pickup_end,
  p.business_name as partner_name
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
LEFT JOIN partners p ON p.id = o.partner_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;

-- ============================================
-- STEP 2: Verify the expire function exists
-- ============================================

SELECT 
  '=== FUNCTION CHECK ===' as step,
  proname as function_name,
  prokind as kind,
  CASE 
    WHEN prosrc LIKE '%FAILED_PICKUP%' THEN '✅ Contains FAILED_PICKUP logic'
    ELSE '❌ Missing FAILED_PICKUP logic'
  END as has_correct_logic
FROM pg_proc
WHERE proname = 'expire_user_reservations';

-- ============================================
-- STEP 3: Manually run the expire function
-- ============================================

SELECT 
  '=== RUNNING EXPIRATION ===' as step,
  expire_user_reservations(
    (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  ) as expired_count;

-- ============================================
-- STEP 4: Verify the fix worked
-- ============================================

SELECT 
  '=== AFTER EXPIRATION ===' as step,
  r.id,
  r.status,
  r.expires_at,
  NOW() as current_time,
  CASE 
    WHEN r.status = 'ACTIVE' AND r.expires_at < NOW() THEN 
      '❌ BUG STILL EXISTS - Status should be FAILED_PICKUP'
    WHEN r.status = 'FAILED_PICKUP' THEN 
      '✅ FIXED - Correctly marked as FAILED_PICKUP'
    WHEN r.status = 'ACTIVE' AND r.expires_at >= NOW() THEN 
      '✅ CORRECT - Still active and not expired'
    ELSE 
      'ℹ️ Status: ' || r.status
  END as status_check,
  o.title as offer_title
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;

-- ============================================
-- SOLUTION OPTIONS
-- ============================================

-- OPTION A: If function doesn't exist or is wrong
-- Run the AUTO_EXPIRE_ON_DEMAND.sql script to create/update it

-- OPTION B: If function exists but isn't being called
-- The issue is in the frontend MyPicks.tsx:
-- Line 149-150 should call expireUserReservations()
-- Before loading reservations

-- OPTION C: Manual fix for this specific user
-- (Use only as temporary fix while investigating)

-- Manually expire ALL old active reservations for this user
-- NOTE: expire_user_reservations() automatically restores quantities,
-- so we don't need a separate restore step
UPDATE reservations
SET 
  status = 'FAILED_PICKUP',
  updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'ACTIVE'
  AND expires_at < NOW()
RETURNING 
  id,
  expires_at,
  NOW() - expires_at as was_expired_for,
  '✅ Status changed to FAILED_PICKUP' as result;

-- ⚠️ DO NOT manually restore quantities - the expire_user_reservations()
-- function already does this automatically when marking as FAILED_PICKUP
-- Running a manual restore will try to add quantities TWICE and violate
-- the valid_quantity constraint (quantity_available <= quantity_total)

-- ============================================
-- PERMANENT FIX
-- ============================================

-- The frontend code (MyPicks.tsx) already tries to call
-- expireUserReservations() on line 150:
--
-- await expireUserReservations(userIdToUse);
--
-- This should automatically expire old reservations
-- BEFORE loading them.
--
-- If this isn't working, possible causes:
-- 1. Function doesn't exist in database
-- 2. Function has wrong logic
-- 3. Race condition - function runs but UI loads cached data
-- 4. Permission issue - function not accessible to authenticated role
--
-- To fix permanently:
-- 1. Verify function exists: see STEP 2 above
-- 2. If missing: run AUTO_EXPIRE_ON_DEMAND.sql
-- 3. Grant permissions:

GRANT EXECUTE ON FUNCTION expire_user_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations TO anon;

-- 4. Test by refreshing my-picks page
--    The loadReservations() function should auto-expire first

-- ============================================
-- VERIFICATION
-- ============================================

-- After applying fix, user should see:
-- ✅ My Picks > Active tab: Empty (no expired reservations)
-- ✅ My Picks > History tab: Shows expired reservations as FAILED_PICKUP
-- ✅ Timer shows "Expired" for old reservations before they disappear
-- ✅ New reservations expire correctly after 1 hour

-- ============================================
