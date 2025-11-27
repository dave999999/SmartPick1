-- Check active penalties
SELECT 
  id, 
  user_id, 
  penalty_type, 
  offense_number, 
  is_active, 
  acknowledged,
  suspended_until,
  created_at,
  updated_at
FROM user_penalties 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 10;

-- Check offense history
SELECT 
  user_id,
  offense_count,
  last_offense_date
FROM penalty_offense_history
LIMIT 10;
