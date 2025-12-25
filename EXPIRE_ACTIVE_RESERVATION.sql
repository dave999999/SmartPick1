-- ============================================
-- EXPIRE ACTIVE RESERVATION & MARK AS NO_SHOW
-- ============================================
-- Quick script to expire your current active reservation
-- ============================================

-- STEP 1: Show current active reservation
SELECT 
  '=== YOUR ACTIVE RESERVATION ===' as step,
  r.id,
  r.qr_code,
  r.status,
  r.quantity,
  r.total_price,
  r.created_at,
  r.expires_at,
  o.title as offer_name,
  p.business_name as partner_name
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
LEFT JOIN partners p ON p.id = r.partner_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 1;

-- STEP 2: Make it expired (set expires_at to 2 hours ago)
UPDATE reservations
SET 
  expires_at = NOW() - INTERVAL '2 hours',
  updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'ACTIVE'
RETURNING 
  id,
  qr_code,
  expires_at,
  '✅ RESERVATION EXPIRED!' as result;

-- STEP 3: Mark as NO_SHOW (missed pickup)
UPDATE reservations
SET 
  status = 'NO_SHOW',
  updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'ACTIVE'
AND expires_at < NOW()
RETURNING 
  id,
  qr_code,
  status,
  '❌ MARKED AS NO_SHOW (MISSED PICKUP)' as result;

-- STEP 4: Verify it's now a missed pickup
SELECT 
  '=== VERIFICATION ===' as step,
  r.id,
  r.status,
  r.expires_at,
  o.title,
  CASE 
    WHEN r.status = 'NO_SHOW' THEN '❌ SUCCESSFULLY MARKED AS MISSED'
    ELSE '⚠️ STILL ACTIVE'
  END as pickup_status,
  CASE
    WHEN r.expires_at < NOW() THEN '✅ EXPIRED'
    ELSE '⚠️ NOT YET EXPIRED'
  END as expiration_status
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY r.created_at DESC
LIMIT 1;

-- STEP 5: Count total missed pickups
SELECT 
  '=== TOTAL MISSED PICKUPS ===' as step,
  COUNT(*) as total_no_shows,
  '(This is your offense count)' as note
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
AND status = 'NO_SHOW';
