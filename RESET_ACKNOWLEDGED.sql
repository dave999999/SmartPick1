-- Force re-check by setting acknowledged to false
UPDATE user_penalties
SET 
  acknowledged = false,
  suspended_until = NOW() + INTERVAL '1 hour'
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';

SELECT 
  id,
  penalty_type,
  offense_number,
  acknowledged,
  suspended_until,
  '✅ Ready - refresh browser now!' as status
FROM user_penalties
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';
