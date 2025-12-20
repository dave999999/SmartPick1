-- Find ALL versions of create_reservation_atomic function
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as full_definition,
  n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_reservation_atomic'
ORDER BY n.nspname, p.proname;
