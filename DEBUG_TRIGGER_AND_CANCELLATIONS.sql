-- Check if trigger is enabled
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_track_cancellation';

-- Check your recent reservations and their status
SELECT 
  id,
  customer_id,
  status,
  created_at,
  updated_at
FROM reservations
WHERE customer_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
ORDER BY updated_at DESC
LIMIT 5;

-- Check if any new cancellations were recorded today
SELECT 
  id,
  user_id,
  reservation_id,
  cancelled_at,
  created_at
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE
ORDER BY cancelled_at DESC;
