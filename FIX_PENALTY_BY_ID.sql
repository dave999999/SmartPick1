-- Fix the specific penalty by ID
UPDATE user_penalties
SET 
  penalty_type = '1hour',
  suspended_until = NOW() + INTERVAL '1 hour',
  acknowledged = false
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';

-- Verify
SELECT 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  acknowledged
FROM user_penalties
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';
