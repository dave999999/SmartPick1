-- Check if trigger is actually recording cancellations

-- 1. How many cancels are recorded today?
SELECT COUNT(*) as recorded_cancels
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 2. How many CANCELLED reservations exist today?
SELECT COUNT(*) as actual_cancels_today
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'CANCELLED'
  AND (updated_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Manually insert the missing ones
INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
SELECT 
  customer_id,
  id,
  updated_at
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'CANCELLED'
  AND (updated_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
ON CONFLICT (reservation_id) DO NOTHING;

-- 4. Verify they're now recorded
SELECT COUNT(*) as after_backfill
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
