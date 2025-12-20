-- Find triggers on reservations table
SELECT 
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'reservations'
AND t.tgname NOT LIKE 'pg_%';
