-- Check current penalty status for your user
SELECT 
  id,
  user_id,
  penalty_type,
  offense_number,
  is_active,
  is_suspended,
  suspended_until,
  acknowledged,
  created_at,
  CASE 
    WHEN suspended_until IS NULL AND penalty_type IN ('1hour', '5hour', '24hour', 'permanent') THEN 'Permanent ban'
    WHEN suspended_until > NOW() THEN 'ACTIVE suspension - expires in ' || EXTRACT(EPOCH FROM (suspended_until - NOW()))/60 || ' minutes'
    WHEN suspended_until <= NOW() THEN '⚠️ EXPIRED suspension (should auto-lift)'
    ELSE 'Warning only'
  END as status_details
FROM user_penalties
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;
