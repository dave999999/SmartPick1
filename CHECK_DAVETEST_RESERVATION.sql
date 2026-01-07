-- Check which column has davetest's reservations
SELECT 
  id,
  status,
  expires_at,
  user_id,
  customer_id,
  (expires_at < NOW()) as is_expired,
  created_at
FROM reservations
WHERE (user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
   OR customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com'))
  AND status = 'ACTIVE'
ORDER BY created_at DESC;
