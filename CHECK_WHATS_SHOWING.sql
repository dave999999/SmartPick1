-- Check what's triggering for davetest@gmail.com

-- 1. Check missed pickup penalties
SELECT 
  '1. MISSED PICKUP PENALTIES' as check_type,
  p.offense_number,
  p.penalty_type,
  p.acknowledged,
  p.is_active,
  p.created_at
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY p.created_at DESC;

-- 2. Check cancellation count today
SELECT 
  '2. CANCELLATIONS TODAY' as check_type,
  COUNT(*) as count,
  MAX(cancelled_at) as latest_cancellation
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Check cooldown status
SELECT 
  '3. COOLDOWN STATUS' as check_type,
  *
FROM is_user_in_cooldown(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 4. Check active penalty
SELECT 
  '4. ACTIVE PENALTY' as check_type,
  *
FROM get_active_penalty(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
