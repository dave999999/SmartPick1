-- Check if the cancellation tracking trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%cancellation%' OR trigger_name LIKE '%cancel%';

-- Also check for any triggers on reservations table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'reservations';
