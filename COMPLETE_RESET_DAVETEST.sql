-- =========================================================
-- DEBUG AND FIX: Check davetest lift records
-- =========================================================

-- Check all lift records for davetest
SELECT 
  u.email,
  ucl.lifted_at,
  (ucl.lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE as lift_date_georgia,
  (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE as today_georgia,
  ucl.lift_type,
  ucl.points_spent,
  '🔍 Existing lift record' as status
FROM auth.users u
JOIN user_cooldown_lifts ucl ON ucl.user_id = u.id
WHERE u.email = 'davetest@gmail.com'
ORDER BY ucl.lifted_at DESC;

-- Delete ALL lift records for davetest (complete cleanup)
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Delete ALL cancellation records for davetest (complete cleanup)
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Verify cleanup
SELECT 
  u.email,
  COUNT(uct.id) as total_cancellations,
  COUNT(ucl.id) as total_lifts,
  '✅ Complete Reset' as status
FROM auth.users u
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id
LEFT JOIN user_cooldown_lifts ucl ON ucl.user_id = u.id
WHERE u.email = 'davetest@gmail.com'
GROUP BY u.email;

-- ✅ RESULT: davetest@gmail.com completely clean (not just today, ALL records deleted)
