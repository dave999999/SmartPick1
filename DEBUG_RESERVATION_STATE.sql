-- Check what's actually in the database
SELECT 
  'ACTIVE RESERVATIONS' as status,
  id,
  status,
  partner_id,
  created_at,
  updated_at
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'active'
ORDER BY created_at DESC;

-- Check all recent reservations
SELECT 
  'ALL RECENT RESERVATIONS' as status,
  id,
  status,
  partner_id,
  created_at
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- Check missed pickups
SELECT 
  'MISSED PICKUPS' as status,
  reservation_id,
  partner_id,
  created_at
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;
