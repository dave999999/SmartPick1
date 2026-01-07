-- Check if davetest has any active reservations
SELECT 
  id,
  status,
  expires_at,
  created_at,
  (expires_at > NOW()) as still_valid
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Check all recent reservations
SELECT 
  id,
  status,
  expires_at,
  created_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 5;
