-- Check for triggers on reservations table that might be blocking updates
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'reservations'
ORDER BY trigger_name;

-- Also check if there are any check constraints
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'reservations';
