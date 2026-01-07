-- =========================================================
-- CHECK TOTAL MISSED PICKUPS FOR DAVETEST
-- =========================================================

-- Count in user_missed_pickups table
SELECT 
  'MISSED PICKUPS TABLE' as source,
  COUNT(*) as total_count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Count by reservation status (FAILED_PICKUP)
SELECT 
  'RESERVATIONS (FAILED_PICKUP)' as source,
  COUNT(*) as total_count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- Show all failed pickups with dates
SELECT 
  'DETAILED LIST' as type,
  r.id,
  r.status,
  r.created_at as reserved_at,
  r.expires_at as should_pickup_by,
  r.updated_at as marked_failed_at,
  (NOW() - r.expires_at) as how_long_ago
FROM reservations r
WHERE r.customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND r.status IN ('FAILED_PICKUP', 'EXPIRED')
ORDER BY r.created_at DESC;

-- Check penalty status
SELECT 
  'CURRENT PENALTIES' as type,
  id,
  offense_number,
  penalty_type,
  is_active,
  points_required,
  suspended_until,
  acknowledged
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 3;
