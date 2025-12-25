-- Find the function that creates penalties when reservations expire
SELECT 
  p.proname as function_name,
  SUBSTRING(pg_get_functiondef(p.oid), 1, 500) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%expired%'
ORDER BY p.proname;
