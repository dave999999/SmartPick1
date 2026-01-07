-- Debug: Check your current cancellation status
-- First, get your user ID:
SELECT auth.uid();

-- Or find your user by email:
SELECT id, email FROM auth.users WHERE email LIKE '%YOUR_EMAIL%';

-- Then replace USER_ID_HERE in queries below with your actual UUID

-- 1. Check cancellation count for today
SELECT 
  user_id,
  cancelled_at,
  reservation_id,
  (cancelled_at AT TIME ZONE 'Asia/Tbilisi') as georgia_time
FROM user_cancellation_tracking
WHERE user_id = 'USER_ID_HERE'
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi'
ORDER BY cancelled_at DESC;

-- 2. Check cooldown status
SELECT * FROM is_user_in_cooldown('USER_ID_HERE');

-- 3. Get cancellation warning info
SELECT * FROM get_user_daily_cancellation_count('USER_ID_HERE');
