-- Check if the reservation actually expired
SELECT 
  id,
  status,
  expires_at,
  (expires_at < NOW()) as is_past,
  created_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 3;

-- Check if anything is in user_missed_pickups
SELECT * FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Check the function source to see if it's correct
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'expire_user_reservations';
