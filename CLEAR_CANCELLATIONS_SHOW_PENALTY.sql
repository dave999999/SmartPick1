-- Clear cancellations to see the missed pickup penalty modal

-- Delete today's cancellations
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- Delete cooldown lifts
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- Verify cancellations cleared
SELECT 
  '✓ CANCELLATIONS CLEARED' as status,
  COUNT(*) as remaining_cancellations
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- Confirm penalty is still active
SELECT 
  '✓ PENALTY STILL ACTIVE' as status,
  offense_number,
  penalty_type,
  suspended_until
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;
