-- Check if your 4 new cancellations were recorded

SELECT COUNT(*) as current_cancel_count
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- Check if trigger exists
SELECT 
  tgname,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trg_track_cancellation';

-- Check the last 4 cancelled reservations
SELECT 
  id,
  status,
  updated_at,
  (updated_at AT TIME ZONE 'Asia/Tbilisi')::DATE as cancel_date_georgia
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND status = 'CANCELLED'
ORDER BY updated_at DESC
LIMIT 4;
