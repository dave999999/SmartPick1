-- Fix: Set suspension to FUTURE time (1 hour from now)
UPDATE user_penalties
SET 
  penalty_type = '1hour',
  suspended_until = NOW() + INTERVAL '1 hour',  -- This will be Dec 26 + 1 hour
  acknowledged = false
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';

-- Verify - suspended_until should be in the future
SELECT 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  NOW() as current_time,
  CASE 
    WHEN suspended_until > NOW() THEN '✅ ACTIVE - In future'
    WHEN suspended_until < NOW() THEN '❌ EXPIRED - In past'
  END as status,
  acknowledged
FROM user_penalties
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';
