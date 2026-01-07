-- =========================================================
-- EXPIRE DAVETEST RESERVATION (AUTO)
-- =========================================================
-- Calls expire_user_reservations() to mark as FAILED_PICKUP
-- =========================================================

-- First, set expires_at to past
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Now call the function to expire it
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Verify it's now FAILED_PICKUP
SELECT 
  id,
  status,
  expires_at,
  (expires_at < NOW()) as is_expired,
  created_at
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 1;
