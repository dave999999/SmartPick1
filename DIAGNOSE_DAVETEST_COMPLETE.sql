-- =========================================================
-- COMPLETE DIAGNOSTIC FOR DAVETEST
-- =========================================================

-- 1. Get user ID
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'davetest@gmail.com';

-- 2. Check ALL lift records (with timezone conversion)
SELECT 
  id,
  user_id,
  lifted_at,
  (lifted_at AT TIME ZONE 'Asia/Tbilisi') as lifted_at_georgia,
  (lifted_at AT TIME ZONE 'Asia/Tbilisi')::date as lift_date_georgia,
  CURRENT_DATE as current_date_utc,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tbilisi')::date as current_date_georgia
FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY lifted_at DESC;

-- 3. Check ALL cancellation records
SELECT 
  id,
  created_at,
  (created_at AT TIME ZONE 'Asia/Tbilisi') as created_at_georgia,
  (created_at AT TIME ZONE 'Asia/Tbilisi')::date as cancel_date_georgia
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- 4. Check if user is in cooldown RIGHT NOW
SELECT is_user_in_cooldown((SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as currently_in_cooldown;

-- 5. Check rate limits
SELECT *
FROM rate_limits
WHERE identifier = (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- 6. Check user points balance
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'davetest@gmail.com';
