-- Check if this user has any cancellation records
SELECT 
  user_id,
  reservation_id,
  cancelled_at,
  reset_cooldown_used,
  cooldown_duration_minutes,
  created_at
FROM user_cancellation_tracking 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
ORDER BY cancelled_at DESC
LIMIT 10;
