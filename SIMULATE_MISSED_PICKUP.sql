-- Simulate missed pickup for davetest@gmail.com
-- This will mark the active reservation as expired/missed (no-show)

-- 1. Check current active reservations
SELECT 
  'Current active reservations' as status,
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  r.picked_up_at,
  r.no_show,
  u.email
FROM reservations r
JOIN users u ON u.id = r.customer_id
WHERE u.email = 'davetest@gmail.com'
  AND r.status IN ('ACTIVE', 'PENDING')
ORDER BY r.created_at DESC;

-- 2. Mark the active reservation as expired (missed pickup)
-- Set expires_at to past time and mark as no-show
UPDATE reservations
SET 
  expires_at = NOW() - INTERVAL '1 hour',  -- Set expiration to 1 hour ago
  no_show = TRUE,                           -- Mark as no-show
  status = 'EXPIRED',                       -- Change status to EXPIRED
  updated_at = NOW()
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status IN ('ACTIVE', 'PENDING')
RETURNING 
  id,
  status,
  expires_at,
  no_show,
  'Marked as missed pickup' as result;

-- 3. Verify the reservation was updated
SELECT 
  'After marking as missed' as status,
  r.id,
  r.status,
  r.expires_at,
  r.picked_up_at,
  r.no_show,
  r.penalty_applied,
  r.penalty_id
FROM reservations r
WHERE r.customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 1;

-- 4. Check if any penalties were created (if penalty system is active)
SELECT 
  'Penalty check' as status,
  p.*
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY p.created_at DESC
LIMIT 3;
