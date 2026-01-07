-- =========================================================
-- EXPIRE ACTIVE RESERVATION FOR DAVETEST
-- =========================================================
-- Makes active reservation expired to test missed pickup logic
-- =========================================================

-- Check current active reservations
SELECT 
  id,
  status,
  expires_at,
  created_at
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Set expires_at to past (makes it expired)
UPDATE reservations
SET 
  expires_at = NOW() - INTERVAL '1 hour'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Verify update
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
