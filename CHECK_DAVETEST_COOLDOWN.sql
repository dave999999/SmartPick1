-- Check davetest@gmail.com cooldown status

-- Get user ID
SELECT id, email, name FROM users WHERE email = 'davetest@gmail.com';

-- Check cancellation tracking (today only)
SELECT 
  COUNT(*) as total_cancellations_today,
  MIN(canceled_at AT TIME ZONE 'Asia/Tbilisi') as first_cancel,
  MAX(canceled_at AT TIME ZONE 'Asia/Tbilisi') as last_cancel
FROM reservation_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
  AND canceled_at AT TIME ZONE 'Asia/Tbilisi' >= CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi';

-- Check detailed cancellation records
SELECT 
  canceled_at AT TIME ZONE 'Asia/Tbilisi' as canceled_at_tbilisi,
  reservation_id,
  reason
FROM reservation_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
  AND canceled_at AT TIME ZONE 'Asia/Tbilisi' >= CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi'
ORDER BY canceled_at DESC;

-- Check if user is in cooldown
SELECT 
  user_id,
  cancellation_count,
  cooldown_until AT TIME ZONE 'Asia/Tbilisi' as cooldown_until_tbilisi,
  CASE 
    WHEN cooldown_until > NOW() THEN 'IN COOLDOWN'
    ELSE 'NOT IN COOLDOWN'
  END as status,
  EXTRACT(EPOCH FROM (cooldown_until - NOW())) / 60 as minutes_remaining
FROM reservation_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
  AND canceled_at AT TIME ZONE 'Asia/Tbilisi' >= CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi'
ORDER BY canceled_at DESC
LIMIT 5;

-- Check cooldown lifts
SELECT 
  lifted_at AT TIME ZONE 'Asia/Tbilisi' as lifted_at,
  points_spent,
  previous_reset_count
FROM cooldown_lifts
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com')
  AND lifted_at AT TIME ZONE 'Asia/Tbilisi' >= CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi'
ORDER BY lifted_at DESC;
