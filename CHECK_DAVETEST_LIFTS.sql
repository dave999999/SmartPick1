-- Check if lift records still exist for davetest
SELECT 
  ucl.*,
  (ucl.lifted_at AT TIME ZONE 'Asia/Tbilisi')::date as lift_date_tbilisi
FROM user_cooldown_lifts ucl
JOIN auth.users u ON u.id = ucl.user_id
WHERE u.email = 'davetest@gmail.com'
ORDER BY ucl.lifted_at DESC;

-- Check cancellation count
SELECT 
  COUNT(*) as total_cancellations,
  COUNT(CASE WHEN (created_at AT TIME ZONE 'Asia/Tbilisi')::date = CURRENT_DATE THEN 1 END) as today_cancellations
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
