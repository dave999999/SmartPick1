-- Check why SuspensionModal isn't showing

SELECT
  p.offense_number,
  p.penalty_type,
  p.acknowledged,  -- If TRUE, modal won't show
  p.is_active,
  p.suspended_until AT TIME ZONE 'Asia/Tbilisi' as suspended_until_local,
  NOW() AT TIME ZONE 'Asia/Tbilisi' as current_time_local,
  (p.suspended_until > NOW()) as suspension_still_active,
  CASE
    WHEN p.acknowledged = TRUE THEN '❌ Already acknowledged - Modal won''t show again'
    WHEN p.suspended_until < NOW() THEN '❌ Suspension expired - Modal won''t show'
    WHEN NOT p.is_active THEN '❌ Penalty not active'
    WHEN p.penalty_type NOT IN ('1hour', '5hour', '24hour', 'permanent') THEN '❌ Wrong penalty type for suspension'
    ELSE '✅ Should show SuspensionModal on app reload'
  END as diagnosis
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND p.is_active = TRUE
ORDER BY p.created_at DESC
LIMIT 1;
