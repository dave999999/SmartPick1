-- Check current reservations for davetest
SELECT 
  r.id,
  r.status,
  r.partner_id,
  r.created_at,
  r.updated_at
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;

-- Check missed pickups
SELECT 
  COUNT(*) as total_missed,
  MAX(created_at) as latest_miss
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Check penalties
SELECT 
  id,
  offense_number,
  penalty_type,
  is_active,
  acknowledged,
  suspended_until,
  points_required,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 3;
