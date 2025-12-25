-- Set suspension to FUTURE (today + 1 hour)
UPDATE user_penalties
SET 
  suspended_until = NOW() + INTERVAL '1 hour',
  acknowledged = false
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';

-- Verify
SELECT 
  id,
  suspended_until,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (suspended_until - NOW())) as seconds_remaining,
  '✅ Should be positive!' as note
FROM user_penalties
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';
