-- Manually record the 4 cancellations you just made today

-- First, find the 4 most recent cancelled reservations for this user
SELECT 
  id,
  status,
  updated_at
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND status = 'CANCELLED'
ORDER BY updated_at DESC
LIMIT 4;

-- Insert them into tracking table manually (replace IDs from above query)
-- Run this AFTER seeing the reservation IDs above
INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
SELECT 
  customer_id,
  id,
  updated_at
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND status = 'CANCELLED'
  AND (updated_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
ON CONFLICT (reservation_id) DO NOTHING;

-- Verify they were inserted
SELECT COUNT(*) as todays_cancels_after_fix
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- Check cooldown status
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
);
